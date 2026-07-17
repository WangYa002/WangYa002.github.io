---
title: epoll + Reactor：共享单车智能锁后端实战
date: 2026-06-05
tags:
  - C++
  - 网络编程
  - 项目经历
  - Linux
description: 共享单车智能锁位置上报服务 — epoll ET 模式 + 单 Reactor 多线程模型 + Protobuf RPC + 分级锁策略，4C8G 压测支撑 1w+ 并发长连接 3w+ QPS
category: 网络编程
---

# epoll + Reactor：共享单车智能锁后端实战

> 这是研究生期间独立完成的网络编程基础项目。本文把整个后端的关键技术点、设计选型、压测数据讲透，作为后续 ai_aas 实习中 VPP/FrameWork 等高性能场景的基础铺垫。

## 一、项目背景

### 1.1 业务场景

共享单车每车 1 把智能锁，每锁每 5 秒上报一次位置和状态：

- **位置上报**：GPS 坐标 + 电量 + 锁状态（开/关/故障）
- **扫码开锁**：用户扫码后服务端下发开锁指令
- **还车结算**：关锁后计算费用并扣款
- **异常告警**：电量低 / 非法移动 / 长时间未还车

### 1.2 量级估算

| 维度 | 数字 |
| --- | --- |
| 单城市车辆数 | ~10 万 |
| 上报周期 | 5 秒/次 |
| 单城市 QPS | 10w / 5 = **2 万 QPS/城市** |
| 单消息大小 | < 256B（紧凑二进制编码） |
| 单机需要支撑 | 1w+ 长连接（分城市部署） |

### 1.3 技术选型

| 选项 | 选择 | 理由 |
| --- | --- | --- |
| **I/O 多路复用** | `epoll` | Linux 高并发首选，O(1) 就绪通知 |
| **触发模式** | ET 边沿触发 | 减少 epoll_wait 返回次数 |
| **并发模型** | 单 Reactor 多线程 | 主线程 accept，工作线程处理业务 |
| **序列化** | Protobuf | 二进制紧凑 + 强类型 schema |
| **帧格式** | 定长包头 + 变长消息体 | 解决 TCP 粘包/拆包 |
| **锁策略** | 分级（自旋 + 互斥 + CV） | 按临界区特征选最小开销 |

## 二、epoll ET 模式：为什么选 ET

### 2.1 ET vs LT

| 模式 | 触发时机 | 优势 | 劣势 |
| --- | --- | --- | --- |
| **LT（水平触发，默认）** | 只要 fd 有数据可读，每次 epoll_wait 都返回 | 编程简单，可以部分读取 | 高频返回，开销大 |
| **ET（边沿触发）** | 仅在状态变化时通知一次（如从无数据到有数据） | 减少返回次数，性能高 | 必须配合非阻塞 I/O + 循环读到 EAGAIN，否则丢数据 |

### 2.2 ET 模式正确用法

```cpp
void handle_read(int fd) {
    while (true) {
        char buf[4096];
        ssize_t n = read(fd, buf, sizeof(buf));
        
        if (n > 0) {
            // 处理数据
            buffer.append(buf, n);
        } else if (n == 0) {
            // 对端关闭
            close_connection(fd);
            break;
        } else {
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                // 数据读完了（ET 必须 loop 到 EAGAIN）
                break;
            } else if (errno == EINTR) {
                // 被信号中断，继续
                continue;
            } else {
                // 真实错误
                close_connection(fd);
                break;
            }
        }
    }
}
```

### 2.3 为什么 ET 必须用非阻塞 I/O

如果用阻塞 I/O + ET：

1. epoll_wait 返回 fd 可读
2. 第一次 `read` 读 4KB 数据
3. 第二次 `read` 阻塞（缓冲区暂时空了，但 socket 没关闭）
4. 整个线程被卡死

非阻塞 I/O 下，缓冲区空时 `read` 立即返回 `EAGAIN`，可以安全 break 循环。

### 2.4 fd 设置非阻塞

```cpp
int set_nonblocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0) return -1;
    return fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

int conn_fd = accept(listen_fd, ...);
set_nonblocking(conn_fd);

epoll_event ev;
ev.events = EPOLLIN | EPOLLET;  // ET 模式
ev.data.fd = conn_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, conn_fd, &ev);
```

## 三、单 Reactor 多线程模型

### 3.1 模型架构

