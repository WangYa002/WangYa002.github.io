---
title: 网络编程与无锁队列
date: 2026-07-18
tags:
  - 网络编程
  - C++
  - 八股文
description: TCP/Socket API/epoll/LT ET/select vs poll vs epoll/CAS 无锁队列/环形缓冲区
category: 八股文
---

# 网络编程与无锁队列

> 网络编程是 C++ 后端的"必修课"。本文从 TCP 协议 → Socket API → IO 多路复用 → 无锁编程，覆盖面试高频考点。

---

## 一、TCP/IP 四层模型

### 1.1 模型总览

```text
┌─────────────────────────────────┐
│  应用层  HTTP/FTP/SMTP/SSH/DNS  │  处理应用细节
├─────────────────────────────────┤
│  传输层  TCP/UDP                │  端到端通信
├─────────────────────────────────┤
│  网络层  IP/ICMP                │  路由和分组
├─────────────────────────────────┤
│  链路层  以太网/WiFi            │  物理传输
└─────────────────────────────────┘
```

### 1.2 数据封装

```text
应用层数据
   ↓ 加 TCP 头（源端口、目的端口、序列号等）
TCP 报文段
   ↓ 加 IP 头（源 IP、目的 IP、TTL 等）
IP 数据报
   ↓ 加帧头帧尾
以太网帧
   ↓ 物理层传输
```

### 1.3 TCP vs UDP

| 维度 | TCP | UDP |
| --- | --- | --- |
| 连接 | 面向连接（3 次握手） | 无连接 |
| 可靠性 | 可靠（重传、确认、流控） | 不可靠 |
| 顺序 | 有序 | 无序 |
| 速度 | 慢 | 快 |
| 头部 | 20 字节 | 8 字节 |
| 流量控制/拥塞控制 | 有 | 无 |
| 应用 | HTTP、SSH、SMTP | DNS、视频流、游戏 |

---

## 二、TCP 可靠性机制

### 2.1 数据分块与序列号

```text
应用层：     "Hello World!"
              ↓
TCP 分段：   seq=0  "Hello"
             seq=5  " World"
             seq=11 "!"
```

- **序列号 (seq)**：标识该报文段第一个字节的位置
- **确认号 (ack)**：期望收到的下一个字节的 seq
- 累积确认：ack=10 表示 "前 10 个字节已收到"

### 2.2 超时重传与快速重传

```text
发送方                  接收方
  │  seq=0 ──────────→  │
  │  seq=5 ──────────→  │
  │  seq=10 ─✗（丢失）  │
  │  seq=15 ──────────→  │
  │  ←─────ack=10      │  期望收到 seq=10
  │  seq=15 ──────────→  │
  │  ←─────ack=10      │  再次期望 seq=10
  │                     │
  │  ★ 收到 3 个重复 ack → 快速重传 seq=10
  │  seq=10 ──────────→  │
  │  ←─────ack=20      │
```

**RTO（Retransmission Timeout）**：
- 动态计算：基于 RTT（往返时间）的加权平均
- 过短：频繁误重传
- 过长：丢包恢复慢

### 2.3 流量控制（Sliding Window）

接收方通过 ACK 报文中的 `Window` 字段告知发送方"我还能接收多少字节"。

```text
发送窗口 = min(拥塞窗口, 接收窗口)

发送方：                          接收方：
[已确认][已发送未确认][可发未发][不可发]    [缓冲区]
                              ↑
                          window=可用大小

接收方缓冲区满 → window=0 → 发送方暂停
```

### 2.4 拥塞控制

```text
                  慢启动        拥塞避免
                  (指数增长)    (线性增长)
窗口大小             │           ╱
    │                │         ╱
    │                │       ╱
    │               ╱      ╱
    │             ╱      ╱
    │           ╱      ╱  ← 丢包/超时，窗口减半
    │         ╱      ╱       进入快恢复
    │       ╱      ╱
    │     ╱      ╱
    │   ╱      ╱
    │ ╱      ╱
    └──────────────────────── 时间
              ↑
           ssthresh (慢启动阈值)
```

