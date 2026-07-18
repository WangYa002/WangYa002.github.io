---
title: 数据结构进阶八股
date: 2026-07-18
tags:
  - 数据结构
  - 八股文
  - C++
description: 并查集 + 位运算 + 拓扑排序 + AVL 红黑树 B+ 树对比 + Trie 字典树
category: 八股文
---

# 数据结构进阶八股

> 跳出 LeetCode 算法题，本文聚焦"面试中作为八股考的高级数据结构"：并查集、平衡树家族、位运算技巧、拓扑排序。每个都讲原理 + 实现 + 应用。

---

## 一、并查集（Union-Find）

### 1.1 应用场景

判定"连通性"问题：
- 等价类划分
- 最小生成树（Kruskal 算法）
- 网络连通性
- 题目：LeetCode 200 岛屿数量、547 省份数量、684 冗余连接

### 1.2 基本实现

```cpp
class UnionFind {
    std::vector<int> parent_;
    
public:
    UnionFind(int n) : parent_(n) {
        for (int i = 0; i < n; ++i) parent_[i] = i;
    }
    
    int find(int x) {
        while (x != parent_[x]) {
            x = parent_[x];
        }
        return x;
    }
    
    void unite(int x, int y) {
        int px = find(x), py = find(y);
        if (px != py) parent_[px] = py;
    }
    
    bool connected(int x, int y) {
        return find(x) == find(y);
    }
};
```

**复杂度**：find/unite 都是 O(n) 最坏（链式退化为单链表）。

### 1.3 路径压缩（Path Compression）

```cpp
// 递归版：find 同时把路径上所有节点直接挂到根
int find(int x) {
    if (x != parent_[x]) {
        parent_[x] = find(parent_[x]);   // 路径压缩
    }
    return parent_[x];
}

// 迭代版（避免栈溢出）
int find(int x) {
    int root = x;
    while (root != parent_[root]) root = parent_[root];
    while (x != root) {                  // 第二遍：压缩路径
        int next = parent_[x];
        parent_[x] = root;
        x = next;
    }
    return root;
}
```

### 1.4 按秩合并（Union by Rank）

```cpp
class UnionFind {
    std::vector<int> parent_, rank_;
    
public:
    UnionFind(int n) : parent_(n), rank_(n, 0) {
        for (int i = 0; i < n; ++i) parent_[i] = i;
    }
    
    int find(int x) {
        if (x != parent_[x]) parent_[x] = find(parent_[x]);
        return parent_[x];
    }
    
    void unite(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return;
        
        // 把矮的挂到高的下面
        if (rank_[px] < rank_[py]) parent_[px] = py;
        else if (rank_[px] > rank_[py]) parent_[py] = px;
        else {
            parent_[py] = px;
            rank_[px]++;                 // 同高，挂后高度+1
        }
    }
};
```

### 1.5 复杂度

| 优化 | find | unite |
| --- | --- | --- |
| 无 | O(n) | O(n) |
| 仅路径压缩 | 摊还 O(log n) | 摊还 O(log n) |
| 仅按秩合并 | O(log n) | O(log n) |
| **两者结合** | **O(α(n)) ≈ O(1)** | **O(α(n))** |

α(n) 是反阿克曼函数，对任何实际 n（< 10⁸⁰）都 ≤ 4，可视为常数。

### 1.6 应用：带权并查集

题目：给定 `a / b = 3`、`b / c = 2`，求 `a / c = ?`

```cpp
class WeightedUF {
    std::vector<int> parent_;
    std::vector<double> weight_;   // weight_[x] = x / parent_[x]
    
public:
    WeightedUF(int n) : parent_(n), weight_(n, 1.0) {
        for (int i = 0; i < n; ++i) parent_[i] = i;
    }
    
    int find(int x) {
        if (x != parent_[x]) {
            int root = find(parent_[x]);
            weight_[x] *= weight_[parent_[x]];   // 累积权值
            parent_[x] = root;
        }
        return parent_[x];
    }
    
    // 联合，已知 x / y = value
    void unite(int x, int y, double value) {
        int px = find(x), py = find(y);
        if (px == py) return;
        // x / px = weight_[x]
        // y / py = weight_[y]
        // x / y = value
        // 所以 px / py = (px/x) * (x/y) * (y/py) = (1/wx) * value * wy
        parent_[px] = py;
        weight_[px] = weight_[y] * value / weight_[x];
    }
    
    double query(int x, int y) {
        if (find(x) != find(y)) return -1.0;
        // x / y = (x/px) / (y/py) = weight_[x] / weight_[y]
        return weight_[x] / weight_[y];
    }
};
```

