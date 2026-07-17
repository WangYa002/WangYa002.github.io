---
title: LeetCode 中等题集锦：数据结构设计
date: 2026-06-20
tags:
  - 算法
  - LeetCode
description: LRU 缓存 + 最小栈 + Trie 前缀树 + 滑动窗口最大值 — C++ 后端面试高频数据结构设计题
category: 算法
---

# LeetCode 中等题集锦：数据结构设计

> 数据结构设计是 C++ 后端面试的高频考点。本文覆盖 4 道经典题：LRU 缓存、最小栈、Trie、滑动窗口最大值。

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 146 | LRU 缓存 | 中 | 哈希表 + 双向链表 |
| 155 | 最小栈 | 中 | 辅助栈 |
| 208 | 实现 Trie | 中 | 前缀树 |
| 239 | 滑动窗口最大值 | 中 | 单调队列 |

---

## 一、LRU 缓存（LeetCode 146）

### 题目

请你设计并实现一个 **LRU（Least Recently Used）缓存** 机制。实现：

- `LRUCache(int capacity)`：初始化容量
- `int get(int key)`：返回 `key` 对应的 `value`，不存在返回 `-1`
- `void put(int key, int value)`：插入 / 更新键值对。如果容量超限，淘汰最久未使用的 key

要求 `get` 和 `put` 都是 **O(1)** 平均时间复杂度。

### 思路

**核心**：哈希表 + 双向链表。

- 哈希表：`key → 链表节点`，O(1) 查找
- 双向链表：维护访问顺序，头是最近访问，尾是最久未访问

**操作**：

- `get(key)`：哈希表查到节点，移动到链表头
- `put(key, value)`：
  - 若 key 存在：更新 value，移动到头
  - 若 key 不存在：新建节点插入头部，超容则删除尾部

### C++ 实现

```cpp
class LRUCache {
private:
    struct Node {
        int key, value;
        Node* prev;
        Node* next;
        Node(int k = 0, int v = 0) : key(k), value(v), prev(nullptr), next(nullptr) {}
    };
    
    int capacity_;
    unordered_map<int, Node*> map_;
    Node* head_;  // 哨兵头
    Node* tail_;  // 哨兵尾
    
    void remove(Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }
    
    void addToFront(Node* node) {
        node->next = head_->next;
        node->prev = head_;
        head_->next->prev = node;
        head_->next = node;
    }
    
public:
    LRUCache(int capacity) : capacity_(capacity) {
        head_ = new Node();
        tail_ = new Node();
        head_->next = tail_;
        tail_->prev = head_;
    }
    
    int get(int key) {
        auto it = map_.find(key);
        if (it == map_.end()) return -1;
        
        Node* node = it->second;
        remove(node);
        addToFront(node);
        return node->value;
    }
    
    void put(int key, int value) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            // 已存在：更新 value，移到头
            Node* node = it->second;
            node->value = value;
            remove(node);
            addToFront(node);
            return;
        }
        
        // 不存在：新建
        Node* new_node = new Node(key, value);
        map_[key] = new_node;
        addToFront(new_node);
        
        // 超容：删除尾部
        if (map_.size() > capacity_) {
            Node* lru = tail_->prev;
            remove(lru);
            map_.erase(lru->key);
            delete lru;
        }
    }
};
```

### 复杂度

- `get` / `put`：O(1)
- 空间：O(capacity)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 用 `std::list` 但迭代器失效 | 难维护 map 映射 | 自己实现双向链表 |
| 忘了删除尾部时 erase map | map 与链表不一致 | 删节点时同步 `map_.erase` |
| 哨兵节点没初始化 prev/next | 空指针异常 | 构造时连好 head <-> tail |

### 拓展

- **LFU（Least Frequently Used）**：加一个频次维度，更复杂
- **LRU-K**：考虑最近 K 次访问

---

## 二、最小栈（LeetCode 155）

### 题目

设计一个**栈**，支持 `push` / `pop` / `top` 操作，并能在 **O(1)** 时间内检索到栈中最小元素。

### 思路

**核心**：辅助栈同步记录最小值。

- 主栈：正常 push/pop
- 辅助栈：push 时记录"当前栈的最小值"

### C++ 实现

```cpp
class MinStack {
private:
    stack<int> main_stack_;
    stack<int> min_stack_;  // 同步记录每层最小值
    
public:
    MinStack() {
        // min_stack 初始放一个"无穷大"哨兵
        min_stack_.push(INT_MAX);
    }
    
    void push(int val) {
        main_stack_.push(val);
        min_stack_.push(min(val, min_stack_.top()));
    }
    
    void pop() {
        main_stack_.pop();
        min_stack_.pop();
    }
    
    int top() {
        return main_stack_.top();
    }
    
    int getMin() {
        return min_stack_.top();
    }
};
```

### 复杂度

- 所有操作：O(1)
- 空间：O(n)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 用一个变量记 min，pop 后不更新 | min 错误 | 必须用辅助栈同步 |
| 辅助栈只在更小时 push | pop 时漏更新 | 每层都记录，pop 同步 |
| 没初始化 min_stack 哨兵 | 第一次 push 时 top() 空栈 UB | push INT_MAX 哨兵 |

---

## 三、实现 Trie 前缀树（LeetCode 208）

### 题目

**Trie**（发音 "try"）是一种树形数据结构，用于高效存储和检索字符串。实现 `Trie` 类：

- `insert(word)`：插入单词
- `search(word)`：完整单词是否存在
- `startsWith(prefix)`：是否有单词以 `prefix` 开头

### 思路

每个节点有 26 个子指针（对应 a-z）和一个 `is_end` 标记。

