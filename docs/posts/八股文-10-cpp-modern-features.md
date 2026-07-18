---
title: C++ 新特性与 408 综合面试冲刺
date: 2026-07-18
tags:
  - C++11
  - C++17
  - C++20
  - 八股文
description: C++11/14/17/20 新特性 + 计网/操作系统/组成原理高频考点 — 校招面试最后的冲刺
category: 八股文
---

# C++ 新特性与 408 综合面试冲刺

> 本文是八股系列的最后一篇，整合两大块：① C++11/14/17/20 新特性（lambda 底层、智能指针、移动语义、optional/variant、concepts/ranges/coroutines）；② 408 综合面试高频考点（计网/操作系统/组成原理）。

---

## 一、C++11 新特性

### 1.1 总览：C++11 改变了什么

```text
┌──────────────────────────────────────────────────┐
│                 C++11 关键特性                   │
├──────────────────┬───────────────────────────────┤
│ 语言层           │ auto / decltype / lambda      │
│                  │ 右值引用 / 移动语义 / 完美转发│
│                  │ nullptr / constexpr / 初始化表│
│                  │ 模板别名 / 可变参数模板       │
├──────────────────┼───────────────────────────────┤
│ 库层             │ smart pointer (3 种)          │
│                  │ std::thread / mutex / cv      │
│                  │ std::atomic / 内存序         │
│                  │ std::function / std::bind    │
│                  │ std::chrono / std::tuple     │
└──────────────────┴───────────────────────────────┘
```

### 1.2 auto 与 decltype

```cpp
auto x = 42;              // int
const auto& y = x;        // const int&
auto z = {1, 2, 3};       // std::initializer_list<int>

decltype(x) a;            // int —— 推导表达式类型，不实例化
decltype(auto) b = x;     // C++14：保留引用与 cv 限定
```

**面试追问：auto 与 decltype 区别？**

| 维度 | `auto` | `decltype(expr)` |
|------|--------|------------------|
| 推导规则 | 模板参数推导规则（丢引用/cv） | 严格保留类型 |
| 是否求值 | 是（需要初始化） | 否（编译期分析） |
| 数组/函数 | 退化为指针 | 保留数组/函数类型 |

### 1.3 右值引用 / 移动语义 / 完美转发

```cpp
// 1. 左值/右值
int a = 10;               // a 是左值（有名字、可取地址）
int&& r = 10;             // 10 是右值（纯右值），r 是右值引用（左值）
std::string s1 = "hello";
std::string s2 = std::move(s1);  // 移动构造，s1 变为有效但未定义状态

// 2. 移动构造函数
class Buffer {
    char* data_;
    size_t size_;
public:
    Buffer(Buffer&& other) noexcept      // 关键：noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
    }
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }
};

// 3. 完美转发
template<typename T>
void wrapper(T&& arg) {                   // 万能引用（引用折叠）
    target(std::forward<T>(arg));         // 保持左右值属性
}
```

**面试追问链：**

1. **为什么移动构造要 `noexcept`？** `std::vector` 扩容时，只有当移动构造是 `noexcept` 时才会用移动，否则为了强异常安全回退到拷贝。
2. **`std::move` 做了什么？** 仅做 `static_cast<T&&>`，**没有移动任何东西**，真正的移动在移动构造/赋值里完成。
3. **万能引用 vs 右值引用？** `T&&` 在模板中且需要推导时是万能引用，否则是右值引用。`auto&&` 也是万能引用。
4. **引用折叠规则：**
   - `T& &`、`T& &&`、`T&& &` → `T&`
   - `T&& &&` → `T&&`

### 1.4 lambda 表达式（重点中的重点）

```cpp
auto add = [](int a, int b) { return a + b; };
int x = 10;
auto add_x = [x](int a) { return a + x; };        // 值捕获
auto add_ref = [&x](int a) { return a + x; };     // 引用捕获
auto add_all = [=](int a) { return a + x; };      // 全部值捕获
auto add_ref_all = [&](int a) { return a + x; };  // 全部引用捕获
auto add_mut = [x](int a) mutable { return ++x + a; };  // mutable 可修改值捕获
```

**lambda 底层实现：编译器把 lambda 翻译成一个闭包类**