---

## 二、位运算技巧

### 2.1 常用位运算操作

```cpp
int x = 42;   // 二进制：101010

x & 1;              // 判断奇偶（0 偶 1 奇）
x >> 1;             // 除以 2（向下取整）
x << 1;             // 乘以 2
x & (x - 1);        // 消除最低位的 1（判断是否 2 的幂）
x ^ x;              // 异或自身 = 0
x ^ 0;              // 异或 0 = 自身
x ^ y ^ x;          // = y（异或的交换律）
```

### 2.2 异或的经典应用

**LeetCode 136：只出现一次的数字**

```cpp
// 除了某个元素出现一次外，其他都出现两次
int singleNumber(vector<int>& nums) {
    int result = 0;
    for (int x : nums) result ^= x;   // a ^ a = 0
    return result;
}
```

**LeetCode 137：其他出现 3 次**

```cpp
// 设计"出现 3 次自动归零"的状态机
int singleNumber(vector<int>& nums) {
    int a = 0, b = 0;
    for (int x : nums) {
        b = (b ^ x) & ~a;
        a = (a ^ x) & ~b;
    }
    return b;
}
```

### 2.3 Brian Kernighan 算法

**统计 1 的个数**：

```cpp
int popcount(uint32_t n) {
    int count = 0;
    while (n) {
        n &= (n - 1);   // 消除最低位的 1
        count++;
    }
    return count;
}
```

每次循环消除一个 1，循环次数等于 1 的个数。

**判断 2 的幂**：

```cpp
bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}
```

`8 & 7 = 1000 & 0111 = 0`，所以 8 是 2 的幂。

### 2.4 区间按位与

**LeetCode 201：[left, right] 按位与**

```cpp
// 暴力 O(n)
int brute(left, right) {
    int result = left;
    for (int i = left + 1; i <= right; ++i) result &= i;
    return result;
}

// 优化：找公共前缀
int rangeBitwiseAnd(int left, int right) {
    while (left < right) {
        right &= (right - 1);   // 消除 right 最低位 1
    }
    return right;
}
```

**原理**：区间内有 2 的幂，按位与必然是 0。最终保留的是 left 和 right 的公共前缀。

### 2.5 位运算实现加法

```cpp
int getSum(int a, int b) {
    while (b != 0) {
        int carry = (unsigned)(a & b) << 1;   // 进位
        a = a ^ b;                              // 无进位加法
        b = carry;
    }
    return a;
}
```

### 2.6 C++20 `<bit>` 头文件

```cpp
#include <bit>

std::popcount(0b1011u);     // 3（1 的个数）
std::countl_zero(0b0001u);  // 31（前导 0）
std::countr_zero(0b1000u);  // 3（末尾 0）
std::has_single_bit(8u);    // true（是否 2 的幂）
std::bit_ceil(5u);          // 8（≥5 的最小 2 的幂）
std::bit_floor(5u);         // 4（≤5 的最大 2 的幂）
std::bit_width(5u);         // 3（表示 5 需要的位数）
```

---

## 三、拓扑排序

### 3.1 应用场景

- 课程依赖（LeetCode 207/210）
- 编译依赖
- 任务调度
- DAG（有向无环图）最短路径前置

### 3.2 BFS 实现（Kahn 算法）

```cpp
bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<int> indegree(numCourses, 0);
    vector<vector<int>> graph(numCourses);
    
    // 构建图 + 入度
    for (auto& p : prerequisites) {
        graph[p[1]].push_back(p[0]);   // p[1] → p[0]
        indegree[p[0]]++;
    }
    
    // 入度为 0 的入队
    queue<int> q;
    for (int i = 0; i < numCourses; ++i) {
        if (indegree[i] == 0) q.push(i);
    }
    
    int count = 0;
    while (!q.empty()) {
        int course = q.front();
        q.pop();
        count++;
        
        for (int next : graph[course]) {
            if (--indegree[next] == 0) {
                q.push(next);
            }
        }
    }
    
    return count == numCourses;   // 是否所有课都修完
}
```