四个阶段：
1. **慢启动**：cwnd 从 1 开始，每收到 ACK ×2（指数增长）
2. **拥塞避免**：达到 ssthresh 后，每 RTT cwnd+1（线性增长）
3. **快重传**：3 个重复 ACK 立即重传（不等超时）
4. **快恢复**：cwnd 减半，ssthresh = cwnd，进入拥塞避免

### 2.5 三次握手

```text
客户端                       服务端
  │                            │
  │ ── SYN (seq=x) ──────────→ │  服务端确认客户端发送能力
  │                            │
  │ ←── SYN+ACK (seq=y,ack=x+1)│  客户端确认服务端收发能力
  │                            │
  │ ── ACK (ack=y+1) ────────→ │  服务端确认客户端接收能力
  │                            │
  │ ←──── 数据双向传输 ──────→ │
```

**为什么是三次**：
- 两次：服务端无法确认客户端的接收能力，可能收到旧 SYN 创建无效连接
- 四次：完全可以拆成三次（SYN+ACK 合并）

**SYN 攻击**：
- 攻击者伪造大量 SYN，服务端分配资源等待 ACK，导致队列爆满
- 防御：SYN Cookies、调大 `tcp_max_syn_backlog`

### 2.6 四次挥手

```text
客户端                       服务端
  │                            │
  │ ── FIN (seq=x) ──────────→ │  客户端：我没数据了
  │                            │
  │ ←── ACK (ack=x+1) ──────── │  服务端：好的，我可能还有数据
  │                            │
  │     [服务端处理剩余数据]    │
  │                            │
  │ ←── FIN (seq=y) ──────────│  服务端：我也没了
  │                            │
  │ ── ACK (ack=y+1) ────────→ │  客户端：再见
  │                            │
  │ [TIME_WAIT 2MSL]           │
  │                            │
```

**TIME_WAIT 的作用**：
1. 确保最后的 ACK 能到达服务端（丢失则服务端重发 FIN）
2. 让旧连接的报文消失，避免被新连接误收

**为什么 TIME_WAIT 是 2MSL**：
- MSL（Maximum Segment Lifetime）= 报文最大生存时间
- 2MSL = 一个来回（ACK 丢失 + 服务端重发 FIN）

---

## 三、Socket API 详解

### 3.1 服务器端流程

```cpp
// 1. 创建 socket
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);

// 2. 绑定地址
struct sockaddr_in server_addr;
memset(&server_addr, 0, sizeof(server_addr));
server_addr.sin_family = AF_INET;
server_addr.sin_addr.s_addr = htonl(INADDR_ANY);   // 任意网卡
server_addr.sin_port = htons(8080);                // 大端字节序
bind(listen_fd, (struct sockaddr*)&server_addr, sizeof(server_addr));

// 3. 监听
listen(listen_fd, 128);   // backlog = 完整队列长度

// 4. 接受连接
struct sockaddr_in client_addr;
socklen_t len = sizeof(client_addr);
int client_fd = accept(listen_fd, (struct sockaddr*)&client_addr, &len);

// 5. 收发数据
char buf[1024];
ssize_t n = read(client_fd, buf, sizeof(buf));
write(client_fd, buf, n);

// 6. 关闭
close(client_fd);
close(listen_fd);
```

### 3.2 字节序转换

```cpp
// 主机字节序 → 网络字节序（大端）
uint32_t htonl(uint32_t hostlong);    // IP
uint16_t htons(uint16_t hostshort);   // port

// 网络字节序 → 主机字节序
uint32_t ntohl(uint32_t netlong);
uint16_t ntohs(uint16_t netshort);
```

**大端序 vs 小端序**：

```text
数值 0x01020304
大端（网络字节序）：01 02 03 04  ← 高字节在前
小端（x86 主机）：  04 03 02 01  ← 低字节在前
```

### 3.3 listen backlog

```text
                  listen(128)
                       │
   ┌───────────────────┴───────────────────┐
   │                                       │
未完成队列（SYN_RCVD）              完成队列（ESTABLISHED）
   SYN 已到，未收到 ACK              三次握手完成，等待 accept
   ─────────────────                  ─────────────────
   client1 (SYN_RCVD)                 client2 (ESTABLISHED)
   client3 (SYN_RCVD)                 client4 (ESTABLISHED)

   backlog 同时作用于两个队列的长度总和（Linux 实现）
```

