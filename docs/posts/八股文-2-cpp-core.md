---
title: C++ 语言核心八股
date: 2026-07-18
tags:
  - C++
  - 八股文
description: 智能指针/RAII/移动语义/虚函数表/模板/内存对齐/类型转换 — C++ 后端面试高频语言层八股 50 问
category: 八股文
---

# C++ 语言核心八股

> 整理自 C++ 后端实习与校招面试的高频考点。本文按"语言层 → 对象层 → 模板层 → 内存层"的逻辑组织，每条都给出原理 + 代码 + 易错点。

---

## 一、智能指针与 RAII

### 1.1 三大智能指针对比

| 智能指针 | 引用语义 | 控制块大小 | 线程安全 | 适用场景 |
| --- | --- | --- | --- | --- |
| `std::unique_ptr<T>` | 独占所有权 | 0（无控制块） | 否（不需要） | 默认选择，工厂返回、PIMPL |
| `std::shared_ptr<T>` | 共享所有权 | 16 字节（强计数 + 弱计数） | 计数原子，对象本身不安全 | 多线程共享对象、缓存 |
| `std::weak_ptr<T>` | 弱引用，不增加强计数 | 同 shared_ptr | 同 shared_ptr | 观察、打破循环引用、缓存 |

### 1.2 shared_ptr 的线程安全

```cpp
std::shared_ptr<T> sp = std::make_shared<T>();

// 线程安全的部分
auto sp2 = sp;          // 引用计数原子 +1，安全
auto sp3 = sp;          // 同上

// 不线程安全的部分
sp->modify();           // 多线程同时调用 modify 操作同一对象 → 数据竞争，需要加锁
*sp = T{};              // 重置指向的对象 → 数据竞争
```

**记忆口诀**：_引用计数是原子的（控制块），但指向对象不是_。

### 1.3 循环引用与 weak_ptr

```cpp
struct Node {
    std::shared_ptr<Node> next;     // ❌ 双向链表会循环引用
    std::shared_ptr<Node> prev;
};

// 修复：把其中一端改成 weak_ptr
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;       // ✅ 不增加强计数
};
```

使用时通过 `lock()` 提升为 shared_ptr：

```cpp
if (auto prev = node->prev.lock()) {
    prev->doSomething();
}
```

### 1.4 make_shared vs new shared_ptr

```cpp
// 推荐：一次分配，控制块和对象在同一块内存
auto sp = std::make_shared<T>(args...);

// 不推荐：两次分配（一次对象，一次控制块）
std::shared_ptr<T> sp(new T(args...));
```

**make_shared 缺点**：对象内存和控制块共享，弱引用活着时对象内存无法释放（延迟到 weak_ptr 全部销毁）。

### 1.5 RAII 资源管理

RAII（Resource Acquisition Is Initialization）：资源获取即初始化。

```cpp
class FileGuard {
public:
    explicit FileGuard(FILE* fp) : fp_(fp) {}
    ~FileGuard() { if (fp_) fclose(fp_); }
    
    // 移动构造（转移所有权）
    FileGuard(FileGuard&& other) noexcept : fp_(other.fp_) {
        other.fp_ = nullptr;
    }
    
    // 禁用拷贝
    FileGuard(const FileGuard&) = delete;
    FileGuard& operator=(const FileGuard&) = delete;
    
private:
    FILE* fp_;
};
```

**RAII 三原则**：
1. 构造函数获取资源
2. 析构函数释放资源
3. 禁用拷贝或实现移动语义

---

## 二、左右值与移动语义

### 2.1 左值 vs 右值

| 类型 | 含义 | 示例 | 能否取地址 |
| --- | --- | --- | --- |
| **左值** (lvalue) | 有名字、有地址 | `int a = 10;` 中的 `a` | ✅ |
| **纯右值** (prvalue) | 临时值、字面量 | `10`、`a + 1`、`func()` 返回值 | ❌ |
| **将亡值** (xvalue) | 即将被移动的对象 | `std::move(a)` | ❌ |

### 2.2 引用折叠规则

```cpp
T&  &   → T&     // 左值引用 + 左值引用 = 左值引用
T&  &&  → T&     // 左值引用 + 右值引用 = 左值引用
T&& &   → T&     // 右值引用 + 左值引用 = 左值引用
T&& &&  → T&&    // 右值引用 + 右值引用 = 右值引用
```

记忆：**只要有一个左值引用，结果就是左值引用**。

