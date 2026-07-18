---
title: 高并发复合容器设计
date: 2026-07-18
tags:
  - C++
  - 八股文
  - 高并发
description: LRU Cache + Timer + MPMC Queue + Routing Table — 大厂面试常考的 4 种复合容器设计
category: 八股文
---

# 高并发复合容器设计

> 单纯背 STL 容器只能拿基本分，大厂面试真正考的是**复合容器**：在标准容器之上加锁/无锁策略、过期策略、COW 策略。本文覆盖 4 个经典场景。

---

## 一、LRU Cache：哈希表 + 双向链表

### 1.1 题目要求

设计一个缓存，支持：
- `get(key)`：返回 value，并标记为"最近使用"
- `put(key, value)`：插入/更新，超容时淘汰最久未使用

要求：**O(1) 时间**。

### 1.2 设计思路

| 数据结构 | 作用 | 时间 |
| --- | --- | --- |
| `std::unordered_map<K, Node*>` | 按 key 查节点 | O(1) |
| 双向链表 | 维护访问顺序 | O(1) 移动节点 |

```text
        head_                              tail_
         ↓                                   ↓
┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│ k1  │←─┤ k2  │←─┤ k3  │←─┤ k4  │←─┤ k5  │
│ v1  │─→│ v2  │─→│ v3  │─→│ v4  │─→│ v5  │
└─────┘  └─────┘  └─────┘  └─────┘  └─────┘
最近使用                                  最久未使用（淘汰候选）
```

### 1.3 实现

```cpp
class LRUCache {
    struct Node {
        int key, value;
        Node *prev, *next;
        Node(int k = 0, int v = 0) : key(k), value(v), prev(nullptr), next(nullptr) {}
    };
    
    int capacity_;
    std::unordered_map<int, Node*> map_;
    Node *head_, *tail_;
    
    void remove(Node* n) {
        n->prev->next = n->next;
        n->next->prev = n->prev;
    }
    
    void addToFront(Node* n) {
        n->next = head_->next;
        n->prev = head_;
        head_->next->prev = n;
        head_->next = n;
    }
    
public:
    LRUCache(int cap) : capacity_(cap) {
        head_ = new Node();
        tail_ = new Node();
        head_->next = tail_;
        tail_->prev = head_;
    }
    
    int get(int key) {
        auto it = map_.find(key);
        if (it == map_.end()) return -1;
        
        Node* n = it->second;
        remove(n);
        addToFront(n);
        return n->value;
    }
    
    void put(int key, int value) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            it->second->value = value;
            remove(it->second);
            addToFront(it->second);
            return;
        }
        
        Node* n = new Node(key, value);
        map_[key] = n;
        addToFront(n);
        
        if ((int)map_.size() > capacity_) {
            Node* lru = tail_->prev;
            remove(lru);
            map_.erase(lru->key);
            delete lru;
        }
    }
};
```

### 1.4 多线程版本：分段锁

单线程 LRU 没意思，**多线程 LRU** 才是大厂考题：

```cpp
class ShardedLRUCache {
    static constexpr int SHARD_COUNT = 64;
    
    struct Shard {
        std::mutex mtx;
        LRUCache cache;
    };
    
    std::vector<Shard> shards_{SHARD_COUNT};
    
    size_t getShard(int key) {
        return std::hash<int>{}(key) % SHARD_COUNT;
    }
    
public:
    int get(int key) {
        auto& s = shards_[getShard(key)];
        std::lock_guard<std::mutex> lock(s.mtx);
        return s.cache.get(key);
    }
    
    void put(int key, int value) {
        auto& s = shards_[getShard(key)];
        std::lock_guard<std::mutex> lock(s.mtx);
        s.cache.put(key, value);
    }
};
```

**分段锁的优势**：
- 64 个 shard → 理论上 64 倍并发度
- 同一 shard 的操作串行，跨 shard 完全并行
- 锁竞争从 O(N) 降到 O(N/64)

### 1.5 易错点

| 错误 | 后果 | 防御 |
| --- | --- | --- |
| 忘记删除尾部时 `map_.erase(lru->key)` | map 和链表不一致 | 删除节点同步删 map |
| `delete lru` 在 `erase` 之后 | UB（lru 已无效） | 顺序：先 erase，再 delete |
| 哨兵节点没初始化 prev/next | 空指针 | 构造函数连 head <-> tail |
| 没拷贝 key 到 Node | 删除时找不到 map entry | Node 必须存 key |

---

## 二、定时器：最小堆 / 时间轮

