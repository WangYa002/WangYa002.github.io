---
title: 设计模式核心八股
date: 2026-07-18
tags:
  - 设计模式
  - C++
  - 八股文
description: 单例/工厂/抽象工厂/观察者/桥接/装饰器/适配器/RAII — C++ 后端面试必考的 8 大设计模式
category: 八股文
---

# 设计模式核心八股

> 设计模式不是"为了用而用"，而是"沉淀下来的最佳实践"。本文按"创建型 → 结构型 → 行为型"组织，每个模式给出 C++ 实现 + 应用场景 + 易错点。

---

## 一、设计模式总览

### 1.1 三大分类

```text
┌─────────────────────────────────────────────────┐
│                 23 种设计模式                    │
├─────────────┬───────────────────────────────────┤
│             │ 单例 Singleton                     │
│ 创建型      │ 工厂方法 Factory Method            │
│ （5 种）    │ 抽象工厂 Abstract Factory          │
│ 关注：对象  │ 建造者 Builder                     │
│ 怎么"造"    │ 原型 Prototype                     │
├─────────────┼───────────────────────────────────┤
│             │ 适配器 Adapter                     │
│ 结构型      │ 桥接 Bridge                        │
│ （7 种）    │ 组合 Composite                     │
│ 关注：对象  │ 装饰器 Decorator                   │
│ 怎么"组装"  │ 外观 Facade                        │
│             │ 享元 Flyweight                     │
│             │ 代理 Proxy                         │
├─────────────┼───────────────────────────────────┤
│             │ 责任链 Chain of Responsibility     │
│ 行为型      │ 命令 Command                       │
│ （11 种）   │ 解释器 Interpreter                 │
│ 关注：对象  │ 迭代器 Iterator                    │
│ 怎么"交互"  │ 中介者 Mediator                    │
│             │ 备忘录 Memento                     │
│             │ 观察者 Observer                    │
│             │ 状态 State                         │
│             │ 策略 Strategy                      │
│             │ 模板方法 Template Method            │
│             │ 访问者 Visitor                     │
└─────────────┴───────────────────────────────────┘
```

### 1.2 6 大原则（SOLID + 迪米特）

| 原则 | 含义 |
| --- | --- |
| **单一职责** (SRP) | 一个类只做一件事 |
| **开闭原则** (OCP) | 对扩展开放，对修改关闭 |
| **里氏替换** (LSP) | 子类必须能替换父类 |
| **接口隔离** (ISP) | 接口小而专，不要"胖接口" |
| **依赖倒置** (DIP) | 依赖抽象，不依赖具体 |
| **迪米特法则** | 最少知道，只和直接朋友说话 |

---

## 二、单例模式（Singleton）

### 2.1 应用场景

全局只需要一个实例：
- 配置管理器
- 日志器
- 数据库连接池
- 线程池

### 2.2 三种经典实现

#### 饿汉式（启动即创建）

```cpp
class Singleton {
public:
    static Singleton& getInstance() {
        return instance_;   // 已存在，直接返回
    }
    
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;
    
private:
    Singleton() = default;
    static Singleton instance_;   // 静态成员，启动时构造
};

Singleton Singleton::instance_;
```

**优点**：线程安全（C++ 保证静态成员初始化原子）
**缺点**：启动慢，无法延迟创建

#### 懒汉式（DCLP 双检锁）

```cpp
class Singleton {
public:
    static Singleton* getInstance() {
        Singleton* tmp = instance_.load(std::memory_order_acquire);
        if (tmp == nullptr) {
            std::lock_guard<std::mutex> lock(mtx_);
            tmp = instance_.load(std::memory_order_relaxed);
            if (tmp == nullptr) {
                tmp = new Singleton();
                instance_.store(tmp, std::memory_order_release);
            }
        }
        return tmp;
    }
    
private:
    Singleton() = default;
    static std::atomic<Singleton*> instance_;
    static std::mutex mtx_;
};
```

**优点**：延迟创建
**缺点**：实现复杂，C++11 之前还有指令重排 bug

#### Magic Statics（C++11 推荐）

```cpp
class Singleton {
public:
    static Singleton& getInstance() {
        static Singleton instance;   // C++11 保证线程安全初始化
        return instance;
    }
    
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;
    
private:
    Singleton() = default;
    ~Singleton() = default;
};
```

**优点**：
- 简洁
- 线程安全（编译器插入锁保证）
- 延迟创建（首次调用时构造）
- 自动析构（静态变量生命周期）