### 2.3 移动构造函数

```cpp
class Buffer {
public:
    Buffer(size_t n) : size_(n), data_(new int[n]) {}
    
    // 移动构造：偷资源
    Buffer(Buffer&& other) noexcept
        : size_(other.size_), data_(other.data_) {
        other.size_ = 0;
        other.data_ = nullptr;     // 必须！否则 other 析构会 delete[]
    }
    
    ~Buffer() { delete[] data_; }
    
private:
    size_t size_;
    int* data_;
};
```

**移动构造的 5 个要点**：
1. 参数是 `T&&`（右值引用）
2. 必须 `noexcept`（否则 vector 扩容时不会用移动而是拷贝）
3. 偷走源对象的资源
4. 把源对象置为安全状态（指针置空）
5. 源对象析构时不应该影响新对象

### 2.4 std::move 与 std::forward

```cpp
// std::move：无条件转成右值
template<typename T>
typename std::remove_reference<T>::type&& move(T&& t) noexcept {
    return static_cast<typename std::remove_reference<T>::type&&>(t);
}

// std::forward：完美转发（有条件转右值）
template<typename T>
T&& forward(typename std::remove_reference<T>::type& t) noexcept {
    return static_cast<T&&>(t);
}
```

**使用场景**：

```cpp
template<typename T>
void wrapper(T&& arg) {
    // std::forward 保持 arg 的左右值属性
    target(std::forward<T>(arg));
}
```

### 2.5 完美转发失败场景

```cpp
template<typename T>
void wrapper(T&& arg) {
    target({1, 2, 3});        // ❌ 花括号初始化列表无法转发
    target(static_cast<int>(0)); // ✅
}

// 拒绝的类型：位域、{...}、0 作为空指针
```

---

## 三、虚函数表与多态

### 3.1 虚函数表原理

```cpp
class Base {
public:
    virtual void foo() { std::cout << "Base::foo\n"; }
    virtual void bar() { std::cout << "Base::bar\n"; }
    int x_ = 0;
};

class Derived : public Base {
public:
    void foo() override { std::cout << "Derived::foo\n"; }
    int y_ = 0;
};
```

**内存布局**（64 位）：

```text
Base 对象（16 字节）：
+----------+------+
| vptr     | x_   |
| 8 字节   | 4 字节|
+----------+------+

Derived 对象（24 字节）：
+----------+------+------+
| vptr     | x_   | y_   |
| 8 字节   | 4 字节| 4 字节|
+----------+------+------+
```

**虚函数表（vtable）**：

```text
Base vtable:            Derived vtable:
[0] → &Base::foo       [0] → &Derived::foo   ← 重写
[1] → &Base::bar       [1] → &Base::bar      ← 未重写，继承
```

### 3.2 虚函数调用开销

```cpp
Base* p = new Derived;
p->foo();  // 虚函数调用
```

**实际执行**：
1. 通过 `p` 读取 `vptr`（指向 vtable）
2. 通过 vptr 找到 vtable[0]（foo 的槽位）
3. 间接跳转到 Derived::foo

**开销**：
- 1 次寄存器读（vptr）
- 1 次内存读（vtable 槽位）
- 1 次间接跳转（分支预测可能失败）
- **无法内联**

正常调用约 1-3 ns；虚函数调用约 2-5 ns（cache miss 时更慢）。

### 3.3 构造/析构函数中的虚函数

```cpp
class Base {
public:
    Base() { foo(); }              // ❌ 永远调用 Base::foo
    virtual ~Base() { bar(); }     // ❌ 永远调用 Base::bar
    virtual void foo() { std::cout << "B\n"; }
    virtual void bar() { std::cout << "B\n"; }
};

class Derived : public Base {
public:
    void foo() override { std::cout << "D\n"; }
    void bar() override { std::cout << "D\n"; }
};

Derived d;  // 输出 B B（不是 D D！）
```

**原因**：
- 构造时：派生类部分还没构造完，vptr 还指向 Base 的 vtable
- 析构时：派生类部分已经析构完，vptr 已经回退到 Base 的 vtable

### 3.4 纯虚函数与抽象类

```cpp
class Shape {
public:
    virtual double area() const = 0;   // 纯虚函数
    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    double area() const override { return 3.14 * r_ * r_; }
private:
    double r_;
};

// Shape s;             // ❌ 抽象类不能实例化
Shape* s = new Circle;  // ✅
```

