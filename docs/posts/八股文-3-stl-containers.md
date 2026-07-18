---
title: STL 容器底层剖析
date: 2026-07-18
tags:
  - C++
  - 八股文
description: array/vector/deque/list/map/unordered_map 底层实现 + 迭代器失效规则 + resize vs reserve + push_back vs emplace_back
category: 八股文
---

# STL 容器底层剖析

> STL 容器是 C++ 后端面试的必考点。本文按"底层布局 → 时间复杂度 → 迭代器失效 → 选型决策"四步走，把 7 大类容器讲透。

---

## 一、容器分类总览

```text
┌─────────────────────────────────────────────────────┐
│              STL 容器家族                            │
├─────────────┬───────────────────────────────────────┤
│             │ array<T,N>    编译期固定大小          │
│ 序列容器     │ vector<T>     动态数组                │
│             │ deque<T>      双端队列（分块连续）     │
│             │ list<T>       双向链表                 │
│             │ forward_list  单向链表                 │
├─────────────┼───────────────────────────────────────┤
│ 关联容器     │ map<K,V>      红黑树（有序）          │
│             │ set<K>        红黑树                   │
│             │ multimap / multiset  允许重复          │
├─────────────┼───────────────────────────────────────┤
│ 无序关联    │ unordered_map<K,V>  哈希表             │
│             │ unordered_set<K>    哈希表             │
├─────────────┼───────────────────────────────────────┤
│ 容器适配器  │ stack<T>      默认基于 deque           │
│             │ queue<T>      默认基于 deque           │
│             │ priority_queue 默认基于 vector+堆算法 │
└─────────────┴───────────────────────────────────────┘
```

---

## 二、连续内存：`std::vector`

### 2.1 底层布局

```text
vector<int> v = {1, 2, 3};

        capacity = 6
        ┌───┬───┬───┬───┬───┬───┐
data_ → │ 1 │ 2 │ 3 │   │   │   │
        └───┴───┴───┴───┴───┴───┘
        ↑           ↑               ↑
        begin()     end()           capacity end
        size = 3
```

底层就是一块**连续的动态数组**，三个指针维护：`begin`、`end`、`end_of_storage`。

### 2.2 扩容机制

```cpp
std::vector<int> v;
for (int i = 0; i < 10; ++i) {
    v.push_back(i);
    std::cout << "size=" << v.size() 
              << " capacity=" << v.capacity() << "\n";
}
```

典型输出（GCC）：`capacity = 1, 2, 4, 8, 16, ...`（2 倍扩容）。

**扩容流程**：
1. 分配新内存（通常是当前 capacity 的 2 倍）
2. 移动（或拷贝）旧元素到新内存
3. 析构旧元素
4. 释放旧内存

**时间复杂度**：
- 平均 push_back：O(1)（均摊）
- 单次最坏：O(n)

### 2.3 resize vs reserve

```cpp
std::vector<int> v;

v.reserve(100);    // 仅分配内存，size 不变
// v.size() = 0, v.capacity() = 100
// v[0] = 1;  ❌ UB！size 还是 0

v.resize(50);      // 分配并初始化 50 个元素
// v.size() = 50, v.capacity() >= 50
// v[0] = 1;  ✅
```

| 方法 | 影响 size | 影响 capacity | 调用构造函数 | 用途 |
| --- | --- | --- | --- | --- |
| `reserve(n)` | ❌ | ✅ | ❌ | 预分配，避免多次扩容 |
| `resize(n)` | ✅ | ✅ | ✅（构造默认值） | 改变容器大小 |

### 2.4 push_back vs emplace_back

```cpp
std::vector<std::string> v;

// push_back：先构造临时对象，再移动/拷贝
v.push_back(std::string("hello"));

// emplace_back：原地构造，避免临时对象
v.emplace_back("hello");   // 直接调 string(const char*)
```

**emplace_back 更高效**：
- 不需要先构造再移动
- 但只有在构造参数直接传给容器元素时才有收益
- 对已有对象 `v.push_back(s)` vs `v.emplace_back(s)` 没区别

### 2.5 迭代器失效规则

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};

// 扩容：所有迭代器、指针、引用全部失效
v.push_back(6);   // 若触发扩容，前面所有 it 失效

// erase：从删除位置往后全部失效
v.erase(v.begin() + 2);   // 指向 [2] 及之后的迭代器失效

// insert：若触发扩容，全部失效；否则插入点之后失效
```

**安全删除多个元素**：

```cpp
// ❌ 错误：erase 后 it 失效
for (auto it = v.begin(); it != v.end(); ++it) {
    if (*it == target) v.erase(it);   // UB
}

