---
title: LeetCode 中等题集锦：动态规划 4 道
date: 2026-06-19
tags:
  - 算法
  - LeetCode
description: 最长递增子序列 + 零钱兑换 + 最长回文子串 + 打家劫舍 — 动态规划高频中等题的 C++ 解法与状态设计
category: 算法
---

# LeetCode 中等题集锦：动态规划 4 道

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 300 | 最长递增子序列 | 中 | DP + 二分优化 |
| 322 | 零钱兑换 | 中 | 完全背包 |
| 5 | 最长回文子串 | 中 | 中心扩展 / DP |
| 198 | 打家劫舍 | 中 | 线性 DP |

---

## 一、最长递增子序列（LeetCode 300）

### 题目

给你一个整数数组 `nums`，找到其中**最长严格递增子序列**的长度。

**子序列**：不连续，但相对顺序不变。

**示例**：

```
输入：nums = [10, 9, 2, 5, 3, 7, 101, 18]
输出：4（[2, 3, 7, 101] 或 [2, 5, 7, 101]）
```

### 思路（方案 1：O(n²) DP）

`dp[i]` = 以 `nums[i]` 结尾的最长递增子序列长度。

转移：`dp[i] = max(dp[j] + 1)` for all `j < i` 且 `nums[j] < nums[i]`。

### 思路（方案 2：O(n log n) 二分）

维护一个 `tails` 数组，`tails[i]` = 长度为 `i+1` 的递增子序列的最小末尾。

遍历 `nums`，对每个数在 `tails` 中**二分查找**：

- 如果比所有 tails 都大：append（新增长度）
- 否则：替换第一个 >= 它的元素（保持 tails 严格递增）

### C++ 实现（O(n²) DP）

```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        int n = nums.size();
        vector<int> dp(n, 1);  // 至少包含自身
        
        int max_len = 1;
        for (int i = 1; i < n; ++i) {
            for (int j = 0; j < i; ++j) {
                if (nums[j] < nums[i]) {
                    dp[i] = max(dp[i], dp[j] + 1);
                }
            }
            max_len = max(max_len, dp[i]);
        }
        
        return max_len;
    }
};
```

### C++ 实现（O(n log n) 二分）

```cpp
class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;  // 严格递增数组
        
        for (int x : nums) {
            // 二分找第一个 >= x 的位置
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) {
                tails.push_back(x);  // 比所有都大
            } else {
                *it = x;  // 替换
            }
        }
        
        return tails.size();
    }
};
```

### 复杂度

| 方案 | 时间 | 空间 |
| --- | --- | --- |
| DP | O(n²) | O(n) |
| 二分 | O(n log n) | O(n) |

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| DP 初值忘了设 1 | 输出 0 | `dp[i] = 1` 至少包含自身 |
| 二分方案 `lower_bound` vs `upper_bound` | 重复元素处理错 | 严格递增用 `lower_bound` |
| 二分方案返回 `tails.size()` 不是 n | 错误 | tails 长度才是 LIS 长度 |

---

## 二、零钱兑换（LeetCode 322）

### 题目

给你一个整数数组 `coins` 表示不同面额的硬币，以及一个整数 `amount` 表示总金额。计算可以凑成总金额所需的**最少硬币个数**。如果无法凑出，返回 `-1`。

**示例**：

```
输入：coins = [1, 2, 5], amount = 11
输出：3（5 + 5 + 1 = 11）
```

### 思路

**完全背包问题**。

`dp[i]` = 凑出金额 `i` 所需的最少硬币数。

转移：`dp[i] = min(dp[i - coin] + 1)` for each `coin in coins` 且 `i >= coin`。

### C++ 实现

```cpp
class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, amount + 1);  // 初始化为"无穷大"
        dp[0] = 0;
        
        for (int i = 1; i <= amount; ++i) {
            for (int coin : coins) {
                if (coin <= i) {
                    dp[i] = min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        
        return dp[amount] > amount ? -1 : dp[amount];
    }
};
```

### 复杂度

- 时间：O(amount × n)，n 是硬币种类数
- 空间：O(amount)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 初始化为 `INT_MAX` | `dp[i - coin] + 1` 溢出 | 用 `amount + 1` 当"无穷大" |
| 忘了 `dp[0] = 0` | 全部输出"无穷大" | 基准情形 |
| 返回时没判 `-1` | 无解时返回 `amount + 1` | 检查 `dp[amount] > amount` |

---

## 三、最长回文子串（LeetCode 5）

### 题目

给你一个字符串 `s`，找到 `s` 中最长的**回文子串**。

**示例**：

```
输入：s = "babad"
输出："bab" 或 "aba"
```

### 思路（方案 1：中心扩展，推荐）

回文中心可以是单个字符（奇数长度）或两个字符中间（偶数长度）。

枚举每个中心，向两边扩展，记录最长。

### 思路（方案 2：DP）

`dp[i][j]` = `s[i..j]` 是否是回文。

转移：`dp[i][j] = (s[i] == s[j]) && dp[i+1][j-1]`。

### C++ 实现（中心扩展）

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size();
        if (n < 2) return s;
        
        int start = 0, max_len = 1;
        
        for (int i = 0; i < n; ++i) {
            // 奇数长度
            auto [l1, len1] = expand(s, i, i);
            // 偶数长度
            auto [l2, len2] = expand(s, i, i + 1);
            
            if (len1 > max_len) {
                max_len = len1;
                start = l1;
            }
            if (len2 > max_len) {
                max_len = len2;
                start = l2;
            }
        }
        
        return s.substr(start, max_len);
    }
    
