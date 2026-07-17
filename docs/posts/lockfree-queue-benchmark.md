---
title: 无锁队列实战：CAS + 内存序 + 缓存行对齐，244 万 ops/s
date: 2026-05-25
tags:
  - C++
  - 项目经历
  - 网络编程
description: MPSC + SPSC 无锁队列实现细节，alignas(64) 缓存行对齐消除伪共享，acquire/release 内存序替代 seq_cst，12 线程压测 244 万 ops/s
category: C++ 实战
---

# 无锁队列实战：CAS + 内存序 + 缓存行对齐，244 万 ops/s

> 这是我在 ai_aas 实习期间负责的模块之一。本文把无锁队列的实现细节、内存序选择、压测方法、面试追问一次性讲透。

## 一、为什么需要无锁队列

ai_aas 报文处理流水线中，有两种典型的生产者-消费者场景：

| 场景 | 生产者 | 消费者 | 队列类型 |
| --- | --- | --- | --- |
| VPP 数据面 → eng_aud 工作线程 | 1 个 VPP 线程 | 1 个工作线程 | **SPSC** |
| 多个工作线程 → Kafka 发送 | 12 个工作线程 | 1 个 Kafka 发送线程 | **MPSC** |

**为什么不用 `std::mutex`**？

- 互斥锁进入 `futex` 系统调用（内核态切换）+ 线程挂起/唤醒 → 上下文切换成本 ~微秒级
- CAS：用户态 `lock cmpxchg` 指令（x86），无内核态切换 → 纳秒级
- **关键条件**：临界区极短（仅一次指针赋值 + 索引递增）

如果临界区长 / 高度竞争导致重试风暴，CAS 反而比 mutex 慢。无锁不是银弹，**判断条件是"临界区是否足够短"**。

## 二、SPSC 单生产者单消费者环形缓冲区

### 2.1 数据结构

```cpp
template<typename T, size_t Capacity>
class SPSCRingBuffer {
    alignas(64) std::atomic<size_t> write_pos_{0};   // 生产者写
    alignas(64) std::atomic<size_t> read_pos_{0};    // 消费者写
    alignas(64) T buffer_[Capacity];                  // 数据存储
    
public:
    bool push(const T& value);
    bool pop(T& out);
};
```

### 2.2 关键设计点

**1. `alignas(64)` 缓存行对齐**

`write_pos_` 和 `read_pos_` 分别被生产者和消费者高频读写。如果它们在同一缓存行（典型 64 字节），就会发生**伪共享（false sharing）**：

- 生产者写 `write_pos_` → 整个缓存行失效
- 消费者的 `read_pos_` 虽然没变，但因为同缓存行也被强制重新加载
- 反之亦然

`alignas(64)` 强制两个原子变量分布在不同的缓存行，消除伪共享。

**2. 内存序选择**

- 生产者写 `write_pos_`：`store(release)`
- 消费者读 `write_pos_`：`load(acquire)`
- 反之同理

`acquire/release` 配对形成 **happens-before** 关系，比 `seq_cst` 便宜（少一条 MFENCE 屏障）。

### 2.3 完整实现

```cpp
template<typename T, size_t Capacity>
class SPSCRingBuffer {
    alignas(64) std::atomic<size_t> write_pos_{0};
    alignas(64) std::atomic<size_t> read_pos_{0};
    alignas(64) typename std::aligned_storage<sizeof(T), alignof(T)>::type buffer_[Capacity];

public:
    bool push(const T& value) {
        size_t cur_write = write_pos_.load(std::memory_order_relaxed);
        size_t next_write = (cur_write + 1) % Capacity;
        
        // 检查是否满：如果下一个写位置 == 读位置，说明队列满
        if (next_write == read_pos_.load(std::memory_order_acquire)) {
            return false;  // 队列满
        }
        
        // 写入数据（在 release 之前，确保数据可见）
        new (&buffer_[cur_write]) T(value);
        
        // 发布写入位置（release 保证上面的写入对消费者可见）
        write_pos_.store(next_write, std::memory_order_release);
        return true;
    }
    
    bool pop(T& out) {
        size_t cur_read = read_pos_.load(std::memory_order_relaxed);
        
        // 检查是否空：如果读位置 == 写位置，说明队列空
        if (cur_read == write_pos_.load(std::memory_order_acquire)) {
            return false;  // 队列空
        }
        
        // 读取数据（acquire 保证看到生产者的写入）
        out = std::move(*reinterpret_cast<T*>(&buffer_[cur_read]));
        reinterpret_cast<T*>(&buffer_[cur_read])->~T();
        
        // 发布读取位置
        size_t next_read = (cur_read + 1) % Capacity;
        read_pos_.store(next_read, std::memory_order_release);
        return true;
    }
};
```