```cpp
// 写法：
int x = 10;
auto f = [x](int a) { return a + x; };

// 编译器生成的等价代码（伪代码）：
class __lambda_1 {
    int x_;                       // 值捕获 -> 成员变量
public:
    __lambda_1(int x) : x_(x) {}
    int operator()(int a) const {  // 重载 operator()
        return a + x_;
    }
};

// 使用：
__lambda_1 f(x);
f(20);
```

**关键结论：lambda 本质上是一个匿名函数对象（functor/仿函数）。**

| 捕获方式 | 闭包类成员 | operator() 的 const 属性 |
|----------|-----------|--------------------------|
| `[x]` 值捕获 | `int x_;` 拷贝 | const（不可修改） |
| `[&x]` 引用捕获 | `int& x_;` 引用 | const（但能改 x 的值） |
| `[x] mutable` | `int x_;` 拷贝 | **非 const**（可修改） |
| `[=]` 全值捕获 | 每个外部变量各一份拷贝 | const |
| `[&]` 全引用捕获 | 每个外部变量的引用 | const |

**面试追问：**

1. **lambda 的大小？** 取决于捕获的变量。`[x]` 通常是 `sizeof(x)`；`[&x]` 通常是指针大小 `sizeof(void*)`；无捕获 lambda 通常为空类（1 字节）。
2. **无捕获 lambda 能转函数指针？** 能。`int(*fp)(int,int) = [](int a,int b){return a+b;};` 合法。
3. **lambda 与 std::function 区别？** lambda 表达式产生闭包对象，类型唯一；`std::function` 是类型擦除的包装器，能装任何可调用对象但有运行时开销。

### 1.5 智能指针（复习）

| 类型 | 语义 | 引用计数 | 适用场景 |
|------|------|----------|----------|
| `unique_ptr<T>` | 独占所有权 | 无 | 默认首选，零开销 |
| `shared_ptr<T>` | 共享所有权 | 有（原子） | 多处共享，如缓存 |
| `weak_ptr<T>` | 弱引用，不增加计数 | 无 | 打破循环引用 |

**循环引用陷阱：**

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev;    // ❌ 双向链表 -> 循环引用 -> 内存泄漏
};

struct Node2 {
    std::shared_ptr<Node2> next;
    std::weak_ptr<Node2> prev;     // ✅ 用 weak_ptr 打破循环
};
```

详见 [八股文-2 C++ 核心八股](./八股文-2-cpp-core.md) 智能指针章节。

### 1.6 nullptr

```cpp
void f(int);      // 重载 1
void f(char*);    // 重载 2

f(NULL);          // ❌ 调用 f(int) —— NULL 在 C++ 中是 0
f(nullptr);       // ✅ 调用 f(char*) —— nullptr 是 std::nullptr_t 类型
```

### 1.7 constexpr（编译期常量）

```cpp
constexpr int factorial(int n) {           // C++11：函数体只能一行 return
    return n <= 1 ? 1 : n * factorial(n - 1);
}

// C++14 放宽：可用 if/for/局部变量
constexpr int fib(int n) {
    if (n < 2) return n;
    int a = 0, b = 1;
    for (int i = 2; i <= n; ++i) {
        int t = a + b;
        a = b;
        b = t;
    }
    return b;
}

int main() {
    constexpr int x = factorial(5);        // 编译期求值
    int arr[factorial(3)];                 // ✅ 数组大小
    return 0;
}
```

**`constexpr` vs `const`：**

| 特性 | `const` | `constexpr` |
|------|---------|-------------|
| 语义 | 只读 | 编译期常量 |
| 求值时机 | 可运行时 | 必须编译期 |
| 初始化 | 任意值 | 常量表达式 |

### 1.8 std::thread / mutex / condition_variable

```cpp
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>

std::queue<int> q;
std::mutex mtx;
std::condition_variable cv;
bool done = false;

void producer() {
    for (int i = 0; i < 100; ++i) {
        {
            std::lock_guard<std::mutex> lock(mtx);
            q.push(i);
        }
        cv.notify_one();                    // 通知一个消费者
    }
    {
        std::lock_guard<std::mutex> lock(mtx);
        done = true;
    }
    cv.notify_all();                        // 通知所有消费者退出
}

void consumer() {
    while (true) {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [] {                  // 谓词版本：自动处理虚假唤醒
            return !q.empty() || done;
        });
        if (q.empty() && done) break;
        int v = q.front();
        q.pop();
        lock.unlock();                      // 提前解锁，让其他线程尽快拿到锁
        std::cout << v << '\n';
    }
}

