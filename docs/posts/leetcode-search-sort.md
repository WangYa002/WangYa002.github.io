---
title: LeetCode 中等题集锦：搜索与排序
date: 2026-06-21
tags:
  - 算法
  - LeetCode
description: 搜索旋转排序数组 + 数组中第 K 个最大元素 + 在排序数组中查找元素的首末位置 — 二分搜索与排序算法实战
category: 算法
---

# LeetCode 中等题集锦：搜索与排序

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 33 | 搜索旋转排序数组 | 中 | 二分 + 旋转判定 |
| 215 | 数组中第 K 个最大元素 | 中 | 快速选择 / 堆 |
| 34 | 在排序数组中查找元素的首末位置 | 中 | 二分查找左右边界 |

---

## 一、搜索旋转排序数组（LeetCode 33）

### 题目

整数数组 `nums` 按升序排列（无重复元素），在某个下标 `k` 处进行了旋转。例如 `[0,1,2,4,5,6,7]` 在下标 3 处旋转变为 `[4,5,6,7,0,1,2]`。

给你旋转后的数组和一个整数 `target`，返回 `target` 在数组中的下标，不存在返回 `-1`。要求 **O(log n)** 时间。

### 思路

**核心**：二分 + 旋转判定。

旋转后数组虽然整体无序，但**二分后必有一半是有序的**：

- 如果 `nums[left] <= nums[mid]`：左半有序
  - `target` 在左半（`nums[left] <= target < nums[mid]`）：`right = mid - 1`
  - 否则：`left = mid + 1`
- 否则：右半有序
  - `target` 在右半（`nums[mid] < target <= nums[right]`）：`left = mid + 1`
  - 否则：`right = mid - 1`

### C++ 实现

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (nums[mid] == target) return mid;
            
            // 左半有序
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) {
                    right = mid - 1;  // target 在左半
                } else {
                    left = mid + 1;
                }
            }
            // 右半有序
            else {
                if (nums[mid] < target && target <= nums[right]) {
                    left = mid + 1;  // target 在右半
                } else {
                    right = mid - 1;
                }
            }
        }
        
        return -1;
    }
};
```

### 复杂度

- 时间：O(log n)
- 空间：O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| `nums[left] < nums[mid]` 写成严格小于 | 漏判 left == mid 的情况 | 用 `<=` |
| target 边界判断错 | 漏掉端点 | 左闭右开 `nums[left] <= target < nums[mid]` |
| 没用 `mid = left + (right - left) / 2` | 大数组溢出 | 防溢出写法 |

### 拓展

- **搜索旋转排序数组 II（LeetCode 81，含重复）**：左右端点相等时无法判断有序，`left++` 跳过

---

## 二、数组中第 K 个最大元素（LeetCode 215）

### 题目

给定整数数组 `nums` 和整数 `k`，请返回数组中第 **k** 个最大的元素（不是不同元素的第 k 个）。

**示例**：

```
输入：nums = [3, 2, 1, 5, 6, 4], k = 2
输出：5
```

### 思路

**方案 1：排序**（O(n log n)）

直接排序后取第 `n - k` 个。

**方案 2：小顶堆**（O(n log k)）

维护大小为 `k` 的小顶堆，遍历完后堆顶就是第 `k` 大。

**方案 3：快速选择**（平均 O(n)，最坏 O(n²)）

借鉴快速排序的 partition：

1. 随机选 pivot
2. partition：小于 pivot 在左，大于在右
3. 如果 pivot 位置 == `n - k`：返回
4. 如果 pivot 位置 < `n - k`：递归右半
5. 否则：递归左半

### C++ 实现（小顶堆）

```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        // 小顶堆，大小为 k
        priority_queue<int, vector<int>, greater<int>> min_heap;
        
        for (int num : nums) {
            min_heap.push(num);
            if (min_heap.size() > k) {
                min_heap.pop();  // 维持堆大小 k
            }
        }
        
        return min_heap.top();
    }
};
```

### C++ 实现（快速选择）

```cpp
class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        int target = nums.size() - k;  // 第 k 大 = 第 (n-k) 小
        int left = 0, right = nums.size() - 1;
        
        while (left <= right) {
            int pivot_idx = partition(nums, left, right);
            if (pivot_idx == target) {
                return nums[pivot_idx];
            } else if (pivot_idx < target) {
                left = pivot_idx + 1;
            } else {
                right = pivot_idx - 1;
            }
        }
        
        return -1;  // 不会到达
    }
    