private:
    pair<int, int> expand(const string& s, int left, int right) {
        while (left >= 0 && right < s.size() && s[left] == s[right]) {
            --left;
            ++right;
        }
        // 返回回文起点和长度
        return {left + 1, right - left - 1};
    }
};
```

### C++ 实现（DP）

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        int n = s.size();
        vector<vector<bool>> dp(n, vector<bool>(n, false));
        
        int start = 0, max_len = 1;
        
        // 所有长度为 1 的子串都是回文
        for (int i = 0; i < n; ++i) dp[i][i] = true;
        
        // 按子串长度枚举
        for (int len = 2; len <= n; ++len) {
            for (int i = 0; i + len <= n; ++i) {
                int j = i + len - 1;
                if (s[i] == s[j]) {
                    if (len == 2 || dp[i + 1][j - 1]) {
                        dp[i][j] = true;
                        if (len > max_len) {
                            start = i;
                            max_len = len;
                        }
                    }
                }
            }
        }
        
        return s.substr(start, max_len);
    }
};
```

### 复杂度

| 方案 | 时间 | 空间 |
| --- | --- | --- |
| 中心扩展 | O(n²) | O(1) |
| DP | O(n²) | O(n²) |

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 中心扩展只考虑奇数 | 漏掉偶数长度回文（如 "abba"） | 同时枚举奇偶 |
| DP 遍历顺序错 | dp[i+1][j-1] 还未计算 | 按长度递增遍历 |
| 返回子串时 start 和 len 错位 | 输出错位 | `s.substr(start, max_len)` |

---

## 四、打家劫舍（LeetCode 198）

### 题目

你是一个专业小偷，计划偷窃沿街的房屋。每间房内有一定金额 `nums[i]`。**相邻房屋**装有报警，不能同时偷。求能偷到的最大金额。

**示例**：

```
输入：nums = [1, 2, 3, 1]
输出：4（偷第 1 和 第 3 间：1 + 3 = 4）
```

### 思路

`dp[i]` = 偷前 `i` 间房的最大金额。

转移：

- 偷 `nums[i]`：`dp[i-2] + nums[i]`
- 不偷 `nums[i]`：`dp[i-1]`
- 取最大：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`

### C++ 实现（标准 DP）

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 0) return 0;
        if (n == 1) return nums[0];
        
        vector<int> dp(n);
        dp[0] = nums[0];
        dp[1] = max(nums[0], nums[1]);
        
        for (int i = 2; i < n; ++i) {
            dp[i] = max(dp[i - 1], dp[i - 2] + nums[i]);
        }
        
        return dp[n - 1];
    }
};
```

### C++ 实现（空间优化 O(1)）

```cpp
class Solution {
public:
    int rob(vector<int>& nums) {
        int prev2 = 0;     // dp[i-2]
        int prev1 = 0;     // dp[i-1]
        
        for (int num : nums) {
            int cur = max(prev1, prev2 + num);
            prev2 = prev1;
            prev1 = cur;
        }
        
        return prev1;
    }
};
```

### 复杂度

- 时间：O(n)
- 空间：O(n) 或 O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 边界 n == 0 / n == 1 没处理 | 越界 / 输出错 | 单独判断 |
| 状态定义错（"偷第 i 间"） | 限制太死 | 定义成"前 i 间的最大" |
| 空间优化时 prev 更新顺序错 | 状态污染 | 先存 cur，再更新 prev |

### 拓展

- **打家劫舍 II（环形）**：分两次（0~n-2 和 1~n-1）取最大
- **打家劫舍 III（树形 DP）**：递归返回 (偷当前, 不偷当前)

## 五、动态规划套路总结

### DP 五步法

1. **状态定义**：`dp[i]` / `dp[i][j]` 表示什么
2. **状态转移方程**：从已知状态到当前状态
3. **初始条件**：`dp[0]` / `dp[1]` 等
4. **遍历顺序**：从小到大 / 按长度
5. **空间优化**：能否用滚动数组

### 常见 DP 类型

| 类型 | 典型题目 |
| --- | --- |
| **线性 DP** | 打家劫舍、爬楼梯、最长递增子序列 |
| **背包 DP** | 零钱兑换、分割等和子集 |
| **区间 DP** | 最长回文子串、戳气球 |
| **状态机 DP** | 买卖股票系列 |
| **树形 DP** | 打家劫舍 III |
| **位运算 DP** | 计数问题 |

### 选择 DP 还是回溯

| 维度 | DP | 回溯 |
| --- | --- | --- |
| 求解目标 | 最值 / 方案数 | 所有方案 |
| 子问题重叠 | 重叠（DP 省时间） | 不重叠 |
| 时间复杂度 | 通常多项式 | 通常指数 |

## 六、延伸阅读

- [LeetCode 中等题集锦：回溯算法 3 题](/posts/leetcode-backtracking)
- [LeetCode 中等题集锦：数据结构设计](/posts/leetcode-design)
- [LeetCode 中等题集锦：搜索与排序](/posts/leetcode-search-sort)

---

> 动态规划的本质是**用空间换时间**：把指数级搜索优化到多项式，关键是定义清楚"状态"。