```plain
                    ┌──────────────────┐
                    │   Main Reactor   │
                    │   (主线程)       │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
       epoll_wait        accept new fd    dispatch events
            │
            ▼
    ┌──────────────────┐
    │   事件分发器     │
    └────────┬─────────┘
             │
             │  把就绪 fd 推到任务队列
             │
             ▼
    ┌────────────────────────────────────────┐
    │           任务队列（带锁）             │
    └────────────────┬───────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │ Worker1 │  │ Worker2 │  │ Worker3 │  ... (4 工作线程)
   │ 业务处理│  │ 业务处理│  │ 业务处理│
   └─────────┘  └─────────┘  └─────────┘
```

### 3.2 主线程核心循环

```cpp
void reactor_main_loop() {
    while (running) {
        epoll_event events[1024];
        int n = epoll_wait(epfd, events, 1024, -1);  // 阻塞等待
        if (n < 0) {
            if (errno == EINTR) continue;
            break;
        }
        
        for (int i = 0; i < n; ++i) {
            int fd = events[i].data.fd;
            
            if (fd == listen_fd) {
                // 新连接：accept 并加入 epoll
                handle_accept();
            } else {
                // 已有连接的可读/可写事件
                // 推到任务队列，由工作线程处理
                task_queue_.push({fd, events[i].events});
            }
        }
    }
}

void handle_accept() {
    while (true) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        int conn_fd = accept(listen_fd, (struct sockaddr*)&client_addr, &addr_len);
        
        if (conn_fd < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                break;  // 所有等待连接都已 accept（ET 模式必须 loop）
            } else {
                perror("accept");
                break;
            }
        }
        
        set_nonblocking(conn_fd);
        
        epoll_event ev;
        ev.events = EPOLLIN | EPOLLET;
        ev.data.fd = conn_fd;
        epoll_ctl(epfd, EPOLL_CTL_ADD, conn_fd, &ev);
        
        connections_[conn_fd] = std::make_shared<Connection>(conn_fd);
    }
}
```

### 3.3 工作线程

```cpp
void worker_thread_main() {
    while (running) {
        Task task;
        task_queue_.pop(task);  // 阻塞等待任务
        
        auto& conn = connections_[task.fd];
        if (!conn) continue;
        
        if (task.events & EPOLLIN) {
            handle_read(conn);
        }
        if (task.events & EPOLLOUT) {
            handle_write(conn);
        }
    }
}
```

### 3.4 单 Reactor 多线程的瓶颈

主线程成为瓶颈点：

- 主线程既要 accept，又要 epoll_wait，还要分发任务
- 高并发下（> 5w QPS），单线程处理不过来

**解决方案**（本项目未实现，ai_aas 实习中用到）：

- **主从 Reactor**：主 Reactor 只 accept，从 Reactor 处理读写
- **SO_REUSEPORT 多进程 accept**：多个进程同时 accept 同一端口，内核层负载均衡

## 四、TCP 粘包/拆包

### 4.1 问题

TCP 是字节流，没有"消息边界"。如果发送方连续 send 两条消息：

```plain
send("HELLO")
send("WORLD")
```

接收方可能收到：

- `"HELLOWORLD"`（粘包：两条消息粘在一起）
- `"HELL"` + `"OWORLD"`（拆包：一条消息被拆开）

### 4.2 解决方案：定长包头 + 变长消息体

```plain
┌──────────────────────────────────────┐
│  包头（固定 12 字节）                │
├────────┬─────────┬──────────────────┤
│ Magic  │ Length  │ Message Type     │
│ 4 byte │ 4 byte  │ 4 byte           │
├────────┴─────────┴──────────────────┤
│  消息体（变长，Length 字节）         │
│  Protobuf 编码                       │
└──────────────────────────────────────┘
```

### 4.3 接收端拆包逻辑

```cpp
void handle_read(ConnectionPtr conn) {
    // 读数据到 buffer（ET 模式 loop 到 EAGAIN）
    conn->read_buffer.append_from_fd(conn->fd);
    
    while (true) {
        if (conn->read_buffer.size() < sizeof(Header)) {
            break;  // 不够一个包头，等下次
        }
        
        Header header;
        memcpy(&header, conn->read_buffer.data(), sizeof(Header));
        
        // 校验 magic
        if (header.magic != kMagic) {
            close_connection(conn);
            return;
        }
        
        uint32_t total_len = sizeof(Header) + header.length;
        if (conn->read_buffer.size() < total_len) {
            break;  // 不够一个完整包，等下次
        }
        
        // 提取完整消息
        std::string message(
            conn->read_buffer.data() + sizeof(Header),
            header.length
        );
        conn->read_buffer.consume(total_len);
        
        // 分发到业务处理
        dispatch_message(conn, header.msg_type, std::move(message));
    }
}
```