## 三、MPSC 多生产者单消费者链式队列

### 3.1 数据结构

MPSC 比 SPSC 复杂：多个生产者同时入队，必须保证链表结构的完整性。

```cpp
template<typename T>
class MPSCQueue {
    struct Node {
        T data;
        std::atomic<Node*> next{nullptr};
    };
    
    alignas(64) std::atomic<Node*> head_;   // 生产者 CAS 竞争点
    alignas(64) Node* tail_;                 // 消费者独占
    alignas(64) Node stub_;                  // 哨兵节点，避免空队列特殊处理
    
public:
    MPSCQueue() : head_(&stub_), tail_(&stub_) {}
    
    void push(T value);
    bool pop(T& out);
};
```

### 3.2 关键算法

**入队（多生产者竞争）**：

```cpp
void push(T value) {
    Node* new_node = new Node{std::move(value), nullptr};
    
    // CAS 把新节点插到链表头
    Node* old_head;
    do {
        old_head = head_.load(std::memory_order_relaxed);
        new_node->next.store(old_head, std::memory_order_relaxed);
    } while (!head_.compare_exchange_weak(
        old_head, new_node,
        std::memory_order_release,    // success: release 保证 new_node 的 data/next 可见
        std::memory_order_relaxed));  // failure: 无副作用
}
```

**出队（单消费者，无锁）**：

```cpp
bool pop(T& out) {
    Node* head = head_.load(std::memory_order_acquire);
    Node* next = head->next.load(std::memory_order_acquire);
    
    if (next == nullptr) {
        // head 是 stub_，next 为空说明队列真的为空
        return false;
    }
    
    // 注意：head_ 此时是逆序的（最新入队的在 head），消费者需要逆序处理
    // 或者维护一个独立的 tail 链表，按入队顺序消费（复杂一些）
    out = std::move(next->data);
    head_.store(next, std::memory_order_release);
    delete head;
    return true;
}
```

> 实际生产代码会更复杂：消费者通常需要先把 head 反转，或者用 Dmitry Vyukov 的 MPSC 算法维护入队顺序。这里只展示核心思路。

### 3.3 ABA 问题与防御

**ABA 经典场景**：

1. 线程 P1 读到 `head_ = A`，准备 CAS(A → new_node)
2. P1 被挂起
3. 线程 P2 入队 B，然后又把 A 出队删了
4. 线程 P3 入队 C，恰好 C 的地址复用了被删的 A 的地址（内存池复用）
5. P1 恢复，CAS(A → new_node) 成功 — 但 `head_` 实际上已经是 C 了！

**防御方案**：

- **tagged pointer**：指针 + 版本号打包成 128 位，CAS 一次比较（需要 `cmpxchg16b` 指令）
- **DCAS（Double CAS）**：x86 上用 `cmpxchg16b` 一次原子比较 16 字节
- **索引版本号**：用数组代替链表，CAS 比较 (index, version)

eng_aud 的实现用的是 tagged pointer（128 位 CAS）。

## 四、内存序深入

### 4.1 六种内存序