// ✅ 正确：erase 返回下一个迭代器
for (auto it = v.begin(); it != v.end(); ) {
    if (*it == target) it = v.erase(it);
    else ++it;
}

// ✅ 最简：算法 + 习惯用法
v.erase(std::remove(v.begin(), v.end(), target), v.end());
```

---

## 三、双端队列：`std::deque`

### 3.1 底层布局

deque 不是真正的"连续"内存，而是**分块连续 + map 表**：

```text
map（中控数组，指针数组）
┌────┬────┬────┬────┬────┬────┐
│ p0 │ p1 │ p2 │ p3 │ p4 │ p5 │
└─┬──┴─┬──┴─┬──┴─┬──┴────┴────┘
  │    │    │    │
  ↓    ↓    ↓    ↓
┌────┐┌────┐┌────┐┌────┐
│ .. ││ .. ││1 2 ││3 4 │
│ .. ││ .. ││3 4 ││5 ..│   每块固定大小（如 512 字节）
└────┘└────┘└────┘└────┘
       头部             尾部
```

### 3.2 时间复杂度

| 操作 | 复杂度 | 说明 |
| --- | --- | --- |
| `push_back` | O(1) | 块未满直接放，满了分配新块 |
| `push_front` | O(1) | 块未满直接放，满了分配新块 |
| `pop_back/front` | O(1) | |
| `operator[]` | O(1) | 通过 map 计算块号 + 块内偏移 |
| `insert(pos)` | O(n) | 需要移动元素 |

### 3.3 vs vector

| 维度 | vector | deque |
| --- | --- | --- |
| 内存布局 | 完全连续 | 分块连续 |
| 头部插入 | O(n) | O(1) |
| 尾部插入 | 摊还 O(1) | O(1) |
| 随机访问 | 极快（cache 友好） | 稍慢（多一次解引用） |
| 内存开销 | 1 块大内存 | map + 多个小块 |
| 迭代器失效 | 扩容全失效 | 仅在端点插入可能失效中间 |

### 3.4 迭代器失效

```cpp
std::deque<int> dq = {1, 2, 3, 4, 5};

dq.push_back(6);     // 中间迭代器不失效（仅可能 map 扩容时失效）
dq.push_front(0);    // 同上

dq.erase(dq.begin() + 2);   // 仅被删除元素及其之后的失效
```

---

## 四、链表：`std::list` 与 `std::forward_list`

### 4.1 底层布局

**list（双向链表）**：

```text
        head_                              tail_
         ↓                                   ↓
┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│prev │←─┤prev │←─┤prev │←─┤prev │←─┤prev │
│  1  │  │  2  │  │  3  │  │  4  │  │  5  │
│next │─→│next │─→│next │─→│next │─→│next │
└─────┘  └─────┘  └─────┘  └─────┘  └─────┘
```

**forward_list（单向链表）**：

```text
head_
 ↓
┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│  1  │─→│  2  │─→│  3  │─→│  4  │─→ nullptr
└─────┘  └─────┘  └─────┘  └─────┘
```

### 4.2 list 时间复杂度

| 操作 | 复杂度 |
| --- | --- |
| `push_back/front` | O(1) |
| `pop_back/front` | O(1) |
| `insert(pos)` | O(1)（已知迭代器） |
| `erase(pos)` | O(1) |
| `operator[]` | ❌ 不支持 |
| `find` | O(n) |
| `size()` | O(n)（C++11 起）或 O(1)（取决于实现） |

### 4.3 list 的核心优势

```cpp
std::list<int> l = {1, 2, 3, 4, 5};

// O(1) 删除已知位置的元素（vector 是 O(n)）
auto it = std::find(l.begin(), l.end(), 3);
if (it != l.end()) l.erase(it);   // O(1)
```

**迭代器永不失效**（除了被删除的元素本身），这是 list 的最大价值。

### 4.4 list 的内存开销

每个节点：
- 2 个指针（prev/next）：16 字节
- 1 个数据：N 字节
- **总开销 = 16 + N**

存 `int`（4 字节）：每元素 20 字节；vector 仅 4 字节。**list 内存占用是 vector 的 5 倍**。

### 4.5 forward_list 为什么没有 size()

`forward_list` 是为了极致内存和性能优化的（接近 C 风格链表）。维护 size 会增加每次 push/pop 的指令数，与设计目标冲突。需要 size 用 `std::distance(begin(), end())`，O(n)。

---

## 五、关联容器：`std::map` / `std::set`

### 5.1 红黑树原理

红黑树是一种**自平衡二叉搜索树**，保证：
- 根到叶子的最长路径不超过最短路径的 2 倍
- 5 条性质：
  1. 节点是红色或黑色
  2. 根是黑色
  3. 叶子（NIL）是黑色
  4. 红色节点的子节点都是黑色（不能连续红）
  5. 任一节点到叶子的所有路径包含相同数量的黑节点

```text
                [30B]
              /       \
          [15R]       [50R]
          /   \       /   \
       [10B] [20B] [40B] [60B]