## 五、Protobuf 序列化 + varint + zigzag

### 5.1 为什么选 Protobuf

| 维度 | Protobuf | JSON | 自定义二进制 |
| --- | --- | --- | --- |
| 编码体积 | 紧凑（varint + zigzag） | 大（字符串 + 标点） | 紧凑 |
| 解析速度 | 快（指针遍历） | 慢（字符串解析） | 快 |
| 类型安全 | 强类型 schema | 弱类型 | 易错 |
| 可读性 | 不可读 | 可读 | 不可读 |
| Schema 演进 | 支持（兼容字段） | 不支持 | 手动维护 |

共享单车上报场景下报文 < 256B，**空口带宽宝贵**，Protobuf 比 JSON 节省 60-70% 体积。

### 5.2 varint 编码

Protobuf 把整数按 7 位一组编码，每组的最高位标记是否还有后续字节：

```plain
150 的 varint 编码过程：
150 = 0b10010110（二进制）
     = 0b0000001 0b0010110（按 7 位分组，低位在前）
编码：0x96 0x01（最高位标记 + 7 位数据）

15 → 0x0F（1 字节）
150 → 0x96 0x01（2 字节）
1500000 → 0xC0 0xB2 0x5B（3 字节）
```

**优势**：小整数（< 128）只需 1 字节，节省空间。

### 5.3 zigzag 编码

负数的补码高位全是 1，varint 编码后必然是 5 字节（int32）或 10 字节（int64）。zigzag 把负数映射到正数：

```plain
原始值    zigzag
 0   →    0
-1   →    1
 1   →    2
-2   →    3
 2   →    4
...

公式：(n << 1) ^ (n >> 31)  // int32
     (n << 1) ^ (n >> 63)  // int64
```

经 zigzag 后的小整数（正负交替）varint 编码只需 1-2 字节。

### 5.4 Protobuf 调用示例

```proto
// bike.proto
syntax = "proto3";

message LocationReport {
    string bike_id = 1;
    double latitude = 2;
    double longitude = 3;
    int32 battery = 4;
    LockStatus status = 5;
    int64 timestamp = 6;
}

enum LockStatus {
    UNKNOWN = 0;
    LOCKED = 1;
    UNLOCKED = 2;
    FAULT = 3;
}
```

```cpp
// 序列化
LocationReport report;
report.set_bike_id("BJ000123");
report.set_latitude(39.9042);
report.set_longitude(116.4074);
report.set_battery(85);
report.set_status(LockStatus::LOCKED);
report.set_timestamp(std::time(nullptr));

std::string output;
report.SerializeToString(&output);  // 输出 ~50 字节

// 反序列化
LocationReport parsed;
parsed.ParseFromArray(output.data(), output.size());
```

## 六、分级锁策略

### 6.1 按临界区特征选锁

| 临界区 | 持有时间 | 阻塞预期 | 选型 |
| --- | --- | --- | --- |
| **响应事件队列**（工作线程 → 主线程的写事件） | < 1μs（纯内存） | 无 | **自旋锁** |
| **任务队列**（主线程 → 工作线程） | 不确定 | 可能阻塞 | **互斥锁 + condition_variable** |
| **连接表**（添加/删除连接） | < 1μs | 无 | 读写锁（`shared_mutex`） |

### 6.2 自旋锁实现

```cpp
class SpinLock {
public:
    void lock() {
        while (flag_.test_and_set(std::memory_order_acquire)) {
            // 自旋等待（CPU 忙等）
            // 优化：可以加 _mm_pause() 降低功耗
            __builtin_ia32_pause();
        }
    }
    
    void unlock() {
        flag_.clear(std::memory_order_release);
    }
    
private:
    std::atomic_flag flag_ = ATOMIC_FLAG_INIT;
};
```

### 6.3 自旋锁 vs 互斥锁

| 维度 | 自旋锁 | 互斥锁 |
| --- | --- | --- |
| 等待方式 | CPU 忙等（不切换） | 线程挂起（futex 系统调用） |
| 适用场景 | 临界区 < 1μs | 临界区长 / 可能阻塞 |
| CPU 占用 | 等待时占满一个核 | 等待时不占 CPU |
| 切换开销 | 零 | ~1-10μs |

