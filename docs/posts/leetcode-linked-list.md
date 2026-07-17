---
title: LeetCode 中等题集锦：链表经典 4 题
date: 2026-06-16
tags:
  - 算法
  - LeetCode
description: 两数相加 + 删除倒数第N节点 + 随机链表复制 + 环形链表 II — 链表高频中等题的 C++ 解法
category: 算法
---

# LeetCode 中等题集锦：链表经典 4 题

| 题号 | 题目 | 难度 | 核心套路 |
| --- | --- | --- | --- |
| 2 | 两数相加 | 中 | 模拟进位 |
| 19 | 删除链表倒数第 N 个节点 | 中 | 快慢双指针 |
| 138 | 随机链表复制 | 中 | 哈希表 / 节点拆分 |
| 142 | 环形链表 II | 中 | 快慢指针 + 数学 |

---

## 一、两数相加（LeetCode 2）

### 题目

给你两个非空链表，表示两个非负整数。每位数字都是**逆序**存储。请你将两个数相加，返回相同形式的链表。

**示例**：

```
输入：l1 = [2, 4, 3], l2 = [5, 6, 4]（表示 342 + 465）
输出：[7, 0, 8]（表示 807）
```

### 思路

模拟人工加法：从低位到高位，逐位相加，处理进位。

逆序存储的好处：链表头是最低位，直接从头遍历就是从低位到高位。

### C++ 实现

```cpp
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0);  // 哨兵节点
        ListNode* cur = &dummy;
        int carry = 0;
        
        while (l1 || l2 || carry) {
            int sum = carry;
            if (l1) { sum += l1->val; l1 = l1->next; }
            if (l2) { sum += l2->val; l2 = l2->next; }
            
            carry = sum / 10;
            cur->next = new ListNode(sum % 10);
            cur = cur->next;
        }
        
        return dummy.next;
    }
};
```

### 复杂度

- 时间：O(max(m, n))，m 和 n 是两个链表长度
- 空间：O(max(m, n))

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 忘记最后的 `carry` | 漏掉最高位进位（如 5+5=10 应输出 [0, 1]） | while 条件加 `|| carry` |
| 直接 `l1 + l2` 不处理 null | 空指针异常 | 每步都判空 |
| 不用哨兵节点 | 头节点处理繁琐 | 用 `dummy` 简化 |

---

## 二、删除链表倒数第 N 个节点（LeetCode 19）

### 题目

给你一个链表，删除链表的倒数第 `n` 个节点，返回链表头。

**示例**：

```
输入：head = [1, 2, 3, 4, 5], n = 2
输出：[1, 2, 3, 5]
```

### 思路

**核心**：快慢双指针。

1. `fast` 先走 `n` 步
2. `slow` 和 `fast` 同时走，直到 `fast` 到末尾
3. 此时 `slow` 指向倒数第 `n+1` 个节点（要删节点的前驱）
4. `slow->next = slow->next->next`

### C++ 实现

```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0);
        dummy.next = head;
        
        ListNode* fast = &dummy;
        ListNode* slow = &dummy;
        
        // fast 先走 n+1 步（这样 slow 停在被删节点的前驱）
        for (int i = 0; i <= n; ++i) {
            fast = fast->next;
        }
        
        while (fast) {
            fast = fast->next;
            slow = slow->next;
        }
        
        // 删除节点
        ListNode* to_delete = slow->next;
        slow->next = slow->next->next;
        delete to_delete;
        
        return dummy.next;
    }
};
```

### 复杂度

- 时间：O(n)
- 空间：O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 删头节点处理错 | 空指针 / 错删 | 用 `dummy` 哨兵 |
| `fast` 先走 `n` 步（不是 n+1） | slow 停在被删节点本身，没法删 | 走 `n+1` 步 |
| 忘记 `delete` 被删节点 | 内存泄漏 | C++ 必须 `delete` |

---

## 三、随机链表复制（LeetCode 138）

### 题目

给你一个长度为 `n` 的链表，每个节点除了 `next` 指针外，还有 `random` 指针，可以指向链表中任意节点或 `null`。请深拷贝整个链表。

**示例**：

```
输入：head = [[7, null], [13, 0], [11, 4], [10, 2], [1, 0]]
（每个 [val, random_index]）
输出：深拷贝的同结构链表
```

### 思路

**难点**：复制 `random` 指针时，新节点还不存在，无法建立映射。

**方案 1：哈希表**（两次遍历）

1. 第一次：复制所有节点存入 `map[原节点] = 新节点`
2. 第二次：遍历原链表，按 `map` 填新节点的 `next` 和 `random`

**方案 2：节点拆分**（O(1) 空间，更优）

1. 在每个原节点后插入新节点：`A → A' → B → B' → ...`
2. 设置新节点的 `random`：`cur->next->random = cur->random->next`
3. 拆分两个链表

### C++ 实现（哈希表方案）