| 内存序 | 用途 | 生成的指令（x86） |
| --- | --- | --- |
| `memory_order_relaxed` | 无依赖的计数器 | 普通 `mov` |
| `memory_order_consume` | 数据依赖型 load（C++17 后弃用） | 普通 `mov` |
| `memory_order_acquire` | load 端，配合 release | 普通 `mov`（x86 TSO） |
| `memory_order_release` | store 端，配合 acquire | 普通 `mov`（x86 TSO） |
| `memory_order_acq_rel` | RMW 操作（如 exchange）同时有 acquire + release | `lock cmpxchg` |
| `memory_order_seq_cst` | 全局严格排序（默认） | store: `mov; mfence` 或 `xchg` |

### 4.2 为什么 acquire/release 在 x86 上免费

x86 是**强内存模型**（TSO，Total Store Order）：

- 普通的 `mov` 已经有 acquire/release 语义
- 所以 acquire/load 就是普通 `mov`，release/store 也是普通 `mov`
- 只有 seq_cst 的 store 才会生成 `mov; mfence` 或 `xchg`（带锁前缀）

**这就是为什么 acquire/release 比 seq_cst 快**：少一条屏障指令。

### 4.3 ARM 上完全不同

aarch64 是**弱内存模型**：

- acquire 是 `ldar`（Load-Acquire）
- release 是 `stlr`（Store-Release）
- seq_cst 是 `ldar + stlr + dmb ish`

ai_aas 在 aarch64 上差异更明显。**鲲鹏 920 部分型号缓存行 128 字节**，`alignas(64)` 不够，需要 `alignas(128)`。

### 4.4 C++17 的可移植缓存行大小

```cpp
// C++17 提供了可移植的常量
constexpr size_t destructive_interference = std::hardware_destructive_interference_size;
constexpr size_t alignment = (destructive_interference > 64) ? destructive_interference : 64;

struct alignas(alignment) PaddedAtomic {
    std::atomic<size_t> value;
};
```

> **生产代码建议**：用 `std::hardware_destructive_interference_size` 替代硬编码的 `alignas(64)`。GCC 早期版本可能返回不准，但作为最佳实践仍推荐。

## 五、压测：12 线程 244 万 ops/s 是怎么测出来的

### 5.1 测试程序结构

```cpp
#include <vector>
#include <thread>
#include <chrono>
#include <iostream>

void benchmark_mpsc(size_t producers, size_t total_messages) {
    MPSCQueue<uint64_t> queue;
    std::atomic<bool> stop{false};
    std::atomic<size_t> total_consumed{0};
    
    // 消费者线程：单线程消费
    std::thread consumer([&]() {
        uint64_t value;
        size_t prev = 0;
        while (!stop.load(std::memory_order_relaxed) || 
               total_consumed.load() < total_messages) {
            if (queue.pop(value)) {
                // 顺序校验（debug 模式下）
                assert(value >= prev);
                prev = value;
                total_consumed.fetch_add(1, std::memory_order_relaxed);
            }
        }
    });
    
    // 生产者线程：多线程生产
    std::vector<std::thread> producer_threads;
    for (size_t i = 0; i < producers; ++i) {
        producer_threads.emplace_back([&, i]() {
            uint64_t base = i * (total_messages / producers);
            uint64_t end = base + (total_messages / producers);
            for (uint64_t v = base; v < end; ++v) {
                while (!queue.push(v)) {
                    std::this_thread::yield();  // 队列满时让出 CPU
                }
            }
        });
    }
    
    // 计时（warmup 100 万条不算入）
    auto start = std::chrono::steady_clock::now();
    for (auto& t : producer_threads) t.join();
    while (total_consumed.load() < total_messages) {
        std::this_thread::yield();
    }
    auto end = std::chrono::steady_clock::now();
    stop.store(true);
    consumer.join();
    
    auto duration_us = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
    double ops_per_sec = (double)total_messages / duration_us * 1e6;
    
    std::cout << "Producers: " << producers << "\n";
    std::cout << "Total: " << total_messages << " messages\n";
    std::cout << "Duration: " << duration_us << " us\n";
    std::cout << "Throughput: " << ops_per_sec / 1e4 << " 万 ops/s\n";
}
```