**复杂度**：O(V + E)，V 是节点数，E 是边数。

### 3.3 DFS 实现

```cpp
bool canFinish(int n, vector<vector<int>>& prereq) {
    vector<vector<int>> graph(n);
    for (auto& p : prereq) graph[p[1]].push_back(p[0]);
    
    vector<int> state(n, 0);   // 0 未访问，1 访问中，2 已完成
    
    function<bool(int)> dfs = [&](int u) -> bool {
        if (state[u] == 1) return false;   // 环！
        if (state[u] == 2) return true;
        
        state[u] = 1;
        for (int v : graph[u]) {
            if (!dfs(v)) return false;
        }
        state[u] = 2;
        return true;
    };
    
    for (int i = 0; i < n; ++i) {
        if (!dfs(i)) return false;   // 有环
    }
    return true;
}
```

### 3.4 BFS vs DFS 对比

| 对比 | BFS（Kahn） | DFS |
| --- | --- | --- |
| 实现 | 入度数组 + 队列 | 三色标记法 |
| 适合场景 | 求拓扑序列 | 判环 |
| 空间 | O(V + E) | O(V + E) + 递归栈 |
| 拓扑序列 | 自然得到（队列出队顺序） | 需要逆后序 |

---

## 四、AVL 树 vs 红黑树 vs B 树 vs B+ 树

### 4.1 AVL 树

**性质**：任意节点左右子树高度差 ≤ 1。

**4 种失衡情况**：

| 失衡类型 | 描述 | 修复 |
| --- | --- | --- |
| **LL** | 左孩子的左子树插入 | 一次右旋 |
| **RR** | 右孩子的右子树插入 | 一次左旋 |
| **LR** | 左孩子的右子树插入 | 先左旋左孩子，再右旋 |
| **RL** | 右孩子的左子树插入 | 先右旋右孩子，再左旋 |

```cpp
// 右旋
Node* rotateRight(Node* y) {
    Node* x = y->left;
    y->left = x->right;
    x->right = y;
    updateHeight(y);
    updateHeight(x);
    return x;       // x 成为新根
}
```

### 4.2 红黑树

**5 大性质**（口诀：左根右、根叶黑、不红红、黑路同）：
1. 节点是红色或黑色
2. 根节点是黑色
3. 叶子节点（NIL）是黑色
4. 不能有连续的两个红色节点
5. 任意节点到叶子节点的所有路径，包含相同数量的黑色节点

**结论**：最长路径不超过最短路径的 2 倍。

**插入规则**：
- 新节点默认红色
- 如果是根：变黑
- 如果叔叔是红色：父叔爷变色，爷爷当作新插入节点继续处理
- 如果叔叔是黑色：LL/RR/LR/RL 旋转 + 变色

### 4.3 AVL vs 红黑树

| 维度 | AVL 树 | 红黑树 |
| --- | --- | --- |
| 平衡严格度 | 高（高度差 ≤ 1） | 低（最长 ≤ 2×最短） |
| 查找性能 | 略好（树更矮） | 略差 |
| 插入旋转次数 | 多 | 少（最多 2 次） |
| 删除旋转次数 | 多（O(log n)） | 少（最多 3 次） |
| 适用场景 | 查询密集 | 增删频繁 |
| 实际应用 | Windows 进程地址空间 | STL map/set、Linux CFS |

**为什么 STL 用红黑树不用 AVL**：增删操作时红黑树旋转次数更少，整体性能更均衡。

### 4.4 B 树

**性质**（m 阶 B 树）：
- 每个节点最多 m 个子节点，m-1 个关键字
- 根至少 2 个子节点
- 非根非叶至少 ⌈m/2⌉ 个子节点
- 所有叶节点在同一层

```text
3 阶 B 树：
            [10 | 20]
           /    |    \
      [1,5]  [15]   [25,30,35]
```

**特点**：
- 多叉平衡，专为磁盘设计
- 节点大小 = 磁盘块大小（4KB 或 16KB）
- 单次 I/O 读一整块，效率高