### 2.3 单例的潜在问题

| 问题 | 原因 | 解决 |
| --- | --- | --- |
| 多线程竞争 | 静态变量初始化 | C++11 Magic Statics |
| 顺序依赖 | 多个单例相互依赖 | 用依赖注入替代 |
| 测试困难 | 全局状态 | 用依赖注入 |
| 析构顺序 | 静态变量析构顺序不确定 | 避免在析构中访问其他单例 |

### 2.4 单例 vs 全局变量

```cpp
// ❌ 全局变量
Database global_db;

// ✅ 单例
Database& db = Database::getInstance();
```

单例相对全局变量的改进：
- 控制访问（封装）
- 延迟初始化
- 保证唯一性
- 易于扩展（可加锁、加缓存）

---

## 三、工厂模式（Factory）

### 3.1 简单工厂

```cpp
class Shape {
public:
    virtual void draw() = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    void draw() override { std::cout << "Circle\n"; }
};

class Rectangle : public Shape {
public:
    void draw() override { std::cout << "Rectangle\n"; }
};

class ShapeFactory {
public:
    static std::unique_ptr<Shape> create(const std::string& type) {
        if (type == "circle") return std::make_unique<Circle>();
        if (type == "rectangle") return std::make_unique<Rectangle>();
        return nullptr;
    }
};

// 使用
auto shape = ShapeFactory::create("circle");
shape->draw();
```

**优点**：调用方只需知道名称，无需知道构造细节
**缺点**：新增类型需修改工厂（违反 OCP）

### 3.2 工厂方法

```cpp
class ShapeFactory {
public:
    virtual std::unique_ptr<Shape> create() = 0;
    virtual ~ShapeFactory() = default;
};

class CircleFactory : public ShapeFactory {
public:
    std::unique_ptr<Shape> create() override {
        return std::make_unique<Circle>();
    }
};

class RectangleFactory : public ShapeFactory {
public:
    std::unique_ptr<Shape> create() override {
        return std::make_unique<Rectangle>();
    }
};
```

**优点**：新增类型只需新增工厂，符合 OCP
**缺点**：类数量翻倍

### 3.3 抽象工厂

针对**产品族**（多个相关产品）：

```cpp
class Button { public: virtual void render() = 0; };
class TextBox { public: virtual void render() = 0; };

// Windows 风格
class WinButton : public Button { void render() override { /* ... */ } };
class WinTextBox : public TextBox { void render() override { /* ... */ } };

// Mac 风格
class MacButton : public Button { void render() override { /* ... */ } };
class MacTextBox : public TextBox { void render() override { /* ... */ } };

class UIFactory {
public:
    virtual std::unique_ptr<Button> createButton() = 0;
    virtual std::unique_ptr<TextBox> createTextBox() = 0;
};

class WinFactory : public UIFactory {
public:
    std::unique_ptr<Button> createButton() override { return std::make_unique<WinButton>(); }
    std::unique_ptr<TextBox> createTextBox() override { return std::make_unique<WinTextBox>(); }
};

class MacFactory : public UIFactory {
public:
    std::unique_ptr<Button> createButton() override { return std::make_unique<MacButton>(); }
    std::unique_ptr<TextBox> createTextBox() override { return std::make_unique<MacTextBox>(); }
};
```

**应用**：跨平台 UI（Qt、wxWidgets）

### 3.4 三种工厂对比

| 类型 | 适用场景 | 扩展类型 | 扩展产品族 |
| --- | --- | --- | --- |
| 简单工厂 | 类型少且稳定 | 修改工厂 | 修改工厂 |
| 工厂方法 | 单产品，类型多 | 加新工厂类 | N/A |
| 抽象工厂 | 产品族 | 改所有工厂 | 加新工厂类 |

---

## 四、观察者模式（Observer）

### 4.1 应用场景

- 事件总线
- 数据绑定
- 发布订阅
- GUI 信号槽（Qt）

### 4.2 实现

```cpp
#include <functional>
#include <vector>

class Subject {
public:
    using Callback = std::function<void(int)>;
    
    int subscribe(Callback cb) {
        int id = next_id_++;
        observers_.push_back({id, std::move(cb)});
        return id;
    }
    
    void unsubscribe(int id) {
        observers_.erase(
            std::remove_if(observers_.begin(), observers_.end(),
                [id](const auto& o) { return o.id == id; }),
            observers_.end());
    }
    
    void notify(int value) {
        for (const auto& o : observers_) {
            o.cb(value);
        }
    }
    
private:
    struct Observer { int id; Callback cb; };
    std::vector<Observer> observers_;
    int next_id_ = 0;
};

// 使用
Subject s;
int id = s.subscribe([](int v) { std::cout << "Got " << v << "\n"; });
s.notify(42);   // 输出 "Got 42"
s.unsubscribe(id);
```