```

### 5.2 时间复杂度

| 操作 | 复杂度 |
| --- | --- |
| `insert` | O(log n) |
| `erase` | O(log n) |
| `find` | O(log n) |
| `operator[]` | O(log n) |
| 中序遍历 | 有序（升序） |

### 5.3 map 的 operator[] 妙处

```cpp
std::map<std::string, int> m;

// operator[] 不存在时插入默认值，存在时返回引用
m["apple"] += 1;    // 等价于：if 不存在插入 (apple, 0)，然后 ++0

// at() 会抛异常
m.at("banana") += 1;  // std::out_of_range
```

### 5.4 map vs multimap

```cpp
std::multimap<int, std::string> mm;
mm.insert({1, "a"});
mm.insert({1, "b"});    // 允许重复 key

mm.count(1);             // 2
auto range = mm.equal_range(1);   // 返回所有 key=1 的范围
```

---

## 六、无序容器：`std::unordered_map` / `unordered_set`

### 6.1 哈希表原理

底层是**拉链法**哈希表：

```text
bucket array（桶数组）
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │
└─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┘
  │   │   │   │   │   │   │   │
  ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓
       9→17  2  19→3              
       (链表)  │              
              26              
              │              
              33              
```

每个桶（bucket）是一个链表（C++14 后部分实现用 list，性能更好）。

### 6.2 时间复杂度

| 操作 | 平均 | 最坏（全部哈希冲突） |
| --- | --- | --- |
| `insert` | O(1) | O(n) |
| `erase` | O(1) | O(n) |
| `find` | O(1) | O(n) |
| `operator[]` | O(1) | O(n) |

### 6.3 rehash 机制

```cpp
std::unordered_map<int, int> m;

m.max_load_factor();   // 默认 1.0
m.load_factor();       // size / bucket_count

// 当 load_factor > max_load_factor 时，自动 rehash
// bucket_count 通常翻倍（接近质数）
```

**rehash 触发场景**：
1. 元素数超过 `bucket_count * max_load_factor`
2. 手动调用 `rehash(n)` 或 `reserve(n)`

rehash 时**所有迭代器失效，但指针/引用仍有效**（节点对象本身不变）。

### 6.4 自定义类型作为 key

```cpp
struct Person {
    std::string name;
    int age;
};

// 必须提供哈希函数和相等比较
struct PersonHash {
    size_t operator()(const Person& p) const noexcept {
        return std::hash<std::string>{}(p.name) ^ (std::hash<int>{}(p.age) << 1);
    }
};

struct PersonEqual {
    bool operator()(const Person& a, const Person& b) const {
        return a.name == b.name && a.age == b.age;
    }
};

std::unordered_map<Person, std::string, PersonHash, PersonEqual> m;
```

---

## 七、容器适配器

### 7.1 stack

```cpp
std::stack<int> s;             // 默认基于 deque
s.push(1);
s.top();                       // 1
s.pop();
```

| 底层容器 | 复杂度 |
| --- | --- |
| `std::deque`（默认） | push/pop O(1) |
| `std::vector` | push/pop 摊还 O(1) |
| `std::list` | push/pop O(1) |

### 7.2 queue

```cpp
std::queue<int> q;             // 默认基于 deque
q.push(1);                     // 入队
q.front();                     // 队首
q.back();                      // 队尾
q.pop();                       // 出队
```

**只能用 deque 或 list**（不能用 vector，因为 vector 头部 pop 是 O(n)）。

### 7.3 priority_queue

```cpp
// 默认大顶堆
std::priority_queue<int> pq;
pq.push(3); pq.push(1); pq.push(4);
pq.top();                      // 4

// 小顶堆
std::priority_queue<int, std::vector<int>, std::greater<int>> min_pq;

// 求前 K 大：维护大小为 K 的小顶堆
std::priority_queue<int, std::vector<int>, std::greater<int>> topk;
for (int x : nums) {
    topk.push(x);
    if ((int)topk.size() > k) topk.pop();
}
```

底层是 `vector` + `std::make_heap` / `push_heap` / `pop_heap`，本质是**二叉堆**。

---

## 八、容器选型决策树

```text
需要存什么？
│
├── 元素个数编译期已知？
│   └── ✅ std::array
│
├── 频繁随机访问？
│   ├── 主要尾部插入 → std::vector
│   └── 双端插入 → std::deque
│
├── 频繁中间插入/删除？
│   └── std::list（已知位置） / std::forward_list
│
├── 需要有序遍历？
│   └── std::map / std::set（红黑树）
│
├── 只需要 O(1) 查找，不关心顺序？
│   └── std::unordered_map / std::unordered_set
│
├── 需要 LIFO？
│   └── std::stack
│
├── 需要 FIFO？
│   └── std::queue
│
└── 需要按优先级出队？
    └── std::priority_queue
