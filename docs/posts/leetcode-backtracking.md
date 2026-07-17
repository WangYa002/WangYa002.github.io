---
title: LeetCode 中等题集锦：回溯算法 3 题
date: 2026-06-18
tags:
  - 算法
  - LeetCode
description: 全排列 + 子集 + 组合总和 — 回溯算法高频中等题的 C++ 解法与剪枝套路
category: 算法
---

# LeetCode 中等题集锦：回溯算法 3 题

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 46 | 全排列 | 中 | 回溯 + used 数组 |
| 78 | 子集 | 中 | 回溯 / 位运算 |
| 39 | 组合总和 | 中 | 回溯 + 剪枝 |

---

## 一、全排列（LeetCode 46）

### 题目

给定一个**没有重复数字**的数组 `nums`，返回其所有可能的全排列。

**示例**：

```
输入：nums = [1, 2, 3]
输出：[[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
```

### 思路

**核心**：回溯 + used 数组。

每个位置选一个未使用的数，递归到下一层；撤销选择（回溯），尝试其他选项。

### C++ 实现

```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> result;
        vector<int> path;
        vector<bool> used(nums.size(), false);
        
        backtrack(nums, used, path, result);
        return result;
    }
    
private:
    void backtrack(const vector<int>& nums, vector<bool>& used,
                   vector<int>& path, vector<vector<int>>& result) {
        if (path.size() == nums.size()) {
            result.push_back(path);
            return;
        }
        
        for (int i = 0; i < nums.size(); ++i) {
            if (used[i]) continue;
            
            path.push_back(nums[i]);
            used[i] = true;
            
            backtrack(nums, used, path, result);
            
            path.pop_back();       // 回溯
            used[i] = false;
        }
    }
};
```

### 复杂度

- 时间：O(n × n!)，共 n! 个排列，每个拷贝 O(n)
- 空间：O(n)（递归栈 + used）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 忘了 `used[i] = false` | 全是相同排列 | 必须回溯 |
| 用 `swap` 方案时漏改 | 部分排列重复 | 推荐 `used` 数组方案 |
| 终止条件错 | 漏解 | `path.size() == nums.size()` |

### 拓展：全排列 II（含重复数字）

加去重：排序后跳过 `nums[i] == nums[i-1] && !used[i-1]` 的情况。

---

## 二、子集（LeetCode 78）

### 题目

给你一个**无重复元素**的整数数组 `nums`，返回该数组所有可能的子集（幂集）。解集不能包含重复的子集。

**示例**：

```
输入：nums = [1, 2, 3]
输出：[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
```

### 思路（方案 1：回溯）

每次选择"加入 / 不加入"当前元素。为了去重，固定**往后选**，不回头。

### 思路（方案 2：迭代）

从空集开始，每加一个元素，对已有所有子集追加该元素。

### 思路（方案 3：位运算）

n 个元素，子集数 = 2ⁿ。用 0 ~ 2ⁿ-1 的二进制位表示选 / 不选。

### C++ 实现（回溯）

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> result;
        vector<int> path;
        backtrack(nums, 0, path, result);
        return result;
    }
    