### 3.4 accept 与并发模型

```cpp
// ❌ 单连接串行处理
while (true) {
    int client_fd = accept(listen_fd, ...);
    handle(client_fd);   // 处理完才能 accept 下一个
    close(client_fd);
}

// ✅ 多进程
while (true) {
    int client_fd = accept(listen_fd, ...);
    if (fork() == 0) {
        close(listen_fd);
        handle(client_fd);
        exit(0);
    }
    close(client_fd);
}

// ✅ 多线程
while (true) {
    int client_fd = accept(listen_fd, ...);
    std::thread(handle, client_fd).detach();
}

// ✅ epoll（高性能首选）
// 见第四节
```

---

## 四、I/O 多路复用：select / poll / epoll

### 4.1 select 的限制

```cpp
fd_set readfds;
FD_ZERO(&readfds);
FD_SET(fd1, &readfds);
FD_SET(fd2, &readfds);

struct timeval tv = {5, 0};   // 5 秒超时
int n = select(maxfd + 1, &readfds, nullptr, nullptr, &tv);

// 检查哪些 fd 就绪
if (FD_ISSET(fd1, &readfds)) {
    char buf[1024];
    read(fd1, buf, sizeof(buf));
}
```

**缺点**：
1. **1024 fd 上限**（FD_SETSIZE 宏）
2. **每次调用都要拷贝 fd 集合到内核**
3. **返回后要遍历所有 fd 检查是否就绪**（O(n)）
4. **每次都要重新设置 readfds**（内核会修改）

### 4.2 poll 改进

```cpp
struct pollfd fds[2];
fds[0].fd = fd1;
fds[0].events = POLLIN;
fds[1].fd = fd2;
fds[1].events = POLLIN;

int n = poll(fds, 2, 5000);   // 5 秒超时
```

**改进**：
- 用数组代替 bitmap，**无 1024 上限**
- 用 `revents` 字段，不需要每次重新设置

**仍未解决**：
- 还是 O(n) 遍历
- 还是每次拷贝到内核

### 4.3 epoll 核心 API

```cpp
// 1. 创建 epoll 实例
int epfd = epoll_create1(0);

// 2. 注册关心的 fd
struct epoll_event ev;
ev.events = EPOLLIN | EPOLLET;   // 可读 + 边沿触发
ev.data.fd = client_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, client_fd, &ev);

// 3. 等待事件
struct epoll_event events[128];
int n = epoll_wait(epfd, events, 128, -1);   // -1 永久阻塞

// 4. 处理就绪事件
for (int i = 0; i < n; ++i) {
    int fd = events[i].data.fd;
    if (events[i].events & EPOLLIN) {
        char buf[1024];
        ssize_t len = read(fd, buf, sizeof(buf));
    }
}
```

### 4.4 epoll 优势

| 维度 | select/poll | epoll |
| --- | --- | --- |
| 连接数 | 1024 / 无上限 | 无上限 |
| fd 传递 | 每次全量传 | 注册时传一次 |
| 就绪检查 | 遍历所有 O(n) | 只返回就绪 O(1) |
| 数据结构 | bitmap/数组 | 红黑树 + 就绪链表 |
| 适合场景 | 连接少 | 大量连接（C10K） |

### 4.5 epoll 底层原理

```text
epoll_create:
  创建一个 eventpoll 对象
  维护两个数据结构：
    - 红黑树（注册的 fd）
    - 就绪链表（已就绪的 fd）

epoll_ctl:
  在红黑树中插入/修改/删除节点
  注册回调函数（与网卡驱动关联）

epoll_wait:
  检查就绪链表，有就返回；否则阻塞
  
网卡收到数据 → 中断 → 内核回调 → 把 fd 加入就绪链表
```

### 4.6 LT vs ET

| 模式 | 触发条件 | 行为 |
| --- | --- | --- |
| **LT（水平触发）** | 缓冲区有数据就一直触发 | 不读完下次还会通知 |
| **ET（边沿触发）** | 缓冲区从无到有才触发 | 只通知一次，必须读完 |