```

---

## 九、迭代器失效汇总表

| 容器 | 扩容/插入 | 删除 |
| --- | --- | --- |
| `vector` | 扩容：全部失效；插入：插入点后失效 | 删除点及之后失效 |
| `deque` | 端点插入：仅失效迭代器（不全失效） | 中间删除：被删及之后失效 |
| `list` | 永不失效 | 仅被删除节点失效 |
| `map/set` | 永不失效 | 仅被删除节点失效 |
| `unordered_map` | rehash 时全部迭代器失效（但指针/引用仍有效） | 仅被删除节点失效 |

---

## 十、面试追问链

### Q1：vector 扩容为什么是 2 倍？

> 2 倍扩容保证**均摊 O(1)**：n 次插入总拷贝次数为 `1+2+4+...+n = 2n`，平均每次 O(1)。MSVC 是 1.5 倍，多次扩容后旧内存可以被新内存复用（更省内存）；GCC 是 2 倍，扩容次数更少但内存利用率低。

### Q2：vector 和 list 谁更快？

> 大多数情况下 **vector 更快**：
> - 缓存友好（连续内存）
> - 元素紧密，无指针开销
> - 链表的"O(1) 插入"忽略了 cache miss 成本
>
> 只有在**频繁中间插入/删除已知位置**且**元素很大**（如 1KB）时，list 才可能更优。

### Q3：unordered_map 为什么会有最坏 O(n)？

> 如果哈希函数设计不好（所有 key 都映射到同一个桶），退化为单链表。攻击者可构造**哈希冲突 DoS**（HashDoS）。Java 8 起，链表长度超过 8 会转红黑树，最坏 O(log n)。

### Q4：map 的 lower_bound / upper_bound 是什么？

```cpp
std::map<int, std::string> m = {{1,"a"}, {3,"b"}, {5,"c"}, {7,"d"}};

auto it1 = m.lower_bound(3);   // 第一个 >= 3 的元素：{3,"b"}
auto it2 = m.upper_bound(3);   // 第一个 > 3 的元素：{5,"c"}

// 找 [3, 7] 范围的所有元素
for (auto it = m.lower_bound(3); it != m.upper_bound(7); ++it) {
    std::cout << it->second << " ";   // b c d
}
```

### Q5：deque 为什么支持随机访问？

> 底层是"指针数组（map）+ 多个固定大小块"。给定下标 i：
> 1. `block_idx = (i + offset) / block_size`
> 2. `inner_idx = (i + offset) % block_size`
> 3. `value = map[block_idx][inner_idx]`
>
> 比 vector 多一次解引用，但仍是 O(1)。

### Q6：reserve 后 size 是几？

> `reserve(n)` **只改 capacity，不改 size**。要变 size 用 `resize(n)`。常见错误是 reserve 后直接 `v[i]`，越界 UB。

---

## 十一、C++17/20 新增容器

### 11.1 std::optional

```cpp
std::optional<int> find(int key) {
    if (map.count(key)) return map[key];
    return std::nullopt;
}

auto v = find(42);
if (v) std::cout << *v << "\n";
```

### 11.2 std::variant

```cpp
std::variant<int, double, std::string> v;
v = 42;
v = 3.14;
v = "hello";

std::visit([](auto&& x) { std::cout << x << "\n"; }, v);
```

### 11.3 std::any

```cpp
std::any a = 42;
a = "hello";
a = std::vector<int>{1, 2, 3};

if (a.type() == typeid(std::vector<int>)) {
    auto& v = std::any_cast<std::vector<int>&>(a);
}
```

### 11.4 std::string_view（C++17）

```cpp
void print(std::string_view sv) {   // 不拷贝，O(1) 切片
    std::cout << sv << "\n";
}

print("hello");              // C 风格字符串
print(std::string("hello")); // std::string
print(sv.substr(1, 3));      // O(1) 子串
```

**注意**：string_view 不拥有内存，**不能保留指向临时对象的 string_view**。

---

## 十二、延伸阅读

- [C++ 语言核心八股](/posts/八股文-2-cpp-core)
- [高并发复合容器设计](/posts/八股文-4-high-concurrency-containers)
- [LRU 缓存 + 最小栈 + Trie + 滑动窗口最大值](/posts/leetcode-design)

---

> STL 的设计哲学是"零开销抽象"：你不需要为没用到的东西付费。选容器时，先问"我要什么操作最快"，再问"内存能不能接受"。