### 3.5 override 与 final

```cpp
class Derived : public Base {
public:
    void foo() override;       // 编译器检查是否真的重写了基类虚函数
    void bar() final;          // 派生类无法再重写 bar
};

class FinalClass final {};    // 该类无法被继承
```

**好处**：避免签名不匹配导致"以为重写其实没有"的 bug。

---

## 四、模板与泛型

### 4.1 函数模板 vs 类模板

```cpp
// 函数模板：参数自动推导
template<typename T>
T max(T a, T b) { return a > b ? a : b; }

auto m = max(1, 2);         // T = int

// 类模板：必须显式指定
template<typename T>
class Stack {
public:
    void push(const T& val);
private:
    std::vector<T> data_;
};

Stack<int> s;
```

### 4.2 模板特化

```cpp
// 主模板
template<typename T>
struct TypeName { static const char* get() { return "unknown"; } };

// 全特化
template<>
struct TypeName<int> { static const char* get() { return "int"; } };

// 偏特化（仅类模板支持）
template<typename T>
struct TypeName<T*> { static const char* get() { return "pointer"; } };

TypeName<int>::get();         // "int"
TypeName<int*>::get();        // "pointer"
TypeName<double>::get();      // "unknown"
```

### 4.3 SFINAE 与 if constexpr

```cpp
// C++11/14：SFINAE（替换失败不是错误）
template<typename T,
         typename = typename std::enable_if<std::is_integral<T>::value>::type>
void print(T x) { std::cout << "integral: " << x << "\n"; }

// C++17：if constexpr（推荐）
template<typename T>
void print(T x) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << "integral: " << x << "\n";
    } else if constexpr (std::is_floating_point_v<T>) {
        std::cout << "float: " << x << "\n";
    } else {
        std::cout << "other\n";
    }
}
```

### 4.4 可变参数模板

```cpp
// 递归终止
void print() {}

template<typename T, typename... Args>
void print(T first, Args... rest) {
    std::cout << first << " ";
    print(rest...);
}

print(1, "hello", 3.14);  // 1 hello 3.14

// C++17 折叠表达式
template<typename... Args>
auto sum(Args... args) {
    return (args + ...);    // 二元右折叠
}

sum(1, 2, 3, 4);  // 10
```

### 4.5 模板为什么必须放头文件

模板实例化时编译器需要看到完整定义。两种解法：

```cpp
// 方法 1：实现放头文件（最常用）
// stack.h
template<typename T>
class Stack {
public:
    void push(const T& val) { data_.push_back(val); }   // 内联定义
private:
    std::vector<T> data_;
};

// 方法 2：显式实例化（适合库开发）
// stack.h：声明
template<typename T> class Stack;

// stack.cpp：显式实例化常用类型
template class Stack<int>;
template class Stack<double>;
```

---

## 五、类型转换

### 5.1 四种 cast 对比

| cast | 用途 | 检查时机 | 开销 | 示例 |
| --- | --- | --- | --- | --- |
| `static_cast` | 基本类型、上行/已知安全的下行转换 | 编译期 | 0 | `static_cast<double>(int_val)` |
| `dynamic_cast` | 多态类型下行转换 | 运行期（RTTI） | 较高 | `dynamic_cast<Derived*>(base_ptr)` |
| `const_cast` | 去除 const / volatile | 编译期 | 0 | `const_cast<char*>(const_char_ptr)` |
| `reinterpret_cast` | 位模式重新解释 | 编译期 | 0 | `reinterpret_cast<uintptr_t>(ptr)` |

### 5.2 dynamic_cast 原理

```cpp
class Base { public: virtual ~Base() = default; };
class Derived : public Base { public: void foo() {} };

Base* p = new Derived;
Derived* d = dynamic_cast<Derived*>(p);   // ✅ 返回有效指针
if (d) d->foo();

Base* p2 = new Base;
Derived* d2 = dynamic_cast<Derived*>(p2); // ❌ 返回 nullptr（不是 Derived）
```

**原理**：
- 查 RTTI（运行时类型信息）中的 type_info
- 沿继承链向上/向下匹配
- 失败返回 nullptr（指针）或抛 std::bad_cast（引用）

**为什么不推荐频繁用**：
1. 性能开销（多次内存访问查 RTTI）
2. 设计缺陷标志（多态应该用 virtual，不该频繁下行）

### 5.3 为什么 CRTP 用 static_cast 而不是 dynamic_cast

