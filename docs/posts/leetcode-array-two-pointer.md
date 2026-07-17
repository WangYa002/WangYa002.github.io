---
title: LeetCode 中等题集锦：数组与双指针
date: 2026-06-15
tags:
  - 算法
  - LeetCode
description: 三数之和 + 盛最多水的容器 + 合并区间 + 颜色分类 — 四道高频中等题的 C++ 解法与双指针套路总结
category: 算法
---

# LeetCode 中等题集锦：数组与双指针

> 本篇覆盖 LeetCode 热题 100 中数组与双指针方向的 4 道高频中等题。所有题解均用 C++ 实现，附完整思路分析、复杂度、易错点。

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 15 | 三数之和 | 中 | 排序 + 双指针 + 去重 |
| 11 | 盛最多水的容器 | 中 | 左右双指针贪心 |
| 56 | 合并区间 | 中 | 排序 + 单次扫描 |
| 75 | 颜色分类 | 中 | 三指针（荷兰国旗） |

---

## 一、三数之和（LeetCode 15）

### 题目

给你一个整数数组 `nums`，判断是否存在三元组 `[nums[i], nums[j], nums[k]]` 满足 `nums[i] + nums[j] + nums[k] == 0`。返回所有不重复的三元组。

**示例**：

```
输入：nums = [-1, 0, 1, 2, -1, -4]
输出：[[-1, -1, 2], [-1, 0, 1]]
```

### 思路

**核心**：排序 + 双指针 + 严格去重。

1. **排序**：先排序，让双指针的"左右逼近"有意义
2. **固定第一个数 `nums[i]`**：枚举第一个数，剩下两个数用双指针找
3. **双指针找两数之和等于 `-nums[i]`**：
   - `left = i + 1`，`right = n - 1`
   - `nums[left] + nums[right] < -nums[i]` → `left++`
   - `nums[left] + nums[right] > -nums[i]` → `right--`
   - 相等：记录答案，`left++`、`right--`，并跳过重复值
4. **去重**：`nums[i] == nums[i-1]` 跳过；找到答案后跳过 `nums[left] == nums[left-1]`

### C++ 实现

```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        vector<vector<int>> result;
        int n = nums.size();
        if (n < 3) return result;
        
        sort(nums.begin(), nums.end());
        
        for (int i = 0; i < n - 2; ++i) {
            // 剪枝：最小的数 > 0，三数之和不可能为 0
            if (nums[i] > 0) break;
            
            // 去重：跳过重复的 nums[i]
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            
            int left = i + 1, right = n - 1;
            int target = -nums[i];
            
            while (left < right) {
                int sum = nums[left] + nums[right];
                if (sum < target) {
                    ++left;
                } else if (sum > target) {
                    --right;
                } else {
                    result.push_back({nums[i], nums[left], nums[right]});
                    // 跳过重复
                    while (left < right && nums[left] == nums[left + 1]) ++left;
                    while (left < right && nums[right] == nums[right - 1]) --right;
                    ++left;
                    --right;
                }
            }
        }
        
        return result;
    }
};
```

### 复杂度

- 时间：O(n²)（外层 O(n) × 内层双指针 O(n)）
- 空间：O(1)（不算输出数组）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 忘记排序 | 双指针逻辑失效 | 一定要先 `sort` |
| `nums[i] == nums[i+1]` 去重 | 漏解（同值的下个 i 也会被跳过） | 用 `nums[i] == nums[i-1]` |
| 找到答案后没跳过 left/right | 重复解 | 内层 while 跳过重复 |
| 剪枝忘了 `nums[i] > 0 break` | 多余循环 | 加上优化 |

---

## 二、盛最多水的容器（LeetCode 11）

### 题目

给定一个长度为 `n` 的整数数组 `height`，有 `n` 条垂线，第 `i` 条线的两个端点是 `(i, 0)` 和 `(i, height[i])`。找出其中的两条线，使得它们与 x 轴共同构成的容器可以容纳最多的水。返回容器最大储水量。

**示例**：

```
输入：height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
输出：49（选择 height[1]=8 和 height[8]=7，宽 7，高 7，面积 49）
```

### 思路

**核心**：左右双指针贪心。

**关键洞察**：面积 = `min(height[left], height[right]) × (right - left)`。

- 移动较短边：可能找到更高的边，面积可能变大
- 移动较长边：高的边不变高，宽变小，面积**必然变小**

所以**永远移动较短边**。

### C++ 实现

```cpp
class Solution {
public:
    int maxArea(vector<int>& height) {
        int left = 0, right = height.size() - 1;
        int max_area = 0;
        
        while (left < right) {
            int h = min(height[left], height[right]);
            int w = right - left;
            max_area = max(max_area, h * w);
            
            // 移动较短边
            if (height[left] < height[right]) {
                ++left;
            } else {
                --right;
            }
        }
        
        return max_area;
    }
};
```

### 复杂度