### 2.1 题目要求

设计一个定时器，支持：
- `add(timer_id, expire_time, callback)`：添加定时任务
- `tick()`：检查并执行到期的任务

### 2.2 方案 1：最小堆

```cpp
class TimerHeap {
    struct Task {
        int64_t expire;
        int id;
        std::function<void()> cb;
        bool operator>(const Task& o) const { return expire > o.expire; }
    };
    
    std::priority_queue<Task, std::vector<Task>, std::greater<>> heap_;
    std::mutex mtx_;
    
public:
    void add(int id, int64_t expire_ms, std::function<void()> cb) {
        std::lock_guard<std::mutex> lock(mtx_);
        heap_.push({expire_ms, id, std::move(cb)});
    }
    
    void tick(int64_t now_ms) {
        std::lock_guard<std::mutex> lock(mtx_);
        while (!heap_.empty() && heap_.top().expire <= now_ms) {
            auto task = heap_.top();
            heap_.pop();
            task.cb();   // 注意：不应该持锁执行回调！
        }
    }
    
    int64_t nextExpire() const {
        return heap_.empty() ? -1 : heap_.top().expire;
    }
};
```

**复杂度**：
- `add`：O(log n)
- `tick` 单次：O(log n)
- `nextExpire`：O(1)

### 2.3 方案 2：时间轮（Timing Wheel）

时间轮更适合**大量定时任务**的场景，比如 Kafka、Netty、Linux 内核都用它。

```text
              时间轮（轮槽数 = 8）
                    ↓ 当前指针
        ┌────┬────┬────┬────┬────┬────┬────┬────┐
        │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │
        └─┬──┴────┴─┬──┴────┴────┴─┬──┴────┴────┘
          │         │              │
       task1      task2          task3
                              (转 1 圈 + 4 槽)
```

**特点**：
- `add`：O(1)
- `tick`：O(任务数)
- 适合任务密度高、过期时间离散度低的场景

**简单实现**（单层时间轮）：

```cpp
class TimerWheel {
    static constexpr int WHEEL_SIZE = 60;   // 60 个槽，每秒 1 格
    std::vector<std::vector<Task>> slots_{WHEEL_SIZE};
    int current_ = 0;
    
public:
    void add(int delay_sec, Task task) {
        int slot = (current_ + delay_sec) % WHEEL_SIZE;
        slots_[slot].push_back(std::move(task));
    }
    
    void tick() {
        for (auto& task : slots_[current_]) {
            task.run();
        }
        slots_[current_].clear();
        current_ = (current_ + 1) % WHEEL_SIZE;
    }
};
```

### 2.4 epoll + timerfd 集成

```cpp
int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK | TFD_CLOEXEC);

struct itimerspec its;
its.it_value.tv_sec = 1;     // 第一次 1 秒后到期
its.it_interval.tv_sec = 1;  // 之后每 1 秒
timerfd_settime(tfd, 0, &its, nullptr);

// 加入 epoll
epoll_event ev;
ev.events = EPOLLIN;
ev.data.fd = tfd;
epoll_ctl(epfd, EPOLL_CTL_ADD, tfd, &ev);

// epoll_wait 返回后
uint64_t exp;
read(tfd, &exp, sizeof(exp));   // 必须读，否则一直就绪
timer.tick();
```

---

## 三、MPMC 无锁队列：环形数组 + CAS

### 3.1 题目要求

设计一个**多生产者多消费者**队列，无锁、线程安全。

### 3.2 设计：环形缓冲 + 原子下标