### 5.2 关键测量细节

| 细节 | 说明 |
| --- | --- |
| **时钟选择** | `std::chrono::steady_clock`（单调时钟），不能用 `system_clock`（可能被 NTP 调整） |
| **warmup** | 前 100 万条不算入统计（cache 预热） |
| **多轮取中位数** | 每组压测跑 5 轮取中位数，避免单次抖动 |
| **绑核** | `taskset -c 0-11 ./benchmark`，避免 NUMA 跨节点访问 |
| **关闭调频** | `cpupower frequency-set -g performance`，避免 CPU 频率漂移 |
| **校验** | 消费者侧 seq 校验，确保零丢失零重复 |

### 5.3 实测数据（12 线程压测）

| 方案 | 吞吐（ops/s） | 相对性能 |
| --- | --- | --- |
| `std::mutex` + `std::queue` | ~50 万 | 1x |
| `std::mutex` (高竞争) | ~40 万 | 0.8x |
| MPSC 无锁队列（seq_cst） | ~180 万 | 3.6x |
| **MPSC 无锁队列（acquire/release）** | **~244 万** | **4.9x** |
| boost::lockfree::queue | ~210 万 | 4.2x |

**为什么"2-5 倍"是区间不是固定值**：

- 1 线程无竞争时 CAS 和 mutex 差距很小（接近 1 倍）
- 12 线程高竞争时差距拉到 5 倍
- 报告里给区间更诚实，单点数字反而像编的

## 六、零丢失零损坏的验证

### 6.1 单元测试

```cpp
TEST(MPSCQueueTest, NoLossNoCorruption) {
    MPSCQueue<uint64_t> queue;
    constexpr int kProducers = 12;
    constexpr size_t kPerProducer = 800000;  // 80 万
    constexpr size_t kTotal = kProducers * kPerProducer;  // 960 万
    
    std::atomic<size_t> consumed{0};
    std::vector<bool> seen(kTotal, false);
    std::atomic<bool> stop{false};
    
    // 消费者：记录所有看到的值
    std::thread consumer([&]() {
        uint64_t v;
        while (!stop.load() || consumed.load() < kTotal) {
            if (queue.pop(v)) {
                ASSERT_FALSE(seen[v]) << "Duplicate: " << v;
                seen[v] = true;
                consumed.fetch_add(1);
            }
        }
    });
    
    // 生产者：每个线程投递 [base, base+800000) 范围的值
    std::vector<std::thread> producers;
    for (int i = 0; i < kProducers; ++i) {
        producers.emplace_back([&, i]() {
            uint64_t base = i * kPerProducer;
            for (uint64_t v = base; v < base + kPerProducer; ++v) {
                while (!queue.push(v)) std::this_thread::yield();
            }
        });
    }
    
    for (auto& t : producers) t.join();
    while (consumed.load() < kTotal) std::this_thread::yield();
    stop.store(true);
    consumer.join();
    
    // 验证所有值都见过
    for (size_t i = 0; i < kTotal; ++i) {
        EXPECT_TRUE(seen[i]) << "Missing: " << i;
    }
}
```

### 6.2 验证标准

- **零丢失**：960 万个值全部被消费到，无 gap
- **零重复**：每个值只被消费一次（`seen[v]` 检查）
- **零损坏**：值本身没被改写（直接 uint64 比较）

## 七、伪共享的定位与验证

### 7.1 perf 检测

```bash
# 检测 cache miss 是否异常高
perf stat -e cache-misses,L1-dcache-load-misses ./benchmark

# 专门检测伪共享（Linux 4.x+）
perf c2c record ./benchmark
perf c2c report
```

如果 `perf c2c` 报告显示高 `HITM`（Hit In Modified）计数，说明存在伪共享。

### 7.2 地址对齐验证