```cpp
template<typename T>
class Base {
public:
    void doSomething() {
        // T 一定继承自 Base<T>，模板实例化时编译器保证类型正确
        static_cast<T*>(this)->implementation();
    }
};
```

`dynamic_cast` 在这里：
- **不必要**：类型安全已由模板保证
- **浪费性能**：CRTP 的目的就是消除虚函数开销

---

## 六、内存管理与对齐

### 6.1 C++ 内存分区

```text
+------------------ 高地址
|     栈 (Stack)   |  局部变量、函数参数，向下增长
+------------------+
|       ↓          |
|     共享区        |  mmap、共享库
+------------------+
|     堆 (Heap)    |  new/malloc 分配，向上增长
+------------------+
|   BSS 段         |  未初始化全局/静态变量
+------------------+
|   DATA 段        |  已初始化全局/静态变量
+------------------+
|   TEXT 段        |  可执行代码（只读）
+------------------ 低地址
```

### 6.2 new vs malloc

| 对比项 | `new` | `malloc` |
| --- | --- | --- |
| 本质 | 运算符 | 函数 |
| 返回类型 | `T*`（类型安全） | `void*`（需 cast） |
| 调用构造/析构 | ✅ | ❌ |
| 失败行为 | 抛 `std::bad_alloc` | 返回 nullptr |
| 大小计算 | 自动（`sizeof(T)`） | 手动（`sizeof(T) * n`） |
| 可重载 | 类内可重载 | 全局可重载 |

### 6.3 内存对齐

**为什么对齐**：
1. CPU 一次读 8 字节（64 位），未对齐需读两次
2. 某些架构（ARM）不对齐直接 crash
3. 原子操作要求对齐

**对齐规则**：
1. 每个成员的偏移量必须是其自身大小的整数倍
2. 整个结构体大小必须是其最大成员的整数倍

```cpp
struct A {
    char c;     // 1B + 7B padding
    double d;   // 8B
    int i;      // 4B + 4B padding
};              // sizeof = 24

struct B {
    double d;   // 8B
    int i;      // 4B
    char c;     // 1B + 3B padding
};              // sizeof = 16（更紧凑）
```

**手动控制对齐**：

```cpp
// C++11
struct alignas(64) CacheLine {  // 对齐到 64 字节（缓存行）
    int data[16];
};

// 编译期查询
static_assert(alignof(CacheLine) == 64);
```

### 6.4 内存泄漏检测

**4 种常见泄漏**：
1. `new` 后忘记 `delete`
2. 异常导致 `delete` 跳过
3. shared_ptr 循环引用
4. 全局 static 容器不断 push 但不清理

**Valgrind 检测**：

```bash
valgrind --tool=memcheck --leak-check=full ./your_program
```

输出关键字段：
- **definitely lost**：确定泄漏
- **indirectly lost**：间接泄漏
- **possibly lost**：可能泄漏
- **still reachable**：程序结束时仍可达（不一定是泄漏）

---

## 七、auto / decltype / 现代 C++

### 7.1 auto 推导规则

```cpp
auto x = 10;              // int
auto& y = x;              // int&
const auto& z = x;        // const int&
auto* p = &x;             // int*
auto&& r1 = x;            // int& (引用折叠，x 是左值)
auto&& r2 = 10;           // int&& (10 是右值)
```

### 7.2 decltype 推导规则

```cpp
int i = 10;
decltype(i) a;            // int（标识符，原样）
decltype((i)) b = i;      // int&（带括号，左值引用）
decltype(i + 0) c;        // int（表达式，prvalue）
decltype(std::move(i)) d; // int&&（xvalue）
```

**记忆**：`decltype((var))` 永远是引用，`decltype(var)` 是原类型。

### 7.3 nullptr vs NULL

```cpp
void f(int);
void f(char*);

f(NULL);       // ❌ 二义性，可能调 f(int)
f(nullptr);    // ✅ 明确调 f(char*)
```

`nullptr` 的类型是 `std::nullptr_t`，可隐式转换成任何指针类型，但不能转 int。

### 7.4 constexpr vs const

```cpp
const int x = compute();           // 运行时常量
constexpr int y = 42;              // 编译期常量

constexpr int factorial(int n) {   // 编译期可计算
    return n <= 1 ? 1 : n * factorial(n - 1);
}

int arr[factorial(5)];             // ✅ 编译期已知大小
```

---

## 八、static / extern / const / inline