```cpp
template<typename T, size_t Capacity>
class MPMCQueue {
    static_assert((Capacity & (Capacity - 1)) == 0, 
                  "Capacity must be power of 2");
    
    struct Cell {
        std::atomic<size_t> sequence;
        T data;
    };
    
    alignas(64) std::vector<Cell> buffer_;
    alignas(64) std::atomic<size_t> head_{0};   // 消费者写入位置
    alignas(64) std::atomic<size_t> tail_{0};   // 生产者写入位置
    
public:
    MPMCQueue() : buffer_(Capacity) {
        for (size_t i = 0; i < Capacity; ++i) {
            buffer_[i].sequence.store(i);
        }
    }
    
    bool push(const T& value) {
        Cell* cell;
        size_t pos = tail_.load(std::memory_order_relaxed);
        
        while (true) {
            cell = &buffer_[pos % Capacity];
            size_t seq = cell->sequence.load(std::memory_order_acquire);
            intptr_t diff = (intptr_t)seq - (intptr_t)pos;
            
            if (diff == 0) {
                if (tail_.compare_exchange_weak(pos, pos + 1,
                        std::memory_order_relaxed)) {
                    break;
                }
            } else if (diff < 0) {
                return false;   // 队列满
            } else {
                pos = tail_.load(std::memory_order_relaxed);
            }
        }
        
        cell->data = value;
        cell->sequence.store(pos + 1, std::memory_order_release);
        return true;
    }
    
    bool pop(T& value) {
        Cell* cell;
        size_t pos = head_.load(std::memory_order_relaxed);
        
        while (true) {
            cell = &buffer_[pos % Capacity];
            size_t seq = cell->sequence.load(std::memory_order_acquire);
            intptr_t diff = (intptr_t)seq - (intptr_t)(pos + 1);
            
            if (diff == 0) {
                if (head_.compare_exchange_weak(pos, pos + 1,
                        std::memory_order_relaxed)) {
                    break;
                }
            } else if (diff < 0) {
                return false;   // 队列空
            } else {
                pos = head_.load(std::memory_order_relaxed);
            }
        }
        
        value = cell->data;
        cell->sequence.store(pos + Capacity, std::memory_order_release);
        return true;
    }
};
```

### 3.3 关键设计点

| 设计 | 原因 |
| --- | --- |
| `alignas(64)` | 避免 false sharing（不同线程写同一缓存行） |
| Capacity 是 2 的幂 | 用位运算 `% Capacity` → `& (Capacity-1)`，更快 |
| sequence 机制 | 解决"队列满/空"判断，避免 ABA 问题 |
| `acquire/release` 内存序 | 保证 push 的写对 pop 可见，反之亦然 |

### 3.4 性能对比

| 实现 | 1P1C ops/s | 4P4C ops/s |
| --- | --- | --- |
| `std::queue + mutex` | ~200 万 | ~50 万 |
| `boost::lockfree::spsc_queue` | ~5000 万 | N/A |
| 上述 MPMC 实现 | ~3000 万 | ~800 万 |

**实测**：在 ai_aas 项目中，MPMC 队列单线程 SPSC 模式 244 万 ops/s（详见 [无锁队列实战](/posts/lockfree-queue-benchmark)）。

---

## 四、路由表：`shared_ptr + unordered_map` COW

### 4.1 题目要求

设计一个**读多写少**的路由表：
- 配置更新时（秒级），整体替换
- 业务查询时（每秒数十万次），无锁

### 4.2 错误设计：直接加锁

```cpp
class BadRoutingTable {
    std::mutex mtx_;
    std::unordered_map<std::string, Route> table_;
    
public:
    Route find(const std::string& key) {
        std::lock_guard<std::mutex> lock(mtx_);   // ❌ 每次查询都加锁
        auto it = table_.find(key);
        return it != table_.end() ? it->second : Route{};
    }
    
    void update(std::unordered_map<std::string, Route> new_table) {
        std::lock_guard<std::mutex> lock(mtx_);
        table_ = std::move(new_table);
    }
};
```

**问题**：每次查询都加锁，性能瓶颈。

### 4.3 正确设计：Copy-On-Write

```cpp
class RoutingTable {
    std::shared_ptr<const std::unordered_map<std::string, Route>> table_;
    mutable std::mutex mtx_;
    
public:
    RoutingTable() {
        table_ = std::make_shared<const std::unordered_map<std::string, Route>>();
    }
    
    // 读：拷贝 shared_ptr（原子），无锁
    Route find(const std::string& key) const {
        auto snapshot = std::atomic_load(&table_);
        auto it = snapshot->find(key);
        return it != snapshot->end() ? it->second : Route{};
    }
    
    // 写：构造新表，原子替换
    void update(std::unordered_map<std::string, Route> new_table) {
        auto new_ptr = std::make_shared<const std::unordered_map<std::string, Route>>(
            std::move(new_table));
        std::atomic_store(&table_, new_ptr);
    }
};
```

### 4.4 COW 的核心思想

```text
更新前：                       更新中：
┌───────────┐                ┌───────────┐     ┌───────────┐
│ shared_ptr│                │ shared_ptr│ ──→ │ new_table │
│     │     │                │     │     │     │ (新建)    │
│     ↓     │                │     ↓     │     └───────────┘
│ old_table │                │ old_table │
└───────────┘                └───────────┘
                              持有 old_table 的线程继续读，不受影响

更新后：
┌───────────┐     ┌───────────┐
│ shared_ptr│ ──→ │ new_table │
└───────────┘     └───────────┘
                  ↑ 新查询走这里
   old_table 的引用计数 → 0 后自动释放
```