### 4.3 Qt 的信号与槽

Qt 用元对象编译器（MOC）实现观察者：

```cpp
class MyClass : public QObject {
    Q_OBJECT
signals:
    void valueChanged(int value);
public slots:
    void onValueChanged(int v) { /* ... */ }
};

MyClass a, b;
QObject::connect(&a, &MyClass::valueChanged, &b, &MyClass::onValueChanged);
emit a.valueChanged(42);   // 触发 b.onValueChanged(42)
```

**底层**：MOC 生成额外的元数据，运行时通过函数指针数组分派。

---

## 五、桥接模式（Bridge）

### 5.1 应用场景

两个独立变化的维度，避免类爆炸。

**经典例子**：图形（Shape）× 颜色（Color）

```text
不用桥接：               用桥接：
Shape                    Shape ◄── Color
├── Circle               ├── Circle
│   ├── RedCircle        │   └── 持有 Color 指针
│   ├── BlueCircle       └── Square
│   └── GreenCircle          └── 持有 Color 指针
├── Square               
│   ├── RedSquare        Color
│   ├── BlueSquare       ├── Red
│   └── GreenSquare      ├── Blue
└── Triangle             └── Green
    ├── RedTriangle
    └── ...              (M × N 类)        (M + N 类)
```

### 5.2 实现

```cpp
class Color {
public:
    virtual std::string name() = 0;
    virtual ~Color() = default;
};

class Red : public Color { std::string name() override { return "Red"; } };
class Blue : public Color { std::string name() override { return "Blue"; } };

class Shape {
public:
    Shape(std::shared_ptr<Color> c) : color_(std::move(c)) {}
    virtual void draw() = 0;
    virtual ~Shape() = default;
protected:
    std::shared_ptr<Color> color_;
};

class Circle : public Shape {
public:
    using Shape::Shape;
    void draw() override {
        std::cout << "Circle with color " << color_->name() << "\n";
    }
};

// 使用
auto red = std::make_shared<Red>();
auto circle = std::make_unique<Circle>(red);
circle->draw();   // "Circle with color Red"
```

### 5.3 桥接 vs 策略

| 模式 | 关注点 | 生命周期 |
| --- | --- | --- |
| **桥接** | 抽象和实现独立扩展 | 实现长期持有 |
| **策略** | 算法可替换 | 短期使用，调用方决定 |

---

## 六、装饰器模式（Decorator）

### 6.1 应用场景

给对象动态添加功能，避免子类爆炸。

**经典例子**：咖啡订单

```text
不用装饰器：
Coffee
├── SimpleCoffee
├── MilkCoffee
├── SugarCoffee
├── MilkSugarCoffee
└── ...（组合爆炸）

用装饰器：
Component（接口）
├── SimpleCoffee（具体组件）
└── CoffeeDecorator（装饰器基类）
    ├── MilkDecorator
    └── SugarDecorator
```

### 6.2 实现

```cpp
class Coffee {
public:
    virtual std::string desc() = 0;
    virtual int cost() = 0;
    virtual ~Coffee() = default;
};

class SimpleCoffee : public Coffee {
public:
    std::string desc() override { return "Coffee"; }
    int cost() override { return 10; }
};

class CoffeeDecorator : public Coffee {
public:
    CoffeeDecorator(std::unique_ptr<Coffee> c) : coffee_(std::move(c)) {}
protected:
    std::unique_ptr<Coffee> coffee_;
};

class MilkDecorator : public CoffeeDecorator {
public:
    using CoffeeDecorator::CoffeeDecorator;
    std::string desc() override { return coffee_->desc() + " + Milk"; }
    int cost() override { return coffee_->cost() + 3; }
};

class SugarDecorator : public CoffeeDecorator {
public:
    using CoffeeDecorator::CoffeeDecorator;
    std::string desc() override { return coffee_->desc() + " + Sugar"; }
    int cost() override { return coffee_->cost() + 1; }
};

// 使用
auto coffee = std::make_unique<SugarDecorator>(
    std::make_unique<MilkDecorator>(
        std::make_unique<SimpleCoffee>()));
std::cout << coffee->desc() << " : " << coffee->cost() << "\n";
// "Coffee + Milk + Sugar : 14"
```