```cpp
// LT 模式：可以读一点停一下
char buf[1024];
int n = read(fd, buf, sizeof(buf));   // 读一次就走

// ET 模式：必须循环读到 EAGAIN
char buf[1024];
while (true) {
    int n = read(fd, buf, sizeof(buf));
    if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) break;
    if (n <= 0) break;
    process(buf, n);
}
```

**ET 必须配合非阻塞 fd**：
- ET 模式只通知一次
- 如果读阻塞了，下次永远没机会再读
- 必须设为非阻塞，循环读到 `EAGAIN` 才知道真的读完了

```cpp
// 设置非阻塞
int flags = fcntl(fd, F_GETFL, 0);
fcntl(fd, F_SETFL, flags | O_NONBLOCK);
```

### 4.7 epoll 完整 Reactor 模式

```cpp
class Reactor {
    int epfd_;
    std::unordered_map<int, Handler> handlers_;
    
public:
    Reactor() {
        epfd_ = epoll_create1(EPOLL_CLOEXEC);
    }
    
    void add(int fd, uint32_t events, Handler h) {
        struct epoll_event ev;
        ev.events = events | EPOLLET;   // ET 模式
        ev.data.fd = fd;
        epoll_ctl(epfd_, EPOLL_CTL_ADD, fd, &ev);
        handlers_[fd] = std::move(h);
        
        // 设为非阻塞
        int flags = fcntl(fd, F_GETFL, 0);
        fcntl(fd, F_SETFL, flags | O_NONBLOCK);
    }
    
    void run() {
        struct epoll_event events[1024];
        while (true) {
            int n = epoll_wait(epfd_, events, 1024, -1);
            for (int i = 0; i < n; ++i) {
                handlers_[events[i].data.fd](events[i].events);
            }
        }
    }
};
```

---

## 五、CAS 无锁队列

### 5.1 CAS 原理

CAS（Compare-And-Swap）是 CPU 提供的原子指令：

```cpp
bool CAS(T* ptr, T expected, T new_value) {
    if (*ptr != expected) return false;
    *ptr = new_value;
    return true;
}
```

x86 上对应 `cmpxchg` 指令，单条指令保证原子性。

### 5.2 C++11 std::atomic

```cpp
std::atomic<int> x{0};

// CAS 操作
int expected = 0;
bool success = x.compare_exchange_weak(expected, 1,
    std::memory_order_acquire);

// weak 版本：可能"伪失败"（实际相等但返回 false）
// 强版本：保证只在真正不相等时返回 false
// 一般用 weak，循环重试，性能更好
```

### 5.3 无锁 SPSC 环形队列

单生产者单消费者，最经典的无锁场景：

```cpp
template<typename T, size_t Capacity>
class SPSCQueue {
    static_assert((Capacity & (Capacity - 1)) == 0,
                  "Capacity must be power of 2");
    
    alignas(64) std::atomic<size_t> write_pos_{0};
    alignas(64) T buffer_[Capacity];
    alignas(64) std::atomic<size_t> read_pos_{0};
    
public:
    bool push(const T& value) {
        size_t wp = write_pos_.load(std::memory_order_relaxed);
        size_t next_wp = (wp + 1) & (Capacity - 1);
        
        if (next_wp == read_pos_.load(std::memory_order_acquire)) {
            return false;   // 满
        }
        
        buffer_[wp] = value;
        write_pos_.store(next_wp, std::memory_order_release);
        return true;
    }
    
    bool pop(T& value) {
        size_t rp = read_pos_.load(std::memory_order_relaxed);
        
        if (rp == write_pos_.load(std::memory_order_acquire)) {
            return false;   // 空
        }
        
        value = buffer_[rp];
        read_pos_.store((rp + 1) & (Capacity - 1), std::memory_order_release);
        return true;
    }
};
```

### 5.4 内存序选择