```
        root
       / | \
      a  b  c
      |  |  |
      p  e  a
      |  |  |
      p  e  t
     /|  
    l r
    |
    e
```

插入 "apple"、"bear"、"cat" 后的样子。

### C++ 实现

```cpp
class Trie {
private:
    struct TrieNode {
        TrieNode* children[26] = {nullptr};
        bool is_end = false;
    };
    
    TrieNode* root_;
    
public:
    Trie() {
        root_ = new TrieNode();
    }
    
    void insert(string word) {
        TrieNode* cur = root_;
        for (char c : word) {
            int idx = c - 'a';
            if (!cur->children[idx]) {
                cur->children[idx] = new TrieNode();
            }
            cur = cur->children[idx];
        }
        cur->is_end = true;
    }
    
    bool search(string word) {
        TrieNode* node = findPrefix(word);
        return node != nullptr && node->is_end;
    }
    
    bool startsWith(string prefix) {
        return findPrefix(prefix) != nullptr;
    }
    
private:
    TrieNode* findPrefix(const string& s) {
        TrieNode* cur = root_;
        for (char c : s) {
            int idx = c - 'a';
            if (!cur->children[idx]) return nullptr;
            cur = cur->children[idx];
        }
        return cur;
    }
};
```

### 复杂度

| 操作 | 时间 | 备注 |
| --- | --- | --- |
| `insert(word)` | O(m) | m 是单词长度 |
| `search(word)` | O(m) | |
| `startsWith(prefix)` | O(m) | |

空间：O(N × m)，N 是单词数。

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| `search` 和 `startsWith` 用相同逻辑 | 误判前缀为完整单词 | `search` 检查 `is_end` |
| 用 `unordered_map<char, Node*>` | 性能稍差，但可处理任意字符 | 题目限定小写字母，用数组更快 |
| 忘了析构释放内存 | 内存泄漏 | 生产代码要 destructor 递归 delete |

### 应用场景

- **搜索引擎自动补全**
- **IP 路由表查找**（Longest Prefix Match）
- **拼写检查 / 智能纠错**
- **词典 / 拼词游戏**

---

## 四、滑动窗口最大值（LeetCode 239）

### 题目

给你一个整数数组 `nums`，有一个大小为 `k` 的滑动窗口从左到右移动。返回每个窗口中的最大值。

**示例**：

```
输入：nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3
输出：[3, 3, 5, 5, 6, 7]
```

### 思路

**核心**：单调递减队列（deque）。

队列存**下标**，保证队列 front 永远是当前窗口最大值的下标：

1. 入队时：从队尾弹出所有比当前元素小的（它们永远不会成为最大值）
2. 队首检查：如果队首下标已超出窗口（`front <= i - k`），弹出
3. 窗口形成后（`i >= k - 1`）：记录 `nums[front]`

### C++ 实现

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        vector<int> result;
        deque<int> dq;  // 存下标
        
        for (int i = 0; i < nums.size(); ++i) {
            // 队尾弹出所有比当前小的（维护单调递减）
            while (!dq.empty() && nums[dq.back()] < nums[i]) {
                dq.pop_back();
            }
            
            // 队首如果超出窗口，弹出
            if (!dq.empty() && dq.front() <= i - k) {
                dq.pop_front();
            }
            
            dq.push_back(i);
            
            // 窗口形成后记录最大值
            if (i >= k - 1) {
                result.push_back(nums[dq.front()]);
            }
        }
        
        return result;
    }
};
```

### 复杂度

- 时间：O(n)（每个元素入队出队各一次）
- 空间：O(k)（deque 最大长度）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 用优先队列 + 懒删除 | O(n log n) | 单调队列 O(n) |
| 队列存值不存下标 | 无法判断是否过期 | 存下标 |
| 队尾弹出条件 `<` vs `<=` | 重复值处理 | 用 `<` 保持稳定 |
| 队首过期判断条件 | 错位 | `dq.front() <= i - k` |

### 拓展

- **单调栈**：每日温度（LeetCode 739）、下一个更大元素
- **两个单调队列**：维护最大 + 最小（如滑动窗口最大最小差）

## 五、C++ 后端面试设计题套路

### 设计题考察维度

| 维度 | 考察点 |
| --- | --- |
| **数据结构选型** | 哈希表 vs 树 vs 堆 vs 链表 |
| **空间 / 时间权衡** | O(1) 时间通常 O(n) 空间 |
| **C++ STL 熟练度** | vector / map / unordered_map / list |
| **手写实现能力** | 不依赖 STL 时能否写出 |
| **边界条件** | 空容器、单元素、容量超限 |

### STL 选型表

| 需求 | 推荐 STL |
| --- | --- |
| O(1) 查找 | `unordered_map` / `unordered_set` |
| 有序遍历 | `map` / `set` |
| LRU / 频繁中间插入 | `std::list` |
| 单调队列 | `std::deque` |
| 优先队列 / TopK | `std::priority_queue` |
| 字符串前缀 | Trie 自实现 |

### 面试雷区

| 雷区 | 后果 |
| --- | --- |
| 用 STL 但不懂底层 | "为什么 list 是双向链表" 答不出 |
| 不会手写双向链表 | LRU 翻车 |
| 析构 / 内存管理忘 | C++ 题目必扣分 |
| 多线程场景未考虑 | 资深岗会被深挖 |

## 六、延伸阅读

- [LeetCode 中等题集锦：动态规划 4 道](/posts/leetcode-dp)
- [LeetCode 中等题集锦：搜索与排序](/posts/leetcode-search-sort)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)（ai_aas 实习中的 LRU 应用）

---

> 设计题的本质是**数据结构选型**：根据操作频率（get/put）、时间要求（O(1) vs O(log n)）、空间限制选最合适的组合。