### 4.5 B+ 树（MySQL InnoDB）

**B+ 树 vs B 树区别**：

| 对比 | B 树 | B+ 树 |
| --- | --- | --- |
| 数据存储 | 所有节点都存数据 | **只有叶节点存数据** |
| 关键字数 | m 个分支 m-1 个 | **m 个分支 m 个关键字** |
| 范围查询 | 不支持（要遍历树） | **支持**（叶节点链表） |
| 非叶节点作用 | 索引 + 数据 | 仅索引 |

```text
3 阶 B+ 树：
            [10 | 20]            ← 仅索引
           /    |    \
      [1,5,10] [15,20] [25,30]   ← 叶节点存数据，且互相链表连接
        ↕        ↕        ↕
```

**B+ 树在 MySQL 中的优势**：
1. 非叶节点不存数据 → 单节点更多 key → 树更矮 → I/O 更少
2. 叶节点链表 → 范围查询（BETWEEN、IN）极快
3. 3 层 B+ 树可存 2000 万+ 行（详见 [MySQL 八股](/posts/八股文-7-mysql-debug)）

---

## 五、Trie 字典树

### 5.1 基本结构

```cpp
class Trie {
    struct Node {
        Node* children[26] = {nullptr};
        bool is_end = false;
    };
    Node* root_ = new Node;
    
public:
    void insert(const string& word) {
        Node* cur = root_;
        for (char c : word) {
            int idx = c - 'a';
            if (!cur->children[idx]) {
                cur->children[idx] = new Node;
            }
            cur = cur->children[idx];
        }
        cur->is_end = true;
    }
    
    bool search(const string& word) {
        Node* node = find(word);
        return node && node->is_end;
    }
    
    bool startsWith(const string& prefix) {
        return find(prefix) != nullptr;
    }
    
private:
    Node* find(const string& s) {
        Node* cur = root_;
        for (char c : s) {
            int idx = c - 'a';
            if (!cur->children[idx]) return nullptr;
            cur = cur->children[idx];
        }
        return cur;
    }
};
```

### 5.2 复杂度

| 操作 | 时间 | 空间 |
| --- | --- | --- |
| `insert(word)` | O(m) | O(m)，m 是 word 长度 |
| `search(word)` | O(m) | O(1) |
| `startsWith(prefix)` | O(m) | O(1) |

总空间：O(所有单词长度 × 字母表大小)。

### 5.3 应用场景

- **搜索引擎自动补全**
- **IP 路由表查找**（Longest Prefix Match）
- **拼写检查**
- **DNS 解析**
- **De-duplication**：快速判断字符串是否出现过

### 5.4 优化：压缩 Trie / Radix Tree

普通 Trie 对单链路径浪费空间。压缩 Trie 把单链合并成一个节点：

```text
普通 Trie（"apple", "app"）：
root → a → p → p → l → e (end)
              ↘ (end)

压缩 Trie：
root → "app" → "le" (end)
        ↘ (end)
```

Linux 内核用 Radix Tree 管理 ID_radix（如页表），MySQL InnoDB 自适应哈希也参考类似思想。

---

## 六、堆（Heap）

### 6.1 二叉堆性质

- 完全二叉树
- 父节点 ≥ 子节点（大顶堆）或 ≤ 子节点（小顶堆）
- 用数组存储：第 i 个节点的父是 `(i-1)/2`，子是 `2i+1` 和 `2i+2`

### 6.2 C++ priority_queue

```cpp
// 默认大顶堆
std::priority_queue<int> maxHeap;

// 小顶堆
std::priority_queue<int, std::vector<int>, std::greater<int>> minHeap;

// 自定义比较
struct Cmp {
    bool operator()(const pair<int,int>& a, const pair<int,int>& b) {
        return a.second > b.second;   // 按 second 升序
    }
};
std::priority_queue<pair<int,int>, std::vector<pair<int,int>>, Cmp> pq;
```

### 6.3 Top-K 问题模板