**经验法则**：临界区 < 1μs（几十 cycle）用自旋锁，否则用互斥锁。

### 6.4 任务队列用互斥锁 + CV

```cpp
class TaskQueue {
public:
    void push(Task task) {
        {
            std::lock_guard<std::mutex> lk(mtx_);
            queue_.push(std::move(task));
        }
        cv_.notify_one();
    }
    
    bool pop(Task& out, std::chrono::milliseconds timeout = std::chrono::milliseconds::max()) {
        std::unique_lock<std::mutex> lk(mtx_);
        cv_.wait_for(lk, timeout, [this]{ return !queue_.empty() || shutdown_; });
        
        if (queue_.empty()) return false;
        
        out = std::move(queue_.front());
        queue_.pop();
        return true;
    }
    
    void shutdown() {
        {
            std::lock_guard<std::mutex> lk(mtx_);
            shutdown_ = true;
        }
        cv_.notify_all();
    }
    
private:
    std::mutex mtx_;
    std::condition_variable cv_;
    std::queue<Task> queue_;
    bool shutdown_ = false;
};
```

**为什么任务队列不能用自旋锁**：

- 任务队列可能为空，工作线程要等待任务到来
- 自旋锁是"忙等"，工作线程会占满 CPU
- 必须用 CV：`cv.wait()` 让线程挂起，主线程 push 后 `cv.notify_one()` 唤醒

## 七、心跳机制与对象池

### 7.1 客户端心跳

```cpp
// 客户端每 30 秒发一次心跳
void client_send_heartbeat() {
    while (running) {
        send_heartbeat_packet();
        std::this_thread::sleep_for(std::chrono::seconds(30));
    }
}

// 服务端：每 60 秒扫一次连接表，踢掉 90 秒未活跃的连接
void server_sweep_idle_connections() {
    while (running) {
        std::this_thread::sleep_for(std::chrono::seconds(60));
        
        auto now = std::time(nullptr);
        std::vector<int> to_close;
        
        for (auto& [fd, conn] : connections_) {
            if (now - conn->last_active_time > 90) {
                to_close.push_back(fd);
            }
        }
        
        for (int fd : to_close) {
            close_connection(fd);  // epoll_ctl DEL + close fd
        }
    }
}
```

**为什么 30s 周期 + 3 次超时判定**：

- 30s 周期：业务上报周期 5s，30s 是 6 倍冗余
- 90s 超时（3 次心跳未到）：容忍网络抖动 / 临时丢包
- 太短：误判正常连接为僵尸，频繁踢线
- 太长：僵尸连接占用 epoll 注册项，浪费资源

### 7.2 对象池

```cpp
template<typename T>
class ObjectPool {
public:
    std::shared_ptr<T> acquire() {
        std::lock_guard<std::mutex> lk(mtx_);
        if (pool_.empty()) {
            // 池空，新建
            return std::shared_ptr<T>(new T(), [this](T* p){
                std::lock_guard<std::mutex> lk(mtx_);
                pool_.push(p);
            });
        }
        // 复用
        T* obj = pool_.top();
        pool_.pop();
        return std::shared_ptr<T>(obj, [this](T* p){
            std::lock_guard<std::mutex> lk(mtx_);
            pool_.push(p);
        });
    }
    
private:
    std::mutex mtx_;
    std::stack<T*> pool_;
};

// 使用
ObjectPool<ConnectionContext> ctx_pool;
ObjectPool<MessageBuffer> buf_pool;

void handle_message(int fd) {
    auto ctx = ctx_pool.acquire();
    auto buf = buf_pool.acquire();
    
    // 业务处理（用复用的对象，不 malloc）
    process(*ctx, *buf);
    
    // shared_ptr 析构时自动归还到池
}
```

**收益**：

- 减少 `malloc/free` 调用（系统调用开销 ~1μs）
- 减少内存碎片（频繁分配/释放小块导致）
- 提升内存访问局部性（池中的对象在连续内存区域）

## 八、SO_REUSEPORT 与 TCP_NODELAY

### 8.1 SO_REUSEPORT

允许同一端口被多个 socket 同时 bind：

```cpp
int opt = 1;
setsockopt(listen_fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));
```

**用途**：

