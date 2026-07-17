---
title: LeetCode 中等题集锦：二叉树 3 题
date: 2026-06-17
tags:
  - 算法
  - LeetCode
description: 二叉树层序遍历 + 最近公共祖先 + 验证二叉搜索树 — 二叉树高频中等题的 C++ 解法与递归 / 迭代套路
category: 算法
---

# LeetCode 中等题集锦：二叉树 3 题

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 102 | 二叉树层序遍历 | 中 | BFS + 队列 |
| 236 | 二叉树的最近公共祖先 | 中 | 递归后序 |
| 98 | 验证二叉搜索树 | 中 | 中序遍历 / 区间递归 |

---

## 一、二叉树层序遍历（LeetCode 102）

### 题目

给你二叉树的根节点 `root`，返回其节点值的**层序遍历**（即逐层从左到右访问）。

**示例**：

```
输入：root = [3, 9, 20, null, null, 15, 7]
输出：[[3], [9, 20], [15, 7]]
```

### 思路

**核心**：BFS + 队列，每层一组。

1. 根节点入队
2. 队列非空时，记录当前层节点数 `size`
3. 取出 `size` 个节点，把它们的值加入当前层 vector，子节点入队
4. 当前层 vector 加入结果

### C++ 实现

```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> result;
        if (!root) return result;
        
        queue<TreeNode*> q;
        q.push(root);
        
        while (!q.empty()) {
            int size = q.size();  // 当前层节点数
            vector<int> level;
            level.reserve(size);
            
            for (int i = 0; i < size; ++i) {
                TreeNode* node = q.front();
                q.pop();
                level.push_back(node->val);
                
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            
            result.push_back(std::move(level));
        }
        
        return result;
    }
};
```

### 复杂度

- 时间：O(n)
- 空间：O(n)（最坏一层有 n/2 个节点）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 没记录 `size`，循环中 `q.size()` 变化 | 层间混乱 | 用 `int size = q.size()` 固定 |
| 用 `pop()` 前不判 `empty()` | UB（空队列 front） | while 条件保证非空 |
| 忘记判 left/right 空 | nullptr 入队 | 每次入队前判空 |

### 拓展

- **自底向上层序**：最后 `reverse(result.begin(), result.end())`
- **锯齿形层序（LeetCode 103）**：奇数层正向，偶数层反向
- **右视图（LeetCode 199）**：每层取最后一个节点

---

## 二、二叉树的最近公共祖先（LeetCode 236）

### 题目

给定一个二叉树，找到该树中两个指定节点的最近公共祖先（LCA）。

**最近公共祖先**：对于两个节点 p 和 q，LCA 是离根最远的节点 x，使得 p 和 q 都是 x 的后代（允许 x 是 p 或 q 自己）。

### 思路

**核心**：递归后序遍历。

**递归定义**：

- 如果当前节点是 `nullptr`、`p` 或 `q`，直接返回当前节点
- 递归左右子树：
  - 左右都返回非空 → 当前节点就是 LCA
  - 只有一边非空 → LCA 在那边
  - 两边都空 → 当前子树没有 p 和 q