private:
    int partition(vector<int>& nums, int left, int right) {
        // 随机选 pivot，避免最坏情况
        int rand_idx = left + rand() % (right - left + 1);
        swap(nums[rand_idx], nums[right]);
        
        int pivot = nums[right];
        int i = left;
        
        for (int j = left; j < right; ++j) {
            if (nums[j] < pivot) {
                swap(nums[i], nums[j]);
                ++i;
            }
        }
        swap(nums[i], nums[right]);
        return i;
    }
};
```

### 复杂度

| 方案 | 时间 | 空间 |
| --- | --- | --- |
| 排序 | O(n log n) | O(1) |
| 小顶堆 | O(n log k) | O(k) |
| **快速选择** | **平均 O(n)，最坏 O(n²)** | O(1) |

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 第 k 大 vs 第 k 小混淆 | 答案错 | 第 k 大 = 第 (n-k) 小 |
| 快速选择没随机化 pivot | 退化到 O(n²) | 随机选 pivot |
| `priority_queue` 默认大顶堆 | 弄反 | 用 `greater<int>` 显式指定小顶堆 |

### 拓展

- **前 K 个高频元素（LeetCode 347）**：用 unordered_map 统计频次 + 小顶堆取前 K
- **数据流中第 K 大（LeetCode 703）**：维持大小为 K 的堆

---

## 三、在排序数组中查找元素的第一个和最后一个位置（LeetCode 34）

### 题目

给你一个按照非递减顺序排列的整数数组 `nums`，和一个目标值 `target`。请你找出给定目标值在数组中的**开始位置和结束位置**。要求 **O(log n)** 时间。

如果数组中不存在目标值，返回 `[-1, -1]`。

**示例**：

```
输入：nums = [5, 7, 7, 8, 8, 10], target = 8
输出：[3, 4]
```

### 思路

**核心**：两次二分查找。

- 第一次：找**第一个**等于 target 的位置（左边界）
- 第二次：找**最后一个**等于 target 的位置（右边界）

**找左边界**：

- `nums[mid] >= target`：`right = mid - 1`（继续往左）
- `nums[mid] < target`：`left = mid + 1`
- 最终 `left` 就是第一个 `>= target` 的位置，检查是否等于 target

**找右边界**：

- `nums[mid] <= target`：`left = mid + 1`（继续往右）
- `nums[mid] > target`：`right = mid - 1`
- 最终 `right` 就是最后一个 `<= target` 的位置

### C++ 实现

```cpp
class Solution {
public:
    vector<int> searchRange(vector<int>& nums, int target) {
        int left = findLeft(nums, target);
        if (left == -1) return {-1, -1};
        int right = findRight(nums, target);
        return {left, right};
    }
    
private:
    int findLeft(const vector<int>& nums, int target) {
        int l = 0, r = nums.size() - 1;
        int result = -1;
        
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] >= target) {
                if (nums[mid] == target) result = mid;
                r = mid - 1;
            } else {
                l = mid + 1;
            }
        }
        
        return result;
    }
    
    int findRight(const vector<int>& nums, int target) {
        int l = 0, r = nums.size() - 1;
        int result = -1;
        
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] <= target) {
                if (nums[mid] == target) result = mid;
                l = mid + 1;
            } else {
                r = mid - 1;
            }
        }
        
        return result;
    }
};
```

### 复杂度

- 时间：O(log n)
- 空间：O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 用 `std::lower_bound` + `std::upper_bound` 但忘了 -1 | off-by-one | `upper_bound` 返回第一个 > target 的位置，-1 才是最后一个 == |
| 找左边界时条件错 | 漏掉相等元素 | 用 `nums[mid] >= target` 配合 result 记录 |
| target 不存在时返回错位置 | 误判 | 检查找到的位置是否真的等于 target |

### STL 写法

```cpp
class Solution {
public:
    vector<int> searchRange(vector<int>& nums, int target) {
        auto it_l = lower_bound(nums.begin(), nums.end(), target);
        if (it_l == nums.end() || *it_l != target) return {-1, -1};
        
        auto it_r = upper_bound(nums.begin(), nums.end(), target);
        // upper_bound 返回第一个 > target 的位置，-1 才是最后一个 == target
        int left = it_l - nums.begin();
        int right = it_r - nums.begin() - 1;
        
        return {left, right};
    }
};
```

## 四、二分查找套路总结

### 何时用二分

- **有序数组**找元素
- **单调函数**找零点
- **旋转数组**找元素
- **答案二分**（如"最小化最大值"问题）

### 三个关键模板

```cpp
// 模板 1：找等于 target 的任意位置（标准二分）
while (left <= right) {
    int mid = left + (right - left) / 2;
    if (nums[mid] == target) return mid;
    else if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
}

// 模板 2：找第一个 >= target 的位置（lower_bound）
while (left < right) {
    int mid = left + (right - left) / 2;
    if (nums[mid] < target) left = mid + 1;
    else right = mid;
}
return left;

// 模板 3：找第一个 > target 的位置（upper_bound）
while (left < right) {
    int mid = left + (right - left) / 2;
    if (nums[mid] <= target) left = mid + 1;
    else right = mid;
}
return left;
```

### 防溢出

```cpp
// ❌ 可能溢出（left + right > INT_MAX）
int mid = (left + right) / 2;

// ✅ 安全写法
int mid = left + (right - left) / 2;

// C++20 起可以用 std::midpoint
int mid = std::midpoint(left, right);
```

## 五、排序算法对比

| 算法 | 时间（平均） | 时间（最坏） | 空间 | 稳定 |
| --- | --- | --- | --- | --- |
| **快速排序** | O(n log n) | O(n²) | O(log n) | ❌ |
| **归并排序** | O(n log n) | O(n log n) | O(n) | ✅ |
| **堆排序** | O(n log n) | O(n log n) | O(1) | ❌ |
| **插入排序** | O(n²) | O(n²) | O(1) | ✅ |
| **C++ STL sort** | O(n log n) | O(n log n) | O(log n) | ❌ |

**STL `sort` 实现**：introsort（快排 + 堆排 + 插入排序的混合），最坏 O(n log n)。

## 六、延伸阅读

- [LeetCode 中等题集锦：数组与双指针](/posts/leetcode-array-two-pointer)
- [LeetCode 中等题集锦：数据结构设计](/posts/leetcode-design)
- [LeetCode 中等题集锦：动态规划 4 道](/posts/leetcode-dp)

---

> 二分查找的本质是**每次砍掉一半搜索空间**。看到"有序 + O(log n) 要求"，第一反应就是二分。