int main() {
    std::thread p(producer);
    std::thread c1(consumer);
    std::thread c2(consumer);
    p.join();
    c1.join();
    c2.join();
    return 0;
}
```

**为什么 `cv.wait` 必须配合 `unique_lock`？** wait 内部需要：
1. 释放锁（让生产者能 push）
2. 阻塞线程
3. 被唤醒后重新加锁

`lock_guard` 不支持手动 unlock/lock，必须用 `unique_lock`。

**条件变量使用要点：**
- **必须用谓词版本 `wait(lock, pred)`** 或 while 循环判断 —— 防止虚假唤醒
- **修改共享状态后必须 `notify`** —— 唤醒可能正在 wait 的线程
- **`notify_one` vs `notify_all`** —— 前者唤醒一个（减少惊群），后者全部唤醒

---

## 二、C++14 新特性

### 2.1 关键特性

```cpp
// 1. 函数返回类型推导
auto f(int x) { return x * 2; }              // 自动推导返回 int

// 2. 泛型 lambda
auto f = [](auto x, auto y) { return x + y; };
f(1, 2);                                     // int
f(std::string("a"), std::string("b"));       // string

// 3. std::make_unique —— C++11 只有 make_shared，C++14 补齐
auto p = std::make_unique<int>(42);

// 4. 变量模板
template<typename T>
constexpr T pi = T(3.14159265358979);
double d = pi<double>;                       // 3.14159...

// 5. decltype(auto)
int x = 1;
int& y = x;
decltype(auto) z = y;                        // int& —— 保留引用
```

---

## 三、C++17 新特性（重点）

### 3.1 optional / variant / any —— 三大值容器

```cpp
#include <optional>
#include <variant>
#include <any>

// 1. optional<T> —— 可能有值，也可能没值（替代裸指针/null 双关）
std::optional<int> find_even(const std::vector<int>& v) {
    for (int x : v) {
        if (x % 2 == 0) return x;
    }
    return std::nullopt;
}

if (auto r = find_even({1, 3, 4, 5})) {
    std::cout << *r << '\n';                 // 4
}

// 2. variant<A, B, C> —— 类型安全的联合（替代 union + tag）
std::variant<int, double, std::string> v;
v = 42;
v = 3.14;
v = "hello";

// 访问
std::visit([](auto&& arg) {
    std::cout << arg << '\n';
}, v);

// 3. any —— 任意类型（不推荐，弱类型）
std::any a = 42;
a = std::string("hello");
```

**三者对比：**

| 容器 | 类型数 | 类型安全 | 推荐场景 |
|------|--------|----------|----------|
| `optional<T>` | 0 或 1 | 强 | 返回可能失败的值 |
| `variant<A,B,...>` | N 个之一 | 强 | 状态机/AST 节点 |
| `any` | 任意 | 弱 | 极少用 |

### 3.2 string_view —— 零拷贝字符串视图

```cpp
void log(std::string_view sv) {              // 不分配内存
    std::cout << sv << '\n';
}

std::string s = "hello";
log(s);                                      // 从 string 构造
log("world");                                // 从 const char*
log(s.substr(0, 3));                         // ⚠️ 危险：substr 返回临时，sv 悬空
```

**注意：string_view 不拥有内存，调用方必须保证原字符串生命周期足够长。**

### 3.3 if constexpr —— 编译期分支

```cpp
template<typename T>
auto get_value(T t) {
    if constexpr (std::is_pointer_v<T>) {
        return *t;                           // 指针：解引用
    } else {
        return t;                            // 值：直接返回
    }
}
```

**对比 C++11 的 SFINAE / tag dispatch**：代码更直观，编译器还会丢弃未走的分支（不会触发编译错误）。

### 3.4 结构化绑定

```cpp
std::pair p = {1, "hello"};
auto [num, str] = p;                         // num=1, str="hello"

std::map<int, std::string> m = {{1, "a"}, {2, "b"}};
for (const auto& [k, v] : m) {
    std::cout << k << "=>" << v << '\n';
}

struct Point { int x, y; };
Point pt{1, 2};
auto& [x, y] = pt;                           // 引用绑定，可修改原对象
```

### 3.5 折叠表达式（fold expressions）

```cpp
// C++17：可变参数模板的更简洁展开
template<typename... Args>
auto sum(Args... args) {
    return (args + ...);                     // 右折叠：((a1+a2)+a3)+...
}