```cpp
// 错误：用 relaxed，写入顺序不保证
buffer_[wp] = value;
write_pos_.store(next_wp, std::memory_order_relaxed);
// 消费者可能看到 write_pos 更新但 buffer_ 数据还没写入！

// 正确：用 release/acquire 配对
buffer_[wp] = value;
write_pos_.store(next_wp, std::memory_order_release);
// release 保证前面的写操作完成
// acquire 保证看到 release 之前的所有写
```

### 5.5 ABA 问题

经典场景：

```text
线程 1 读到 x = A
线程 2 把 x 改成 B，又改回 A
线程 1 CAS(A → C) 成功！但中间的 B 已被丢失

→ 解决：tagged pointer（指针 + 版本号一起 CAS）
```

SPSC 队列天然避免 ABA：
- 单生产者：write_pos 不会出现"先增后减"
- 单消费者：read_pos 同理
- 所以简单的 acquire/release 就够

MPMC 队列需要更复杂的机制（如 sequence 号），见 [高并发复合容器设计](/posts/八股文-4-high-concurrency-containers)。

---

## 六、面试高频追问链

### Q1：select / poll / epoll 的核心区别？

> select 用 bitmap，1024 上限，每次全量传递，O(n) 检查；poll 用数组无上限，但仍是 O(n)；epoll 用红黑树 + 就绪链表，注册一次，O(1) 检查。

### Q2：epoll_wait 为什么是 O(1)？

> 内核维护一个就绪链表，网卡收到数据时通过回调把 fd 加入就绪链表。epoll_wait 直接返回链表中的元素，不需要遍历所有注册的 fd。

### Q3：ET 和 LT 哪个性能更好？

> ET 性能更好（通知次数少），但编程更复杂（必须循环读到 EAGAIN）。Nginx、Redis 用 ET；新手项目建议从 LT 开始。

### Q4：惊群问题是什么？

> 多进程/线程同时 `accept` 同一 listen_fd，新连接到达时所有进程被唤醒，但只有一个能拿到，其他白白消耗 CPU。Linux 3.9+ 加入 `EPOLLEXCLUSIVE` 标志，保证只有一个进程被唤醒。

### Q5：为什么 TIME_WAIT 是 2MSL？

> 1. 让最后的 ACK 有足够时间到达（如果丢失，服务端重发 FIN，需要 1 MSL）
> 2. 让旧连接的报文消失（最多 1 MSL）
> 总共 2 MSL。

### Q6：如何优化 TIME_WAIT 过多？

> 调整参数：
> - `net.ipv4.tcp_tw_reuse = 1`：允许复用 TIME_WAIT 连接（客户端）
> - `net.ipv4.tcp_tw_recycle = 1`：快速回收（NAT 环境下慎用，4.12 内核已删除）
> - `net.ipv4.tcp_max_tw_buckets`：限制最大 TIME_WAIT 数量
> - `SO_REUSEADDR`：服务端绑定地址复用

### Q7：什么是 reactor 和 proactor？

> - **Reactor**：同步 I/O 多路复用。操作系统通知"数据就绪"，应用程序自己 read/write。代表：epoll + Nginx、Redis、muduo。
> - **Proactor**：异步 I/O。应用程序发起 I/O 请求，操作系统完成后通知"已写入/读取完成"。代表：Windows IOCP、Boost.Asio。
> Linux 原生异步 I/O（io_uring）从 5.1 开始支持，越来越流行。

### Q8：CAS 和 mutex 谁更快？

> 取决于竞争激烈程度：
> - 低竞争：CAS 快（无需陷入内核）
> - 高竞争：mutex 可能更快（mutex 让等待线程睡眠，不浪费 CPU；CAS 死循环 spin 浪费 CPU）
> - Linux mutex 内部就是"自旋几次 + 失败后挂起"的混合策略

---

## 七、延伸阅读

- [epoll + Reactor 实战：共享单车 LBS 服务](/posts/epoll-reactor-bike)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)
- [Linux 操作系统核心八股](/posts/八股文-5-linux-os)
- [ai_aas 项目介绍：企业级网络安全流量审计引擎](/posts/aas-1)

---

> 网络编程的本质是"事件驱动 + 异步 I/O"。理解了 epoll + Reactor + 无锁队列，就理解了现代高并发服务器的核心架构。