```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        if (!head) return nullptr;
        
        unordered_map<Node*, Node*> map;
        
        // 第一轮：复制所有节点
        for (Node* cur = head; cur; cur = cur->next) {
            map[cur] = new Node(cur->val);
        }
        
        // 第二轮：连接 next 和 random
        for (Node* cur = head; cur; cur = cur->next) {
            map[cur]->next = map[cur->next];      // nullptr 也 OK
            map[cur]->random = map[cur->random];
        }
        
        return map[head];
    }
};
```

### C++ 实现（节点拆分方案，O(1) 空间）

```cpp
class Solution {
public:
    Node* copyRandomList(Node* head) {
        if (!head) return nullptr;
        
        // 第 1 步：在每个节点后插入复制节点
        for (Node* cur = head; cur; ) {
            Node* next = cur->next;
            cur->next = new Node(cur->val);
            cur->next->next = next;
            cur = next;
        }
        
        // 第 2 步：设置 random
        for (Node* cur = head; cur; cur = cur->next->next) {
            if (cur->random) {
                cur->next->random = cur->random->next;
            }
        }
        
        // 第 3 步：拆分
        Node* new_head = head->next;
        for (Node* cur = head; cur; ) {
            Node* new_node = cur->next;
            cur->next = new_node->next;
            cur = cur->next;
            if (cur) {
                new_node->next = cur->next;
            }
        }
        
        return new_head;
    }
};
```

### 复杂度

| 方案 | 时间 | 空间 |
| --- | --- | --- |
| 哈希表 | O(n) | O(n) |
| 节点拆分 | O(n) | O(1) |

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 复制 next 时忘了 nullptr | 哈希表方案 [nullptr] 会插入空条目 | 检查 nullptr |
| 节点拆分方案 random 不判 nullptr | 空指针异常 | `if (cur->random)` |
| 拆分时原链表没还原 | 题目要求不能修改原链表 | 拆分最后一步还原 next |

---

## 四、环形链表 II（LeetCode 142）

### 题目

给定一个链表，返回链表**开始入环的第一个节点**。如果链表无环，返回 `null`。

### 思路

**核心**：Floyd 判圈算法 + 数学推导。

**阶段 1**：快慢指针找到相遇点

- `slow` 走 1 步，`fast` 走 2 步
- 若有环，必定相遇；若无环，`fast` 先到末尾

**阶段 2**：找入环点

设：

- 链表头到入环点距离 = `a`
- 入环点到相遇点距离 = `b`
- 相遇点到入环点距离 = `c`

则：
- `slow` 走了 `a + b`
- `fast` 走了 `a + b + n(b + c)`（n 是圈数）
- `fast` 速度是 `slow` 的 2 倍：`2(a + b) = a + b + n(b + c)`
- 化简：`a = (n - 1)(b + c) + c`

**结论**：从链表头走 `a` 步 = 从相遇点走 `n - 1` 圈 + `c` 步。两个指针同步走，相遇点就是入环点。

### C++ 实现

```cpp
class Solution {
public:
    ListNode* detectCycle(ListNode* head) {
        ListNode* slow = head;
        ListNode* fast = head;
        
        // 阶段 1：找相遇点
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            
            if (slow == fast) {
                // 阶段 2：找入环点
                ListNode* ptr = head;
                while (ptr != slow) {
                    ptr = ptr->next;
                    slow = slow->next;
                }
                return ptr;
            }
        }
        
        return nullptr;  // 无环
    }
};
```

### 复杂度

- 时间：O(n)
- 空间：O(1)

### 易错点

| 陷阱 | 后果 | 防御 |
| --- | --- | --- |
| 阶段 1 起点 slow = fast = head | 第一次循环就相等（误判入环） | while 内部判断（先走再判） |
| 不理解为什么数学成立 | 面试讲不清楚 | 准备推导公式 |
| 用 `unordered_set` 记录已访问 | O(n) 空间，面试官不满意 | 必须用 O(1) 空间 |

## 五、链表题套路总结

### 哨兵节点（Dummy Head）

```cpp
ListNode dummy(0);
dummy.next = head;
// 操作...
return dummy.next;
```

**何时用**：可能修改头节点的操作（删除、插入、合并）。

### 快慢双指针

| 场景 | 快慢步幅 |
| --- | --- |
| 找中点 | fast 2 步，slow 1 步 |
| 判环 | fast 2 步，slow 1 步，相遇则有环 |
| 找倒数第 N | fast 先走 N 步，再同步 |

### 哈希表辅助

- 链表深拷贝（random 指针）
- 找环起点（O(n) 空间换简单）
- 删除重复节点

## 六、延伸阅读

- [LeetCode 中等题集锦：数组与双指针](/posts/leetcode-array-two-pointer)
- [LeetCode 中等题集锦：二叉树 3 道](/posts/leetcode-tree)
- [LeetCode 中等题集锦：动态规划 4 道](/posts/leetcode-dp)

---

> 链表题的核心是**指针操作**。先用 `dummy` 简化头节点处理，再用快慢双指针解决定位问题，绝大多数中等题都能秒杀。