### 6.3 装饰器 vs 继承

| 维度 | 继承 | 装饰器 |
| --- | --- | --- |
| 扩展方式 | 静态（编译期） | 动态（运行时） |
| 类数量 | 爆炸（M × N） | 线性（M + N） |
| 灵活性 | 低 | 高 |
| 性能 | 直接调用 | 多层间接 |

---

## 七、适配器模式（Adapter）

### 7.1 应用场景

让不兼容的接口协同工作。

```cpp
// 旧接口
class OldLogger {
public:
    void writeMsg(const char* msg) { /* 写文件 */ }
};

// 新接口
class ILogger {
public:
    virtual void log(const std::string& msg) = 0;
    virtual ~ILogger() = default;
};

// 适配器：让 OldLogger 实现 ILogger
class LoggerAdapter : public ILogger {
public:
    LoggerAdapter(std::shared_ptr<OldLogger> old) : old_(std::move(old)) {}
    void log(const std::string& msg) override {
        old_->writeMsg(msg.c_str());
    }
private:
    std::shared_ptr<OldLogger> old_;
};

// 使用方只认 ILogger
void doWork(ILogger& logger) {
    logger.log("Hello");
}

auto oldLogger = std::make_shared<OldLogger>();
LoggerAdapter adapter(oldLogger);
doWork(adapter);
```

### 7.2 适配器 vs 装饰器 vs 桥接

| 模式 | 目的 |
| --- | --- |
| **适配器** | 转换接口，让不兼容的能一起用 |
| **装饰器** | 增强功能，不改变接口 |
| **桥接** | 分离两个独立维度 |

---

## 八、RAII（资源获取即初始化）

### 8.1 核心思想

把资源管理绑定到对象生命周期：
- **构造函数**：获取资源
- **析构函数**：释放资源
- **栈展开**：异常自动释放

```cpp
class FileGuard {
public:
    explicit FileGuard(const char* path) {
        fp_ = fopen(path, "r");
        if (!fp_) throw std::runtime_error("open failed");
    }
    
    ~FileGuard() {
        if (fp_) fclose(fp_);
    }
    
    FileGuard(const FileGuard&) = delete;            // 禁拷贝
    FileGuard& operator=(const FileGuard&) = delete;
    
    FileGuard(FileGuard&& other) noexcept : fp_(other.fp_) {
        other.fp_ = nullptr;
    }
    
    FILE* get() const { return fp_; }
    
private:
    FILE* fp_;
};

void process() {
    FileGuard f("data.txt");   // 获取
    // ... 使用 f.get()
    char buf[100];
    fgets(buf, 100, f.get());
    
    if (error) throw std::runtime_error("oops");   // 即使抛异常，fclose 也会被调用
    
}   // 自动释放
```

### 8.2 STL 中的 RAII

| 类 | 管理的资源 |
| --- | --- |
| `std::unique_ptr<T>` | 堆对象 |
| `std::shared_ptr<T>` | 共享堆对象 |
| `std::lock_guard<M>` | 互斥锁 |
| `std::unique_lock<M>` | 互斥锁（可移动） |
| `std::fstream` | 文件句柄 |
| `std::thread` | 线程（析构前必须 join 或 detach） |
| `std::vector<T>` | 动态数组 |

### 8.3 RAII 的优势

```cpp
// ❌ C 风格：容易忘 free
char* buf = malloc(1024);
do_something();
if (error) {
    free(buf);    // 必须显式释放
    return -1;
}
free(buf);

// ✅ RAII：自动释放
auto buf = std::make_unique<char[]>(1024);
do_something();
if (error) {
    return -1;    // 自动 delete[]
}
```

**关键**：异常安全。即使 `do_something()` 抛异常，`buf` 也会被释放。

---

## 九、CRTP（奇特递归模板模式）

### 9.1 静态多态

```cpp
template<typename Derived>
class Animal {
public:
    void makeSound() {
        static_cast<Derived*>(this)->makeSoundImpl();
    }
};

class Dog : public Animal<Dog> {
public:
    void makeSoundImpl() { std::cout << "Woof\n"; }
};

class Cat : public Animal<Cat> {
public:
    void makeSoundImpl() { std::cout << "Meow\n"; }
};

Dog d;
d.makeSound();   // Woof
```