template<typename... Args>
auto print_all(Args... args) {
    ((std::cout << args << ' '), ...);       // 逗号折叠
}

sum(1, 2, 3, 4);                             // 10
print_all(1, "hello", 3.14);
```

### 3.6 文件系统库 std::filesystem

```cpp
#include <filesystem>
namespace fs = std::filesystem;

for (const auto& entry : fs::directory_iterator("/tmp")) {
    std::cout << entry.path() << '\n';
}

fs::create_directory("test");
fs::remove("test/file.txt");
auto size = fs::file_size("/path/to/file");
```

---

## 四、C++20 新特性（重点关注四大件）

### 4.1 concepts —— 概念约束

```cpp
// C++17 SFINAE
template<typename T, 
         typename = std::enable_if_t<std::is_integral_v<T>>>
T add(T a, T b) { return a + b; }

// C++20 concepts —— 更清晰
template<typename T>
concept Integral = std::is_integral_v<T>;

template<Integral T>
T add(T a, T b) { return a + b; }

// 或用 requires 子句
template<typename T>
requires std::is_integral_v<T>
T mul(T a, T b) { return a * b; }

// 简写模板
void foo(std::integral auto x) {             // auto + concept
    std::cout << x << '\n';
}
```

### 4.2 ranges —— 范围库

```cpp
#include <ranges>
#include <algorithm>

std::vector<int> v = {1, 2, 3, 4, 5, 6};

// C++17：用迭代器
auto it = std::find_if(v.begin(), v.end(), [](int x){return x > 3;});

// C++20：直接传容器 + 管道
auto r = v | std::views::filter([](int x){return x > 3;})
           | std::views::transform([](int x){return x * 2;});
// r = [8, 10, 12]

// 惰性求值 —— 可以处理无限序列
auto naturals = std::views::iota(1)
              | std::views::filter([](int x){return x % 2 == 0;})
              | std::views::take(5);
// [2, 4, 6, 8, 10]
```

### 4.3 coroutines —— 协程

```cpp
#include <coroutine>

// 协程返回值类型必须有 promise_type
struct Generator {
    struct promise_type {
        int current_value;
        Generator get_return_object() { return Generator{this}; }
        std::suspend_always initial_suspend() { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(int v) {
            current_value = v;
            return {};
        }
        void return_void() {}
        void unhandled_exception() { std::terminate(); }
    };

    std::coroutine_handle<promise_type> h_;
    explicit Generator(promise_type* p)
        : h_(std::coroutine_handle<promise_type>::from_promise(*p)) {}
    ~Generator() { if (h_) h_.destroy(); }