```cpp
// 求前 K 大的元素：维护大小为 K 的小顶堆
vector<int> topK(vector<int>& nums, int k) {
    std::priority_queue<int, vector<int>, greater<int>> minHeap;
    
    for (int x : nums) {
        minHeap.push(x);
        if ((int)minHeap.size() > k) {
            minHeap.pop();   // 弹出最小的
        }
    }
    
    vector<int> result;
    while (!minHeap.empty()) {
        result.push_back(minHeap.top());
        minHeap.pop();
    }
    return result;
}
```

**复杂度**：O(n log K)，比排序 O(n log n) 快。

### 6.4 堆排序

```cpp
void heapSort(vector<int>& nums) {
    int n = nums.size();
    
    // 建堆：从最后一个非叶节点开始下沉
    for (int i = n / 2 - 1; i >= 0; --i) {
        siftDown(nums, i, n);
    }
    
    // 反复取堆顶
    for (int i = n - 1; i > 0; --i) {
        std::swap(nums[0], nums[i]);
        siftDown(nums, 0, i);
    }
}

void siftDown(vector<int>& nums, int i, int n) {
    while (2 * i + 1 < n) {
        int child = 2 * i + 1;
        if (child + 1 < n && nums[child] < nums[child + 1]) child++;
        if (nums[i] >= nums[child]) break;
        std::swap(nums[i], nums[child]);
        i = child;
    }
}
```

**复杂度**：时间 O(n log n)，空间 O(1)，**不稳定**。

---

## 七、面试高频追问链

### Q1：并查集的"路径压缩"为什么摊还 O(1)？

> 路径压缩 + 按秩合并的并查集，单次操作的均摊复杂度是 O(α(n))，其中 α 是反阿克曼函数。对 n < 10⁸⁰，α(n) < 5，可视为常数。证明用到了 Ackermann 函数的反函数性质。

### Q2：AVL 树为什么没有 STL 用？

> AVL 严格平衡（高度差 ≤ 1），查询略快但增删需要更多旋转。STL 选择了红黑树，因为：1) 增删性能更好（旋转次数有上限）；2) 整体性能均衡（查询不慢太多，增删快很多）。

### Q3：B 树和 B+ 树哪个更适合数据库？

> B+ 树。原因：1) 非叶节点不存数据，单节点更多 key，树更矮；2) 叶节点链表，范围查询极快；3) 数据全在叶节点，扫描数据时缓存命中率高。

### Q4：为什么 InnoDB 用 B+ 树而不是哈希表？

> 哈希表 O(1) 但**不支持范围查询**（`WHERE id > 100`、`BETWEEN`、`ORDER BY`）。B+ 树 O(log n) 但叶节点链表让范围查询变成顺序扫描，整体更快。InnoDB 提供"自适应哈希索引"作为 B+ 树的加速层，自动给热点页建哈希。

### Q5：Trie 在什么场景下不如哈希表？

> - 短字符串、字母表大（如中文）：Trie 节点数爆炸
> - 不需要前缀/范围查询：哈希表 O(1) 更快
> - 内存敏感：Trie 节点指针开销大

### Q6：堆和二叉搜索树的区别？

> - **堆**：父节点与子节点有大小关系，但**左右子节点无大小关系**。查询最值 O(1)，找任意元素 O(n)。
> - **BST**：左 < 根 < 右，中序遍历有序。查询最值 O(log n)，找任意元素 O(log n)。
> 
> 堆适合"频繁取最值"（优先队列），BST 适合"频繁查找"。

### Q7：拓扑排序能处理带权图吗？

> 拓扑排序本身只关心先后顺序，与权值无关。但 DAG 上的"最长/最短路径"算法（如关键路径 CPM）需要先拓扑排序，再按拓扑序松弛边。时间复杂度 O(V + E)，比 Dijkstra 快。

---

## 八、延伸阅读

- [STL 容器底层剖析](/posts/八股文-3-stl-containers)
- [MySQL 与调试工具链](/posts/八股文-7-mysql-debug)
- [LeetCode 中等题集锦：数据结构设计](/posts/leetcode-design)
- [LeetCode 中等题集锦：搜索与排序](/posts/leetcode-search-sort)

---

> 数据结构是"工具箱"。题目千变万化，但能用的工具就那几个：链表、树、图、堆、哈希。每个工具的死穴（如红黑树的旋转规则、B+ 树的页结构）就是面试考的核心。