**优势**：
- 编译期分派，零运行时开销
- 可被内联
- 无虚函数表

### 9.2 CRTP 应用

详见 [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)。

---

## 十、策略模式（Strategy）

### 10.1 应用场景

把算法封装成对象，运行时切换。

```cpp
class SortStrategy {
public:
    virtual void sort(std::vector<int>& v) = 0;
    virtual ~SortStrategy() = default;
};

class QuickSort : public SortStrategy {
public:
    void sort(std::vector<int>& v) override { /* ... */ }
};

class MergeSort : public SortStrategy {
public:
    void sort(std::vector<int>& v) override { /* ... */ }
};

class Sorter {
public:
    void setStrategy(std::unique_ptr<SortStrategy> s) {
        strategy_ = std::move(s);
    }
    void sort(std::vector<int>& v) {
        strategy_->sort(v);
    }
private:
    std::unique_ptr<SortStrategy> strategy_;
};
```

### 10.2 C++ 现代写法：std::function

```cpp
class Sorter {
public:
    using SortFn = std::function<void(std::vector<int>&)>;
    void setStrategy(SortFn s) { strategy_ = std::move(s); }
    void sort(std::vector<int>& v) { strategy_(v); }
private:
    SortFn strategy_;
};

// 使用
Sorter s;
s.setStrategy([](std::vector<int>& v) { std::sort(v.begin(), v.end()); });
```

---

## 十一、面试高频追问链

### Q1：单例 DCLP 在 C++11 之前为什么有 bug？

> `new Singleton()` 不是原子操作，分三步：
> 1. 分配内存
> 2. 构造对象
> 3. 返回指针
> 
> 编译器可能重排成 1 → 3 → 2，其他线程看到指针非 null 但对象还没构造完，导致用了一个半成品对象。C++11 起用 `std::atomic` + `acquire/release` 内存序可解决，但更推荐 Magic Statics。

### Q2：工厂方法 vs 抽象工厂怎么选？

> - 产品只有一个，类型多 → 工厂方法（如日志工厂：FileLogger/ConsoleLogger）
> - 产品多个，类型多，且需要成套使用 → 抽象工厂（如 UI 工厂：Button+TextBox+Dialog 一套）

### Q3：观察者模式怎么解决回调时观察者被销毁？

> 经典问题：在 notify 中遍历 observers 时，某个观察者的回调销毁了另一个观察者，导致悬空指针。
> 
> 解法：
> 1. 拷贝一份 observers 再遍历
> 2. weak_ptr 持有观察者，调用前检查是否存活
> 3. Qt 的 `QPointer` / `std::weak_ptr` 模式

### Q4：装饰器和代理模式区别？

> - **装饰器**：增强功能，调用方主动包裹
> - **代理**：控制访问，调用方感觉不到代理存在
> 
> 装饰器强调"增加行为"，代理强调"控制访问"（如远程代理、虚拟代理、保护代理）。

### Q5：CRTP 和虚函数的本质区别？

> 虚函数是**运行时多态**，通过 vtable 间接调用，无法内联；CRTP 是**编译期多态**，`static_cast<Derived*>(this)` 是零开销，可内联。代价是基类不能直接持有派生类对象（需模板或函数指针桥接，详见 eng_aud 项目）。

### Q6：RAII 怎么处理动态资源（如 socket）？

> 把 socket fd 封装成对象：

```cpp
class Socket {
public:
    Socket() : fd_(::socket(AF_INET, SOCK_STREAM, 0)) {
        if (fd_ < 0) throw std::runtime_error("socket failed");
    }
    ~Socket() { if (fd_ >= 0) ::close(fd_); }
    
    Socket(Socket&& o) noexcept : fd_(o.fd_) { o.fd_ = -1; }
    Socket& operator=(Socket&& o) noexcept {
        if (this != &o) {
            if (fd_ >= 0) ::close(fd_);
            fd_ = o.fd_;
            o.fd_ = -1;
        }
        return *this;
    }
    
    int fd() const { return fd_; }
private:
    int fd_;
};
```

---

## 十二、延伸阅读

- [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)
- [C++ 语言核心八股](/posts/八股文-2-cpp-core)
- [高并发复合容器设计](/posts/八股文-4-high-concurrency-containers)

---

> 设计模式是"经验的总结"。先理解它解决的问题，再去看它的结构。生搬硬套只会让代码更复杂。