- 时间：O(n)
- 空间：O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 移动较长边 | 漏掉最优解 | 永远移动较短边 |
| 用 `min` 算高 | 写反成 `max` | 高度是短板决定 |
| 算面积时顺序错 | 整数溢出 | `h * w` 都在 int 范围内 |

---

## 三、合并区间（LeetCode 56）

### 题目

以数组 `intervals` 表示若干个区间的集合，其中 `intervals[i] = [start_i, end_i]`。合并所有重叠的区间，返回一个不重叠的区间数组。

**示例**：

```
输入：intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]
输出：[[1, 6], [8, 10], [15, 18]]
```

### 思路

**核心**：按起点排序 + 单次扫描合并。

1. 按区间**起点**排序
2. 维护当前合并区间 `[cur_start, cur_end]`
3. 遍历下一个区间 `[start, end]`：
   - 如果 `start <= cur_end`：重叠，合并（`cur_end = max(cur_end, end)`）
   - 否则：把当前合并区间推入结果，开始新区间

### C++ 实现

```cpp
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        if (intervals.empty()) return {};
        
        // 按起点排序
        sort(intervals.begin(), intervals.end());
        
        vector<vector<int>> merged;
        merged.push_back(intervals[0]);
        
        for (int i = 1; i < intervals.size(); ++i) {
            auto& last = merged.back();
            if (intervals[i][0] <= last[1]) {
                // 重叠，合并
                last[1] = max(last[1], intervals[i][1]);
            } else {
                // 不重叠，新增
                merged.push_back(intervals[i]);
            }
        }
        
        return merged;
    }
};
```

### 复杂度

- 时间：O(n log n)（排序）
- 空间：O(1)（不算输出）

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 忘记排序 | 完全错误的合并结果 | 一定要先按起点排序 |
| `max(last[1], intervals[i][1])` 写成赋值 | 包含关系时丢解 | 一定要取 max |
| 区间边界判断错（`<` vs `<=`） | 边界相邻时漏合 | `[1,2]` 和 `[2,3]` 应合并（题目要求） |

---

## 四、颜色分类（LeetCode 75，荷兰国旗问题）

### 题目

给定一个包含红色、白色、蓝色（分别用 0、1、2 表示）的数组 `nums`，**原地**对它们进行排序，使得相同颜色的元素相邻，按 0、1、2 顺序排列。必须使用一趟扫描算法。

**示例**：

```
输入：nums = [2, 0, 2, 1, 1, 0]
输出：[0, 0, 1, 1, 2, 2]
```

### 思路

**核心**：三指针（荷兰国旗算法）。

- `p0`：下一个放 0 的位置（从左）
- `p2`：下一个放 2 的位置（从右）
- `cur`：当前扫描位置

**操作规则**：

- `nums[cur] == 0`：与 `nums[p0]` 交换，`p0++`，`cur++`
- `nums[cur] == 1`：`cur++`
- `nums[cur] == 2`：与 `nums[p2]` 交换，`p2--`，**cur 不变**（因为换过来的数需要再判断）

### C++ 实现

```cpp
class Solution {
public:
    void sortColors(vector<int>& nums) {
        int p0 = 0, p2 = nums.size() - 1;
        int cur = 0;
        
        while (cur <= p2) {
            if (nums[cur] == 0) {
                swap(nums[cur], nums[p0]);
                ++p0;
                ++cur;
            } else if (nums[cur] == 2) {
                swap(nums[cur], nums[p2]);
                --p2;
                // cur 不变，因为换过来的数未判断
            } else {
                ++cur;
            }
        }
    }
};
```

### 复杂度

- 时间：O(n)（单次扫描）
- 空间：O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| `nums[cur] == 2` 后 `cur++` | 漏判换过来的数 | cur 不动 |
| 循环条件 `cur < n` | 越界 | 应该 `cur <= p2` |
| 用 `count` + 重写 | 两趟扫描，违反"一趟"要求 | 必须三指针 |

---

## 五、双指针套路总结

### 何时用双指针

| 场景 | 题目 |
| --- | --- |
| **有序数组找两数** | 三数之和、四数之和 |
| **原地操作** | 颜色分类、删除重复元素 |
| **回文/对称** | 验证回文串、最长回文子串 |
| **区间/容器** | 盛水容器、 trapping-rain-water |
| **链表找中点/环** | 环形链表、链表中点 |

### 模板

```cpp
// 左右双指针
int left = 0, right = n - 1;
while (left < right) {
    if (满足条件) {
        // 处理
        ++left; --right;
    } else if (需要左移右) {
        --right;
    } else {
        ++left;
    }
}

// 快慢双指针（链表常用）
ListNode* slow = head, *fast = head;
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
}
```

## 六、延伸阅读

- [LeetCode 中等题集锦：链表经典 4 题](/posts/leetcode-linked-list)
- [LeetCode 中等题集锦：二叉树 3 道](/posts/leetcode-tree)
- [两数之和：算法入门第一题](/posts/算法-1)

---

> 双指针的本质是**利用问题本身的单调性**，把 O(n²) 暴力优化到 O(n)。看到"有序 + 找两数"，第一反应就是双指针。