### C++ 实现

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (!root || root == p || root == q) {
            return root;
        }
        
        TreeNode* left = lowestCommonAncestor(root->left, p, q);
        TreeNode* right = lowestCommonAncestor(root->right, p, q);
        
        if (left && right) {
            return root;  // p 和 q 分别在左右子树
        }
        return left ? left : right;  // 都在一侧
    }
};
```

### 复杂度

- 时间：O(n)
- 空间：O(h)（递归栈，h 是树高）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 边界 `root == p` 漏判 | 不允许 p 自己作为祖先 | 题目允许，要判 |
| 递归终止条件错 | 死循环 / 栈溢出 | `!root || root == p || root == q` |
| 假设树是 BST | 用错算法 | 本题是普通二叉树 |

### 拓展

- **BST 的 LCA（LeetCode 235）**：利用 BST 性质，比当前小走左，比当前大走右
- **多个节点的 LCA**：把两两求 LCA 扩展，或者用 Tarjan 算法

---

## 三、验证二叉搜索树（LeetCode 98）

### 题目

给你一个二叉树的根节点 `root`，判断其是否是一个有效的二叉搜索树（BST）。

**BST 定义**：

- 节点的左子树只包含**小于**当前节点的数
- 节点的右子树只包含**大于**当前节点的数
- 所有左子树和右子树自身也必须是 BST

### 思路（方案 1：中序遍历）

BST 中序遍历的结果**严格递增**。把中序结果存下来，检查是否递增即可。

**优化**：不用存全部，只记录前一个节点的值，比较是否严格小于当前。

### 思路（方案 2：区间递归）

每个节点有一个合法值区间：

- 根节点：`(INT_MIN, INT_MAX)`
- 左子节点：`(lower_bound, root->val)`
- 右子节点：`(root->val, upper_bound)`

递归判断每个节点是否在其区间内。

### C++ 实现（中序遍历）

```cpp
class Solution {
public:
    bool isValidBST(TreeNode* root) {
        TreeNode* prev = nullptr;
        return inorder(root, prev);
    }
    
private:
    bool inorder(TreeNode* node, TreeNode*& prev) {
        if (!node) return true;
        
        if (!inorder(node->left, prev)) return false;
        
        // 当前节点必须大于前一个
        if (prev && node->val <= prev->val) return false;
        prev = node;
        
        return inorder(node->right, prev);
    }
};
```

### C++ 实现（区间递归）

```cpp
class Solution {
public:
    bool isValidBST(TreeNode* root) {
        return validate(root, nullptr, nullptr);
    }
    
private:
    bool validate(TreeNode* node, TreeNode* low, TreeNode* high) {
        if (!node) return true;
        
        if (low && node->val <= low->val) return false;
        if (high && node->val >= high->val) return false;
        
        return validate(node->left, low, node) && 
               validate(node->right, node, high);
    }
};
```

### 复杂度

| 方案 | 时间 | 空间 |
| --- | --- | --- |
| 中序遍历 | O(n) | O(h) |
| 区间递归 | O(n) | O(h) |

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 只比较节点和左右孩子 | 漏判"左子树最大值 < 根 < 右子树最小值" | 用区间或中序 |
| `node->val <= prev->val` 写成 `<` | 重复值被判定为合法 | BST 要求严格递增，必须 `<=` |
| 用 `INT_MIN / INT_MAX` 当边界 | 节点值等于 INT_MIN 时误判 | 用 `TreeNode*` 当边界 |

## 四、二叉树套路总结

### 何时用递归 vs 迭代

| 场景 | 推荐 |
| --- | --- |
| DFS / 后序 / 子树问题 | 递归（代码简洁） |
| BFS / 层序 | 迭代 + 队列 |
| 路径问题（根到叶） | 递归 + 回溯 |
| 序列化 / 反序列化 | 递归 / 迭代都可 |

### 递归三要素

1. **终止条件**：`!root` 返回什么
2. **递归调用**：左右子树
3. **合并结果**：当前节点的处理逻辑

### 常见递归模式

```cpp
// 模板 1：判断性问题
bool dfs(TreeNode* node) {
    if (!node) return true;  // 终止
    if (!dfs(node->left)) return false;
    if (!dfs(node->right)) return false;
    return /* 当前节点判断 */;
}

// 模板 2：路径和
int dfs(TreeNode* node, int target) {
    if (!node) return 0;
    // 处理当前...
    return dfs(node->left, ...) + dfs(node->right, ...);
}

// 模板 3：LCA 风格
TreeNode* dfs(TreeNode* node, ...) {
    if (!node || node == target) return node;
    auto left = dfs(node->left, ...);
    auto right = dfs(node->right, ...);
    if (left && right) return node;
    return left ? left : right;
}
```

## 五、延伸阅读

- [LeetCode 中等题集锦：链表经典 4 题](/posts/leetcode-linked-list)
- [LeetCode 中等题集锦：回溯 3 道](/posts/leetcode-backtracking)
- [LeetCode 中等题集锦：动态规划 4 道](/posts/leetcode-dp)

---

> 二叉树题的核心是**递归思维**：把问题分解成"当前节点 + 左子树 + 右子树"，剩下交给递归。