private:
    void backtrack(const vector<int>& nums, int start,
                   vector<int>& path, vector<vector<int>>& result) {
        result.push_back(path);  // 每个节点都是一个子集
        
        for (int i = start; i < nums.size(); ++i) {
            path.push_back(nums[i]);
            backtrack(nums, i + 1, path, result);  // 往后选
            path.pop_back();
        }
    }
};
```

### C++ 实现（位运算）

```cpp
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        int n = nums.size();
        int total = 1 << n;  // 2^n
        vector<vector<int>> result;
        
        for (int mask = 0; mask < total; ++mask) {
            vector<int> subset;
            for (int i = 0; i < n; ++i) {
                if (mask & (1 << i)) {
                    subset.push_back(nums[i]);
                }
            }
            result.push_back(std::move(subset));
        }
        
        return result;
    }
};
```

### 复杂度

- 时间：O(n × 2ⁿ)
- 空间：O(n)（递归栈 / path）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 用 `used` 数组 + 全选 | 子集会重复（顺序不同算同一子集） | 用 `start` 控制顺序 |
| 位运算 `1 << i` 写反 | 选错元素 | 第 i 位对应 nums[i] |
| 忘记加空集 | 漏解 | 回溯方案入口直接 push path |

---

## 三、组合总和（LeetCode 39）

### 题目

给你一个**无重复元素**的整数数组 `candidates` 和目标数 `target`，找出 `candidates` 中可以使数字之和为 `target` 的所有**组合**。同一个数字可以**无限次**选取。

**示例**：

```
输入：candidates = [2, 3, 6, 7], target = 7
输出：[[2,2,3], [7]]
```

### 思路

**核心**：回溯 + 剪枝。

1. 排序（便于剪枝）
2. 从 `start` 开始尝试每个数
3. 如果剩余 target < 当前数，break（剪枝）
4. 递归时 `start` 不变（可以重复选）

### C++ 实现

```cpp
class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());  // 排序便于剪枝
        
        vector<vector<int>> result;
        vector<int> path;
        backtrack(candidates, target, 0, path, result);
        return result;
    }
    
private:
    void backtrack(const vector<int>& candidates, int remain, int start,
                   vector<int>& path, vector<vector<int>>& result) {
        if (remain == 0) {
            result.push_back(path);
            return;
        }
        
        for (int i = start; i < candidates.size(); ++i) {
            if (candidates[i] > remain) break;  // 剪枝
            
            path.push_back(candidates[i]);
            backtrack(candidates, remain - candidates[i], i, path, result);  // i 不是 i+1，可重复选
            path.pop_back();
        }
    }
};
```

### 复杂度

- 时间：O(2ⁿ) 最坏（实际受剪枝影响）
- 空间：O(target)（递归深度最多 target/min）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 递归用 `i + 1` 而非 `i` | 不能重复选同一数 | 题目允许，用 `i` |
| 没排序就剪枝 | 剪枝失效 | 必须先排序 |
| 剪枝条件 `candidates[i] > remain` | 漏剪 | 排序后用 break |

### 拓展：组合总和 II（每个数只能用一次）

递归用 `i + 1`，加去重：`i > start && candidates[i] == candidates[i-1]` 跳过。

## 四、回溯套路总结

### 回溯三要素

1. **选择列表**：当前可以做的所有选择
2. **路径**：已经做出的选择
3. **结束条件**：到达决策树叶子

### 模板

```cpp
void backtrack(参数) {
    if (结束条件) {
        result.push_back(path);
        return;
    }
    
    for (auto& 选择 : 选择列表) {
        做选择;        // path.push_back(...)
        backtrack(下一层);
        撤销选择;      // path.pop_back()
    }
}
```

### 去重套路（含重复元素）

```cpp
// 方式 1：排序 + 跳过同层重复
sort(nums.begin(), nums.end());
// 在 for 循环中
if (i > start && nums[i] == nums[i - 1]) continue;

// 方式 2：used 数组
if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
```

### 排列 vs 组合 vs 子集

| 问题 | 用 start | 用 used | 元素可重复 |
| --- | --- | --- | --- |
| 全排列 | ❌ | ✅ | 默认不可 |
| 子集 | ✅ | ❌ | 默认不可 |
| 组合 | ✅ | ❌ | 看题意 |

## 五、延伸阅读

- [LeetCode 中等题集锦：二叉树 3 道](/posts/leetcode-tree)
- [LeetCode 中等题集锦：动态规划 4 道](/posts/leetcode-dp)
- [LeetCode 中等题集锦：数据结构设计](/posts/leetcode-design)

---

> 回溯的本质是**决策树的 DFS**。把"选择 - 递归 - 撤销"三步走清楚，绝大多数问题都能套模板。