- 多进程同时 accept 同一端口（内核层负载均衡）
- 重启服务时旧 socket 仍在 listen，新 socket 可立即 bind

### 8.2 TCP_NODELAY

禁用 Nagle 算法：

```cpp
int opt = 1;
setsockopt(conn_fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));
```

**Nagle 算法的副作用**：

- 为了减少小包数量，会把小数据缓冲合并成大包发送
- 共享单车场景：每次上报 < 256B，如果缓冲到 1KB 才发，延迟会显著增加
- 禁用 Nagle 后立即发送，降低小消息延迟

## 九、压测数据

### 9.1 测试环境

| 项目 | 配置 |
| --- | --- |
| 服务器 | 4 核 CPU / 8GB 内存 / Linux CentOS 7 |
| 客户端 | 同机（loopback）或局域网邻近机器 |
| 压测工具 | 自研压测客户端（多线程模拟智能锁） |
| 测试场景 | 1w 长连接 + 每连接每 5s 上报 1 次 |

### 9.2 性能数据

| 指标 | 数字 |
| --- | --- |
| 并发长连接 | **10,000+** |
| 业务消息吞吐 | **30,000+ QPS** |
| P50 延迟 | 1.2 ms |
| P99 延迟 | 8.5 ms |
| CPU 占用 | ~75%（4 核平均） |
| 内存占用 | ~600 MB |

### 9.3 对比 select / poll

| 方案 | 1w 并发 QPS | 5w 并发 QPS |
| --- | --- | --- |
| select | 8k（fd 上限 1024） | N/A |
| poll | 15k | 12k |
| **epoll（LT）** | **30k** | 28k |
| **epoll（ET）** | **32k** | 31k |

epoll 优势随并发数提升而扩大。

## 十、与 ai_aas 实习的呼应

| 共享单车项目（基础） | ai_aas 实习（进阶） |
| --- | --- |
| epoll + ET 模式 | VPP 数据面 + 共享内存零拷贝 |
| 单 Reactor 多线程 | FrameWork + Node/Action 流水线 |
| 自定义线程池 + 锁分级 | 无锁队列（CAS + acquire/release） |
| Protobuf RPC + 粘包处理 | string_view + yyjson 零拷贝 |
| 对象池复用 | thread_local 1MB 缓冲区 + boost::pool |
| 1w 并发长连接、3w QPS | 单节点 3 万 PPS、集群数十万 PPS |

**简历叙事线**：

> 先通过共享单车项目**系统训练了网络编程基础**（epoll/Reactor/锁策略），然后在 ai_aas 实习中**将这些基础应用到企业级高性能场景**（无锁/零拷贝/CRTP）。

## 十一、面试追问链

### L1：为什么选 ET 而不是 LT？

> ET 边沿触发只在状态变化时通知一次，减少 epoll_wait 返回次数；要求必须配合非阻塞 I/O + 循环读到 EAGAIN，否则会丢数据。LT 简单但开销大。

### L2：单 Reactor 多线程的瓶颈在哪？

> 主线程 accept 成为瓶颈。解决：主从 Reactor 或 SO_REUSEPORT 多线程 accept；工作线程间任务分发需要锁，解决：每线程独立任务队列 + work stealing。

### L3：自旋锁什么时候比互斥锁好？

> 临界区非常短（< 1μs 或几十 cycles）时自旋锁更好 — 避免线程切换开销。临界区长或会阻塞（如 I/O）必须用互斥锁。

### L4：TCP 粘包怎么解决？

> 应用层加帧格式：定长包头（含 magic + length）+ 变长消息体；接收端按 length 拆包。还有特殊分隔符（HTTP 的 \r\n）、定长消息。

### L5：Protobuf 对比 JSON 的优势？

> 二进制编码体积小（varint + zigzag）、解析快（不需要字符串解析）、强类型 schema；缺点：不可读、需要 .proto 文件。

### L6：为什么不用 brpc / muduo？

> 练手项目目的就是**自己实现一遍**Reactor + epoll + 线程池，理解原理；ai_aas 实习中用企业级框架（FrameWork）能感受到工业级和练手级的差异。

## 十二、延伸阅读

- [ai_aas 项目介绍](/posts/aas-1)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)
- [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)

---

> 网络编程的核心不是会用 epoll，而是**理解 epoll 的设计哲学：让内核帮你管 fd 状态，用户态只处理真正活跃的事件**。