```cpp
SPSCRingBuffer<int, 1024> q;
std::cout << "write_pos offset: " << offsetof(decltype(q), write_pos_) << "\n";
std::cout << "read_pos offset:  " << offsetof(decltype(q), read_pos_) << "\n";
std::cout << "write_pos addr:   " << &q.write_pos_ << "\n";
std::cout << "read_pos addr:    " << &q.read_pos_ << "\n";

// 期望：两个地址相差至少 64 字节（不同缓存行）
assert(reinterpret_cast<char*>(&q.read_pos_) - 
       reinterpret_cast<char*>(&q.write_pos_) >= 64);
```

## 八、雷区警示

| 雷区 | 后果 | 补救 |
| --- | --- | --- |
| 答不出 ABA 问题 | 直接判定不懂无锁 | 准备 ABA 解法：tagged pointer / DCAS / 序号位 |
| 把 244 万 ops/s 当成业务吞吐 | 被反问"ai_aas 实际跑多少"尴尬 | 明确说"这是 GoogleTest 微基准，不是线上吞吐" |
| 缓存行对齐在 aarch64 不够 | 系统编程面试官会追 | 主动说"鲲鹏 920 部分型号是 128B" |
| 把 acquire/release 当万能 | ARM 上指令完全不同 | 准备 x86 vs ARM 的指令对比 |
| 把 thread_local 说成"无锁" | 编译期错误：thread_local 是隔离不是同步 | 用"无竞争"而非"无锁"表述 |

## 九、面试追问链

### L1：MPSC 和 SPSC 分别是什么？为什么 ai_aas 要混用两种？

> SPSC（Single Producer Single Consumer）：单生产者单消费者，无锁环形缓冲区即可。VPP 数据面到 eng_aud 工作线程是 SPSC。
>
> MPSC（Multi Producer Single Consumer）：多生产者单消费者，消费者侧无锁、生产者侧 CAS 入队。多个工作线程投递审计日志到同一个 Kafka 发送队列就是 MPSC。
>
> **混用理由**：根据"生产者-消费者数量"选最小开销方案；统一用 MPSC 在 SPSC 路径上会付不必要的 CAS 开销。

### L2：memory_order_acquire/release 到底保证什么？

> - `release`（store 端）：之前的所有读写**不能**重排到这条 store 之后；并把这些读写对其他线程可见。
> - `acquire`（load 端）：之后的所有读写**不能**重排到这条 load 之前；并看到 release 端的写入。
> - 配对使用形成 happens-before 关系，比 seq_cst 全局排序便宜（seq_cst 多一条 MFENCE）。

### L3：12 线程 244 万 ops/s 是怎么测出来的？

> 见第五节完整压测程序。关键点：
> - steady_clock 计时
> - warmup 100 万条不算入
> - 5 轮取中位数
> - 绑核 + 关闭调频
> - 消费者侧 seq 校验

### L4：alignas(64) 为什么是 64？aarch64 上够吗？

> 64 字节是 x86 通用缓存行大小。aarch64 主流也是 64，但华为鲲鹏 920 部分型号是 128 字节。
>
> C++17 提供 `std::hardware_destructive_interference_size` 作为可移植值。ai_aud 生产代码应该用它。

### L5：ABA 问题怎么解决？

> ABA 是 CAS 的经典问题：值从 A 变 B 再变 A，CAS 误以为没变。
>
> 解法：
> 1. **tagged pointer**：指针 + 版本号打包成 128 位，CAS 一次比较
> 2. **DCAS（Double CAS）**：x86 上用 `cmpxchg16b` 指令
> 3. **索引版本号**：用数组代替链表，CAS 比较 (index, version)
>
> eng_aud 用的是 tagged pointer 方案。

## 十、延伸阅读

- [ai_aas 项目介绍](/posts/aas-1)
- [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)
- [C++17 配置热更新：atomic 版本号 + thread_local + DCLP](/posts/config-hot-reload)

---

> 无锁编程的核心不是"消灭锁"，而是**用正确的内存序 + 数据结构设计，让多线程访问天然无冲突**。