### 8.1 static 的四种用法

```cpp
// 1. 函数内：静态局部变量，只初始化一次
int counter() {
    static int n = 0;       // 仅第一次调用初始化
    return ++n;
}

// 2. 文件内：静态全局变量/函数，限制在该文件
static int internal_var = 42;
static void helper() {}     // 其他文件看不到

// 3. 类内：静态成员变量，所有对象共享
class Foo {
    static int count_;      // 声明
};
int Foo::count_ = 0;        // 定义（cpp 文件中）

// 4. 类内：静态成员函数，无 this 指针
class Foo {
    static int get_count() { return count_; }   // 不能访问非静态成员
};
```

**C++11 后静态局部变量线程安全**（Magic Statics），可用作线程安全的单例：

```cpp
class Singleton {
public:
    static Singleton& instance() {
        static Singleton inst;   // 线程安全，C++11 保证
        return inst;
    }
private:
    Singleton() = default;
};
```

### 8.2 extern 的作用

```cpp
// extern 声明：变量定义在别处
extern int g_count;     // 告诉编译器：g_count 在其他文件定义
extern void foo();      // 告诉编译器：foo 在其他文件定义

// extern "C"：禁用 C++ 名称修饰
extern "C" {
    int c_function(int x);   // 用 C 链接，可以被 C 代码调用
}
```

**名称修饰示例**：

```text
C++ 函数 void foo(int, double)  →  _Z3food
C   函数 void foo(int, double)  →  foo
```

### 8.3 const 修饰指针

```cpp
int x = 10;
const int* p1 = &x;        // 常量指针（指向 const int），*p1 不能改，p1 能改
int* const p2 = &x;        // 指针常量，*p2 能改，p2 不能改
const int* const p3 = &x;  // 都不能改
```

**记忆口诀**：_const 在 * 左边修饰数据，在 * 右边修饰指针_。

### 8.4 inline 的真相

```cpp
// 现代含义：允许多重定义（链接器去重），不强制内联
inline int add(int a, int b) { return a + b; }

// 类内定义的成员函数隐式 inline
class Foo {
    int get() const { return x_; }   // 隐式 inline
};
```

**关键**：C++17 后 `inline` 还可以修饰变量：

```cpp
struct Config {
    static inline int version = 1;   // C++17 头文件中定义
};
```

---

## 九、其他高频语言八股

### 9.1 sizeof 原理

```cpp
// sizeof 是运算符，编译期求值
static_assert(sizeof(int) == 4);

// 数组：整个数组大小
int arr[10];
sizeof(arr);     // 40

// 指针：固定 4（32位）/ 8（64位）
int* p = arr;
sizeof(p);       // 8

// 空类：1（保证不同对象地址不同）
class Empty {};
sizeof(Empty);   // 1

// 只有虚函数的类：8（vptr）
class V { public: virtual ~V() = default; };
sizeof(V);       // 8
```

### 9.2 指针 vs 引用

| 维度 | 指针 | 引用 |
| --- | --- | --- |
| 是否占用内存 | 是（8 字节） | 通常优化为 0 |
| 能否为空 | ✅ nullptr | ❌ 必须绑定 |
| 能否重新绑定 | ✅ | ❌ |
| 多级 | ✅ `int**` | ❌（无引用的引用） |
| 算术运算 | ✅ `p + 1` | ❌ |
| 使用前需检查 | 是 | 否 |

### 9.3 struct vs class

```cpp
struct A { int x; };    // 默认 public
class  B { int x; };    // 默认 private
```

**唯一区别**：默认访问权限。功能上完全相同。

### 9.4 拷贝构造 vs 移动构造

```cpp
class Buffer {
public:
    // 拷贝构造：深拷贝
    Buffer(const Buffer& other) : size_(other.size_), data_(new int[size_]) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    
    // 移动构造：偷资源
    Buffer(Buffer&& other) noexcept
        : size_(other.size_), data_(other.data_) {
        other.size_ = 0;
        other.data_ = nullptr;
    }
};

Buffer a(1024);
Buffer b = a;              // 调拷贝构造（深拷贝，慢）
Buffer c = std::move(a);   // 调移动构造（O(1)）
```

### 9.5 浅拷贝 vs 深拷贝