    int next() {
        h_();
        return h_.promise().current_value;
    }
};

Generator naturals() {
    int i = 1;
    while (true) {
        co_yield i++;                        // 挂起 + 返回值
    }
}

// 使用
auto gen = naturals();
std::cout << gen.next() << '\n';             // 1
std::cout << gen.next() << '\n';             // 2
```

**协程 vs 线程 vs 函数：**

| 维度 | 函数 | 协程 | 线程 |
|------|------|------|------|
| 切换成本 | 函数调用 | 用户态切换（~ns） | 内核态切换（~μs） |
| 栈 | 自动 | 有栈/无栈 | 内核栈 |
| 并发 | 否 | 单线程内并发 | 多核并行 |

### 4.4 modules —— 模块

```cpp
// math.cppm —— 模块接口单元
export module math;
export int add(int a, int b) { return a + b; }

// main.cpp
import math;
int main() { return add(1, 2); }
```

**模块 vs 头文件：**
- 不需要预处理，编译更快（可缓存）
- 没有宏污染
- 但目前主流编译器支持参差不齐，工业界用得还不多

---

## 五、多态与虚函数表（重温）

### 5.1 多态分类

```text
┌─────────────────────────────────────┐
│              多态                   │
├──────────────┬──────────────────────┤
│ 静态多态     │ 动态多态             │
│ （编译期）   │ （运行期）           │
├──────────────┼──────────────────────┤
│ 函数重载     │ 虚函数               │
│ 运算符重载   │ （virtual）          │
│ 模板         │                      │
│ CRTP         │                      │
└──────────────┴──────────────────────┘
```

### 5.2 虚函数表底层

```cpp
class Base {
public:
    virtual void f() { std::cout << "Base::f\n"; }
    virtual void g() { std::cout << "Base::g\n"; }
};

class Derived : public Base {
public:
    void f() override { std::cout << "Derived::f\n"; }
};

Base* p = new Derived;
p->f();   // 输出 Derived::f
```

**内存布局：**

```text
Derived 对象
┌─────────────┐
│   vptr      │──┐──> Derived 虚表
├─────────────┤  │    ┌─────────────────┐
│   members   │  │    │ &Derived::f     │  ← 重写后的
└─────────────┘  │    │ &Base::g        │  ← 未重写，沿用
                 │    └─────────────────┘
```

**调用过程 `p->f()`：**
1. 通过 `p` 取出对象的 `vptr`
2. 通过 `vptr` 找到虚函数表
3. 在虚表中找到 `f` 的真实地址（Derived::f）
4. 间接调用

### 5.3 为什么基类析构要 virtual？

```cpp
class Base { ~Base() {} };                          // ❌ 非 virtual
class Derived : public Base { int* p_; ~Derived() { delete[] p_; } };

Base* p = new Derived;
delete p;                                           // 只调 Base::~Base()，p_ 泄漏！
```

**修复：**

```cpp
class Base { virtual ~Base() = default; };          // ✅
```

---

## 六、408 综合：操作系统高频考点

### 6.1 死锁四要素 + 银行家算法

**死锁四个必要条件**（缺一不可）：

1. **互斥**：资源一次只能被一个进程占用
2. **占有并等待**：进程已占有资源，还在等待其他资源
3. **不可抢占**：资源不能被强行夺走
4. **环路等待**：存在进程-资源的环形等待链

**破坏任意一条即可避免死锁：**

| 条件 | 破坏方法 |
|------|----------|
| 互斥 | 改用无锁数据结构（CAS） |
| 占有等待 | 一次性申请所有资源 |
| 不可抢占 | 超时返回（如 `try_lock_for`） |
| 环路等待 | 资源编号并按顺序申请 |

**银行家算法：** 分配前先模拟一遍，看分配后系统是否仍处于"安全状态"（存在一个序列能让所有进程都完成）。安全才分配。

### 6.2 多进程 vs 多线程（高频表）

| 维度 | 多进程 | 多线程 |
|------|--------|--------|
| 数据共享 | 复杂，需 IPC | 简单，直接共享地址空间 |
| 同步需求 | 低（IPC 自带同步） | 高（需锁/原子） |
| 内存占用 | 高（独立地址空间） | 低（共享） |
| 通信效率 | 低（内核介入） | 高（直接内存访问） |
| 隔离性 | 强（一个崩不影响其他） | 弱（一个段崩全崩） |
| 创建成本 | 高（fork/clone） | 低 |
| 适用场景 | 高隔离、分布式、Chrome 多进程 | 高并发、共享频繁（Nginx 工作线程） |

### 6.3 IPC 机制对比

| IPC | 说明 | 复杂度 | 典型用途 |
|-----|------|--------|----------|
| 管道 Pipe | 父子进程单向通信 | 中 | shell 管道 |
| 命名管道 FIFO | 任意进程间 | 中 | 简单 IPC |
| 消息队列 | 内核维护的链表 | 中 | 短消息 |
| 共享内存 | 最快 IPC | 高（需手动同步） | 大数据共享 |
| 信号量 | 计数同步原语 | 高 | 锁 |
| 信号 | 异步通知 | 低 | kill/stop |
| Socket | 跨主机 | 极高 | 网络通信 |

### 6.4 进程调度算法

| 算法 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| FCFS | 先来先服务 | 简单 | 短作业吃亏 |
| SJF | 短作业优先 | 平均等待时间最短 | 长作业饥饿 |
| SRTN | 抢占式 SJF | 响应快 | 频繁切换 |
| 优先级 | 按优先级 | 灵活 | 低优先级饥饿（解决：老化） |
| 时间片轮转 RR | 公平 | 响应快 | 时间片大小难定 |
| CFS（Linux） | 按虚拟运行时间 | 公平、低延迟 | 实现复杂 |

详见 [八股文-5 Linux 操作系统核心](./八股文-5-linux-os.md)。

---

## 七、408 综合：计算机网络高频考点

### 7.1 TCP/IP 四层 vs ISO 七层

```text
TCP/IP 四层              ISO 七层
─────────────           ─────────
应用层                   应用层
                        表示层
                        会话层
运输层                   传输层
网络层                   网络层
链路层                   数据链路层
                        物理层
```

### 7.2 TCP 可靠性机制（六大法宝）

```text
┌────────────────────────────────────────────────┐
│           TCP 可靠性 6 大机制                  │
├──────────────────┬─────────────────────────────┤
│ 1. 序列号 + ACK  │ 解决乱序、去重              │
│ 2. 重传机制      │ 超时 RTO / 快速重传 3 dupACK│
│ 3. 流量控制      │ 滑动窗口（接收方告之窗口）  │
│ 4. 拥塞控制      │ 慢启动 / 拥塞避免 / 快恢复  │
│ 5. 校验和        │ 检测位错误                  │
│ 6. 连接管理      │ 三次握手 / 四次挥手         │
└──────────────────┴─────────────────────────────┘
```

### 7.3 拥塞控制四阶段

```text
cwnd
  │              慢启动
  │            ↗ (指数增长)
  │          ↗
  │        ↗  ssthresh
  │      ↱─────────── 拥塞避免（线性增长）
  │    ↱
  │  ↱
  └───────────────────────── 时间
                  ↓
              3 dupACK
              快恢复（cwnd 减半）
```

### 7.4 三次握手 & 四次挥手

**三次握手：**

```text
Client                          Server
  │                               │
  │ ──────── SYN ──────────────→ │  SYN_RCVD
  │           seq=x               │
  │                               │
  │ ←────── SYN+ACK ──────────── │
  │           seq=y, ack=x+1     │
  │                               │
  │ ──────── ACK ──────────────→ │  ESTABLISHED
  │           ack=y+1             │
  │                               │
  ESTABLISHED                     │
```

**为什么是三次不是两次？** 防止已失效的 SYN 到达服务器，让服务器白白开连接浪费资源。

**四次挥手：**

```text
Client                          Server
  │                               │
  │ ──────── FIN ──────────────→ │  CLOSE_WAIT
  │           seq=u               │
  │                               │
  │ ←──────── ACK ────────────── │
  │           ack=u+1             │
  │                               │  （服务器继续发剩余数据）
  │ ←──────── FIN ────────────── │  LAST_ACK
  │           seq=w               │
  │                               │
  │ ──────── ACK ──────────────→ │  CLOSED
  │           ack=w+1             │
  │                               │
  TIME_WAIT（2 MSL）              │
  CLOSED                         │
```

**TIME_WAIT 存在原因：**
1. **保证最后 ACK 到达**：如果对端没收到，对端会重发 FIN
2. **让旧连接的报文消失**：2 MSL 后网络中的延迟报文都会过期

### 7.5 长连接 vs 短连接

- **短连接**：每次请求建立/关闭 TCP，开销大
- **长连接（Keep-Alive）**：连接复用，省握手成本，需要空闲超时检测

### 7.6 粘包/分包解决

**TLV（Tag-Length-Value）格式：**

```text
┌────────┬────────────┬────────────┐
│ 包头   │ 数据长度 N │ 数据内容   │
│ FBEB   │ 4 字节     │ N 字节     │
└────────┴────────────┴────────────┘
```

接收端流程：先读包头和长度，再读 N 字节数据。

---

## 八、408 综合：组成原理高频考点

### 8.1 原码 / 反码 / 补码

| 编码 | 正数 | 负数 | 0 的表示 |
|------|------|------|---------|
| 原码 | 符号位 + 绝对值 | 符号位 + 绝对值 | +0 / -0 两种 |
| 反码 | 同原码 | 符号位 + 按位取反 | +0 / -0 两种 |
| **补码** | 同原码 | 反码 + 1 | **唯一** |

**为什么用补码？**
1. 0 唯一表示，简化比较
2. 加法器能同时处理加减法（`a - b = a + (-b)_补`）
3. 范围不对称：`int8` 是 `[-128, 127]`，能多表示一个负数

### 8.2 大端 vs 小端

```cpp
uint32_t x = 0x12345678;

// 大端（网络字节序）：高字节在低地址
// 地址： 0x00 0x01 0x02 0x03
// 内容： 0x12 0x34 0x56 0x78

// 小端（x86/ARM 默认主机序）：低字节在低地址
// 内容： 0x78 0x56 0x34 0x12

// 检测当前机器字节序
bool is_little_endian() {
    uint16_t x = 0x0001;
    return *(char*)&x == 1;
}

// 网络字节序 / 主机字节序转换
htonl / htons / ntohl / ntohs
```

---

## 九、面试实战：综合题汇总

### 9.1 "C++11 你用过哪些新特性？"

**回答框架（按使用频率）：**
1. **必答**：auto / decltype / 范围 for / nullptr / 强类型枚举
2. **重点**：智能指针（shared/unique/weak） / lambda / 右值引用 + 移动语义
3. **加分**：constexpr / 可变参数模板 / std::thread & mutex / 完美转发
4. **可选**：std::function / std::bind / initializer_list

### 9.2 "讲一下 lambda 底层实现"

**完整答案：**
> lambda 在编译期会被翻译成一个**闭包类（closure class）**：每个捕获的变量变成成员变量，lambda 体变成 `operator()` 重载。lambda 表达式本身求值得到一个该闭包类型的实例。所以 lambda 本质上是一个**匿名函数对象（functor）**。无捕获的 lambda 可以隐式转换成函数指针；有捕获的不行，必须用 `std::function` 包装。

### 9.3 "shared_ptr 是线程安全的吗？"

**答案：**
- **引用计数操作是原子的** —— 多线程同时拷贝/析构不同的 shared_ptr 没问题
- **指向同一对象的 shared_ptr 的读写不是线程安全的** —— 需要加锁或用 `std::atomic<std::shared_ptr>`（C++20）
- **指向的对象本身的线程安全** —— 由对象自己保证，shared_ptr 不管

### 9.4 "条件变量为什么会有虚假唤醒？"

**答案：**
> 虚假唤醒（spurious wakeup）是操作系统允许的：即使没有线程 `notify`，等待在条件变量上的线程也可能被唤醒。POSIX 标准明确允许这种行为。所以条件变量必须用 while 循环判断条件，或使用 `wait(lock, pred)` 谓词版本（内部就是 while 循环）。

### 9.5 "讲一下移动语义和完美转发"

**回答要点：**
1. **移动语义**：通过右值引用接管资源（如堆内存、文件句柄）而不是拷贝，省去深拷贝开销。`std::move` 只是做 `static_cast` 到右值，真正干活的是移动构造/赋值。
2. **完美转发**：模板中用 `T&&`（万能引用）+ `std::forward<T>` 保留实参的左右值属性，常用于工厂函数、`emplace_back` 等场景。

---

## 十、易错点速查表

| 易错点 | 正确做法 |
|--------|---------|
| 移动构造没加 `noexcept` | vector 扩容时会回退到拷贝 |
| `cv.wait` 没用谓词 | 虚假唤醒 |
| `shared_ptr` 循环引用 | 一端改用 `weak_ptr` |
| 基类析构非 virtual | `delete` 派生类对象内存泄漏 |
| lambda 引用捕获的局部变量出作用域 | 悬空引用 |
| `string_view` 持有临时字符串 | 悬空视图 |
| `optional` 解引用前没 check | UB |
| 协程返回值没有 `promise_type` | 编译报错 |
| `auto` 退化了数组/引用类型 | 用 `decltype(auto)` 或显式写类型 |
| `null` 当指针用 | 调用了 int 重载，用 `nullptr` |

---

## 十一、相关文章

- [八股文-1 入门基础](./八股文-1.md)
- [八股文-2 C++ 语言核心](./八股文-2-cpp-core.md)
- [八股文-3 STL 容器底层](./八股文-3-stl-containers.md)
- [八股文-4 高并发复合容器](./八股文-4-high-concurrency-containers.md)
- [八股文-5 Linux 操作系统](./八股文-5-linux-os.md)
- [八股文-6 网络编程与无锁](./八股文-6-network-lockfree.md)
- [八股文-7 MySQL 与调试](./八股文-7-mysql-debug.md)
- [八股文-8 数据结构进阶](./八股文-8-data-structures-advanced.md)
- [八股文-9 设计模式核心](./八股文-9-design-patterns.md)

> 至此，C++ 后端校招八股系列（10 篇）完结。从语言核心到 STL、从并发到网络、从数据库到调试、从数据结构到设计模式、最后到新特性与综合冲刺，覆盖了 2027 届校招面试全部高频考点。祝 offer 多多。