### 4.5 配合 atomic + thread_local（DCLP）

更激进的设计：业务线程持有 thread_local 快照，避免每次读 shared_ptr 的原子操作：

```cpp
class FastRouter {
    std::shared_ptr<const Table> latest_;
    std::atomic<uint64_t> version_{0};
    
public:
    void update(Table new_table) {
        auto p = std::make_shared<const Table>(std::move(new_table));
        std::atomic_store(&latest_, p);
        version_.fetch_add(1, std::memory_order_release);
    }
    
    Route find(const std::string& key) {
        thread_local std::shared_ptr<const Table> cached;
        thread_local uint64_t cached_version = 0;
        
        uint64_t v = version_.load(std::memory_order_acquire);
        if (v != cached_version) {
            cached = std::atomic_load(&latest_);
            cached_version = v;
        }
        
        auto it = cached->find(key);
        return it != cached->end() ? it->second : Route{};
    }
};
```

详见 [C++17 配置热更新](/posts/config-hot-reload)。

---

## 五、综合对比

| 容器 | 写性能 | 读性能 | 适用场景 |
| --- | --- | --- | --- |
| **LRU + 分段锁** | 中（持锁） | 中（持锁） | 通用缓存，元素多 |
| **MPMC 无锁队列** | 高（CAS） | 高（CAS） | 生产者-消费者 |
| **Timer 最小堆** | O(log n) | O(1)（top） | 定时任务数量适中 |
| **Timer 时间轮** | O(1) | O(1) | 定时任务数量大、密度高 |
| **Routing COW** | 低（重建表） | 极高（无锁读） | 配置表，秒级更新 |

---

## 六、面试追问链

### Q1：LRU 为什么不直接用 `std::list + unordered_map`？

> 可以，但 `std::list` 的迭代器在 erase/splice 时不会失效，刚好适合 LRU。用 `unordered_map<K, list::iterator>` 更简洁：

```cpp
std::list<std::pair<K, V>> items_;
std::unordered_map<K, decltype(items_)::iterator> map_;

void touch(K key) {
    auto it = map_[key];
    items_.splice(items_.begin(), items_, it);   // O(1) 移到头部
}
```

### Q2：时间轮 vs 最小堆怎么选？

> - 任务数 < 1万，过期时间离散度大：**最小堆**
> - 任务数 > 100万，过期时间密集：**时间轮**
> - Linux 内核用多层时间轮（轮中轮），处理毫秒到小时级定时

### Q3：无锁队列的 ABA 问题怎么解决？

> 经典 ABA：线程 A 读到值 X，被线程 B 改成 Y 又改回 X，A 误以为没变过。**解法**：
> 1. **指针 + tag**（DCAS）：除了指针还比较版本号
> 2. **Hazard Pointer**：标记"我正在用这个指针，请别回收"
> 3. **epoch-based reclamation**：分代回收，所有线程退出当前代后才释放
> 4. 本节实现用 sequence 机制天然避免了 ABA（位置不变，但 sequence 单调递增）

### Q4：COW 路由表会不会内存暴涨？

> 不会。`shared_ptr` 引用计数到 0 自动释放。最坏情况下：旧表 + 新表同时存在（在所有线程切换快照前），但这只是 2 倍内存，不是无限增长。

### Q5：MPMC 队列的 false sharing 怎么避免？

> 多线程频繁修改的变量不能放在同一缓存行（64 字节）。`alignas(64)` 强制对齐，每个原子变量独占一个缓存行：

```cpp
struct alignas(64) PaddedAtomic {
    std::atomic<size_t> value;
};
```

### Q6：分段锁 LRU 的最佳 shard 数？

> 经验值：CPU 核数的 4-8 倍。比如 8 核机器用 32-64 个 shard。太少了并发度低，太多了内存浪费。

---

## 七、延伸阅读

- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)
- [C++17 配置热更新：atomic 版本号 + thread_local + DCLP](/posts/config-hot-reload)
- [STL 容器底层剖析](/posts/八股文-3-stl-containers)
- [LRU 缓存 + 最小栈 + Trie + 滑动窗口最大值](/posts/leetcode-design)

---

> 高并发容器设计的本质是**降低锁粒度**：从粗粒度全局锁 → 分段锁 → 无锁。每一步都是用更复杂的实现换更高的并发度。