```cpp
class MyBuffer {
public:
    MyBuffer(size_t n) : size_(n), data_(new int[n]) {}
    
    // 浅拷贝（危险，会导致 double free）
    // MyBuffer(const MyBuffer&) = default;
    
    // 深拷贝
    MyBuffer(const MyBuffer& other) : size_(other.size_), data_(nullptr) {
        if (other.data_) {
            data_ = new int[size_];
            std::copy(other.data_, other.data_ + size_, data_);
        }
    }
    
    // 拷贝赋值（注意自赋值检查）
    MyBuffer& operator=(const MyBuffer& other) {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            data_ = size_ ? new int[size_] : nullptr;
            std::copy(other.data_, other.data_ + size_, data_);
        }
        return *this;
    }
    
private:
    size_t size_;
    int* data_;
};
```

### 9.6 memcpy / memmove / strcpy

```cpp
char src[] = "hello";
char dst[10];

memcpy(dst, src, 6);      // 不允许 src 和 dst 重叠
memmove(dst, src, 6);     // 允许重叠（内部判断方向）
strcpy(dst, src);         // 遇 '\0' 停止
```

**性能**：memcpy > memmove > strcpy。

### 9.7 RVO / NRVO

```cpp
std::vector<int> makeVec() {
    std::vector<int> v(1000);
    return v;     // RVO：直接构造在调用方栈帧
}

auto vec = makeVec();   // C++17 起保证不拷贝
```

**规则**：
- C++17 前是优化（编译器可做可不做）
- C++17 后是**保证**（同一作用域返回值类型直接构造在调用方）

---

## 十、面试高频追问链

### Q1：shared_ptr 是怎么实现线程安全的？

> 引用计数使用原子操作（`std::atomic<long>`）。强引用计数和弱引用计数都在控制块中，控制块本身是线程安全的。但**指向的对象本身**不是线程安全的，多线程同时调用对象的非 const 方法仍需加锁。

### Q2：unique_ptr 为什么不能拷贝？

> 拷贝构造和拷贝赋值被 `delete`：

```cpp
unique_ptr(const unique_ptr&) = delete;
unique_ptr& operator=(const unique_ptr&) = delete;
```

> 但支持移动构造/移动赋值，所有权转移后源对象变 nullptr。

### Q3：移动构造为什么必须 noexcept？

> STL 容器（如 `std::vector`）在扩容迁移元素时，会先用 `std::is_nothrow_move_constructible` 检查。如果是 noexcept，用移动；否则为了保证强异常安全，用拷贝（异常时回退）。

```cpp
std::vector<Buffer> v;
v.push_back(Buffer(1024));   // 如果 Buffer 的移动不是 noexcept，会调拷贝
```

### Q4：虚函数表存在哪里？

> 每个有虚函数的类对应一个 vtable，存在只读数据段（`.rodata`）。每个对象在构造时，前 8 字节存一个 `vptr`，指向所属类的 vtable。构造期间 vptr 会经历 Base::vtable → Derived::vtable 的切换。

### Q5：纯虚函数可以有实现吗？

> 可以，但只能由派生类显式调用：

```cpp
struct Base {
    virtual void foo() = 0;
};
void Base::foo() { std::cout << "Base::foo impl\n"; }

struct Derived : Base {
    void foo() override { Base::foo(); }   // 显式调用
};
```

### Q6：构造函数可以是虚函数吗？

> 不能。虚函数依赖 vptr，而 vptr 是在构造过程中才设置的。构造函数调用时对象还不是一个完整的对象，没有 vptr 可用。所以构造函数本质上是**编译期已知**的，不需要虚函数分派。

### Q7：模板为什么不能分文件写？

> 模板需要实例化才能生成代码。如果声明在 .h、定义在 .cpp，调用方只看到声明，编译时无法实例化。要么定义放头文件，要么在 .cpp 中显式实例化（`template class Foo<int>;`）。

### Q8：static 变量在多线程下安全吗？

> C++11 起，**函数内的静态局部变量初始化是线程安全的**（Magic Statics），由编译器插入锁保证。但**初始化之后的访问**仍需自行加锁。

```cpp
Singleton& get() {
    static Singleton inst;   // 初始化线程安全
    return inst;             // 访问仍需自行保证
}
```

---

## 十一、延伸阅读

- [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)
- [C++17 配置热更新：atomic 版本号 + thread_local + DCLP](/posts/config-hot-reload)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)
- [STL 容器底层剖析](/posts/八股文-3-stl-containers)

---

> C++ 的"复杂"不是语言设计的任性，而是为了零开销抽象。每个特性背后都有性能或安全上的考量。
