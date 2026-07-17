---
title: CRTP 实战：eng_aud 插件式报文处理框架
date: 2026-05-20
tags:
  - C++
  - 项目经历
  - 网络编程
description: 基于 CRTP + 函数指针的编译期多态分派，消除热路径虚函数虚表开销，支撑 25+ Action × 10+ Node 高频报文处理
category: C++ 实战
---

# CRTP 实战：eng_aud 插件式报文处理框架

> 这是我在 ai_aas 实习期间负责的核心模块之一。本文从原理、代码、性能对比、面试追问四个维度，把 CRTP 在生产项目中的实践彻底讲透。

## 一、为什么需要 CRTP

ai_aas 的报文处理流水线长这样：

```plain
                    NodeBase (非模板基类)
                        ↑
                    Node<T> (CRTP 模板层)
                        ↑
            ┌───────────┼───────────┐
     EventParseNode  FragilityRiskNode  BehaviorRiskNode  ...
            │
     每个 Node 包含多个 Action：
            ↑
     ActionBase (非模板基类)
        ↑
    Action<T> (CRTP 模板层)
        ↑
┌───────┬────────┬──────────┬──────────────┐
SendAuditLog  Desensitization  JWTweak  WeakPasswd  ... (25+ 个 Action)
```

每条报文要遍历 N 个 Node、每个 Node 要遍历 M 个 Action。总计 **N×M 次多态调用/报文**。

按 25 Action × 10 Node = **250 次多态调用/报文**，每秒 3 万报文 → **750 万次多态调用/秒**。

如果用虚函数：每次虚函数调用约 2-5 ns（cache miss 情况下），750 万 × 3 ns = **22.5 ms/秒**，看似不多但累积起来明显。

更严重的是：**虚函数调用阻止编译器内联**。如果 `Process()` 方法体很短（10-50 行），内联后本可以零函数调用开销，但虚函数强制生成调用指令。

## 二、CRTP 是什么

**CRTP（Curiously Reccurring Template Pattern，奇特递归模板模式）** 是 C++ 中实现**编译期多态**的经典模式：

```cpp
template<typename T>
class Base {
public:
    void doSomething() {
        // 编译期类型 T 已知，直接 static_cast
        static_cast<T*>(this)->implementation();
    }
};

class Derived : public Base<Derived> {  // ← 模板参数是自身
public:
    void implementation() { /* 真正的业务逻辑 */ }
};
```

**核心思想**：通过模板参数把派生类类型注入基类，基类在编译期就知道派生类的真实类型，`static_cast<T*>(this)` 是**零成本**的类型转换。

## 三、eng_aud 中的两层 CRTP 实现

### 3.1 第一层：`Node<T>` 报文处理节点

**代码出处**：`common/pub_lib/src/frame_work/Node.h` 第 137~365 行

```cpp
// 基类：非模板，定义函数指针接口
class NodeBase : virtual public Object {
    // 函数指针类型，不是虚函数！
    typedef int (*DoProcessFunc)(NodeBase *base, struct record_info *record);
    DoProcessFunc m_doProcessFun;
    
    // 注释原文（Node.h 第 40~42 行）：
    // "这里没有将 DoProcess 设置成虚函数是因为，该方法时当前节点数据处理入口，
    //  虚函数调用会影响性能，所以内部使用指针回调的方式来模拟虚函数调用"
    int DoProcess(NodeBase *base, struct record_info *record) {
        return m_doProcessFun(base, record);
    }
};

// CRTP 模板层：编译期多态
template<typename T>
class Node : public NodeBase {
public:
    Node() {
        m_doProcessFun = DoProcess;  // 注册函数指针
    }
    
private:
    // 静态方法：通过 static_cast 调用派生类的具体实现
    static int DoProcess(NodeBase *base, struct record_info *record) {
        int ret = static_cast<T*>(base)->BeforeProcess(record);
        if (ret != 0) return ret;
        ret = static_cast<T*>(base)->Process(record);
        static_cast<T*>(base)->ActionsMatchSucc(record);
        return ret;
    }
};

// 真实业务节点：继承 Node<自身类型>
class FragilityRiskNode : public Node<FragilityRiskNode> {
public:
    int BeforeProcess(struct record_info *record);    // 前置检查
    int Process(struct record_info *record);           // 核心业务
    int ActionsMatchSucc(struct record_info *record);  // 后置处理
};
```

### 3.2 第二层：`Action<T>` 业务动作

**代码出处**：`common/pub_lib/src/frame_work/Action.h` 第 98~154 行

```cpp
class ActionBase : virtual public Object, virtual public StatisticBase {
    typedef int (*DoProcessFunc)(ActionBase *a, struct record_info *record);
    DoProcessFunc m_doProcessFun;
    
    // 同时保留低频虚函数
    virtual int ParseParam(...) = 0;       // 配置更新时调用，低频
    virtual int GetSnapShot(...) = 0;      // 调试/监控时调用，极低频
    virtual void ClearCurrentCacheData() = 0;  // 定时清理，低频
};

template<typename T>
class Action : public ActionBase {
public:
    Action() {
        m_doProcessFun = DoProcess;
    }
private:
    static int DoProcess(ActionBase *base, struct record_info *record) {
        return static_cast<T*>(base)->Process(record);
    }
};

// 25+ 个具体 Action 全部 CRTP
class SendAuditLogToDbAction : public Action<SendAuditLogToDbAction> {
    REGIST_OBJECT()  // 工厂注册宏
public:
    int Process(struct record_info *record);
};
```

### 3.3 运行时调用链

```plain
ActionBase::DoProcess(base, record)
  → base->m_doProcessFun(base, record)     // 函数指针调用
    → Action<SendAuditLogToDbAction>::DoProcess  // 静态方法
      → static_cast<SendAuditLogToDbAction*>(base)->Process(record)
        // 编译器看到的是 SendAuditLogToDbAction::Process 的直接调用
        // -O3 可以把 Process 体内联到这里
```

## 四、CRTP vs 虚函数 — 逐维度对比

| 维度 | 虚函数（virtual） | CRTP（static_cast + 函数指针） |
| --- | --- | --- |
| **分派时机** | 运行时，通过虚表（vtable） | 编译期，`static_cast<T*>` 类型已知 |
| **调用开销** | 1. 查 vptr → 2. 查 vtable 槽位 → 3. 间接跳转 | 1. 直接函数调用（编译期已确定地址） |
| **内联优化** | ❌ 无法内联 | ✅ 可被 `-O3` 内联 |
| **内存开销** | 每对象 +8 字节 vptr | 无额外内存（函数指针在基类共享） |
| **缓存友好性** | 差（vtable 间接访问可能 cache miss） | 好（直接调用，分支预测准确） |

### 4.1 调用路径对比图

```plain
=== 虚函数调用路径（假设用 virtual）===
ActionBase* base = factory->Create("SendAuditLog");
base->DoProcess(record);  // virtual call
  → [读 base 的 vptr]            ← 内存访问，可能 cache miss
  → [查 vtable[DoProcess 槽位]]  ← 内存访问，可能 cache miss
  → [间接跳转到 SendAuditLog::Process]  ← 分支预测可能失败

=== CRTP + 函数指针路径（实际实现）===
ActionBase* base = factory->Create("SendAuditLog");
base->DoProcess(base, record);
  → [读 base->m_doProcessFun]      ← 一次内存访问（函数指针）
  → [调用 Action<SendAuditLog>::DoProcess]  ← 直接跳转，地址编译期已知
    → static_cast<SendAuditLog*>(base)->Process(record)  ← 完全可内联！
      // 编译器看到的是 SendAuditLogToDbAction::Process 的直接调用
      // -O3 可以把 Process 体内联到这里，零函数调用开销
```

## 五、为什么是"CRTP + 函数指针"混合模式

这是面试官最爱追的点。**为什么不直接 `static_cast<T*>` 调用，还要中间加一层函数指针？**

答案：**工厂模式需要类型擦除**。

```cpp
// 工厂按字符串名称创建 Action
ActionBase* ActionFactory::create(const std::string& name) {
    // name 是运行时输入，工厂无法知道具体类型
    auto it = registry_.find(name);
    return it->second->newInstance();  // 返回 ActionBase*
}

// 调用方拿到的也是 ActionBase*
ActionBase* action = factory->create("SendAuditLog");
action->DoProcess(record);  // ← 这里不能直接 CRTP，因为不知道 T 是什么
```

**解决方案**：

- `ActionBase` 持有 `DoProcessFunc` 函数指针（类型擦除后的入口）
- `Action<T>` 模板构造时把 `&Action<T>::DoProcess`（其中含 `static_cast<T*>`）注册进去
- 运行时通过函数指针间接调用一次，**内部已是 CRTP 编译期分派**

> 这种模式有标准名称：**Customized Virtual Function** 或 **Function Pointer Virtual Dispatch**。Google Chrome 的 `base::BindCallback`、LLVM 的 `Pass` 系统都用类似技巧。

## 六、虚函数与 CRTP 的分层共存

eng_aud 并不是完全消灭虚函数，而是**按调用频率分层**：

| 方法 | 多态方式 | 调用频率 | 选型理由 |
| --- | --- | --- | --- |
| `DoProcess` | **CRTP + 函数指针** | 极高频（每报文） | 热路径，性能敏感 |
| `Process` | **CRTP**（`static_cast` 调用） | 高频（每报文） | 派生类核心逻辑 |
| `ParseParam` | `virtual` | 低频（配置更新时） | 灵活性优先 |
| `GetSnapShot` | `virtual` | 极低频（调试时） | 灵活性优先 |
| `ClearCurrentCacheData` | `virtual` | 低频（定时清理） | 灵活性优先 |

```cpp
class ActionBase : virtual public Object, virtual public StatisticBase {
    // CRTP 路径（高频热路径）
    DoProcessFunc m_doProcessFun;     // 函数指针，不虚
    
    // 虚函数路径（低频非热路径）
    virtual void GetShapeString(...) = 0;
    virtual int GetSnapShot(...) = 0;
    virtual void ClearCurrentCacheData() = 0;
    virtual int ParseParam() = 0;
};
```

> **面试话术**：_"我们不是盲目消灭所有虚函数，而是**按调用频率分层**：报文处理主循环中的 DoProcess 是热路径，每秒调用数十万次，用 CRTP；而 ParseParam、GetSnapShot 等方法只在配置更新或调试时调用，频率极低，保留 virtual 的灵活性。这是工程上的 trade-off — 性能 vs 可维护性。"_

## 七、虚拟继承（virtual public）的角色

注意 `ActionBase` 的定义：

```cpp
class ActionBase : virtual public Object, virtual public StatisticBase {
```

这里同时用了 **`virtual public` 继承**（虚拟继承）和 **CRTP**，两者解决完全不同的问题：

| 概念 | 作用 | 解决的问题 |
| --- | --- | --- |
| **虚拟继承**（`virtual public`） | 解决**菱形继承** | `Object` 和 `StatisticBase` 可能被多条路径继承，`virtual` 保证只保留一份子对象 |
| **CRTP**（`Action<T>`） | 解决**虚函数性能** | 用编译期 `static_cast` 替代运行时 vtable 查找 |

```plain
       Object      StatisticBase
          ↘          ↗
    virtual  virtual     ← 虚拟继承解决菱形问题
         ActionBase
            ↑
       Action<T>          ← CRTP 解决虚函数性能
            ↑
    SendAuditLogToDbAction
```

> **面试话术**：_"虚拟继承和虚函数都带 'virtual' 关键字但完全不同。虚拟继承解决菱形继承——保证基类子对象只出现一次；CRTP 解决虚函数性能——用编译期类型替换运行时分派。"_

## 八、thread_local 隔离 Action 子对象

**问题**：Action 是工厂注册的单例（`REGIST_OBJECT` 宏），多线程同时调用会共享内部状态。如果 Action 内有 mutable 状态（如临时缓冲），需要加锁。

**解决**：每个工作线程持有自己的 Action 实例（`thread_local`），状态完全隔离，**无竞争**（注意：不是"无锁"，是"无竞争"）。

```cpp
template<typename T>
class Action : public ActionBase {
    // ...
};

// 工作线程使用时
void worker_thread_main() {
    thread_local auto* my_action = 
        ActionFactory::createThreadLocalInstance<SendAuditLogToDbAction>();
    
    while (running) {
        Record* record = get_next_record();
        my_action->DoProcess(record);  // 完全无竞争
    }
}
```

**代价**：N 个线程 × M 个 Action 实例 = N×M 份内存。

- 12 线程 × 25 Action × 平均 1KB = **300 KB 总内存**，完全可接受。

## 九、CRTP 不适用的场景（面试雷区）

1. **类型在运行时才确定**：如插件式加载 `.so` 动态库，类型在编译期未知，只能用虚函数
2. **需要运行时类型检查**：如序列化/反序列化框架需要 RTTI 信息
3. **类型组合爆炸**：N 个基类 × M 个策略组合，CRTP 会导致 N×M 个模板实例化，编译时间爆炸
4. **二进制 ABI 兼容**：CRTP 模板在头文件中展开，修改模板会影响所有包含该头文件的编译单元

## 十、面试追问链与应答

### L1：CRTP 和虚函数的本质区别？

> 虚函数是**运行时多态**（动态分派）：通过对象的 vptr 查 vtable，两次间接内存访问 + 间接跳转，编译器无法内联。
>
> CRTP 是**编译期多态**（静态分派）：`static_cast<T*>(base)` 在编译期就确定了实际类型，编译器看到的是直接函数调用，可以内联优化。代价是基类不能用 `T` 类型 — 所以项目用**函数指针做桥接**。

### L2：既然 CRTP 这么好，为什么不全部用 CRTP 消灭虚函数？

> 两个原因：
>
> 1. **工厂模式需要运行时多态**：Action 对象通过 `ActionFactory` 按名称创建，返回 `ActionBase*`。如果全部 CRTP，工厂就不知道返回什么类型。
> 2. **灵活性 trade-off**：`ParseParam`、`GetSnapShot` 这些方法只有配置更新时才调用，频率极低。用 virtual 让派生类选择性 override，代码更简洁。

### L3：函数指针调用还是有一次间接跳转，为什么不彻底消灭？

> 彻底消灭意味着工厂返回具体类型 `T*`，但 `T` 在编译期是 25+ 种不同类型，无法用统一变量持有。除非用 `std::variant<T1*, T2*, ...>` 但类型列表必须编译期固定，新增 Action 就要修改 variant 定义，侵入性太强。
>
> 一次函数指针间接调用比虚函数的两次间接查表（vptr→vtable）少一次内存访问，且目标地址编译期已知，分支预测器预测更准确。

### L4：static_cast 和 dynamic_cast 区别？这里为什么用 static_cast？

> - `static_cast`：编译期类型转换，**零运行时开销**，但不做类型安全检查（如果类型错误是 UB）
> - `dynamic_cast`：运行时类型检查（查 RTTI），**有性能开销**，转换失败返回 nullptr
>
> 这里用 `static_cast<T*>` 是安全的 — 因为 `Action<T>` 模板保证了 T 一定是继承自 `Action<T>` 的派生类，编译器在实例化模板时就保证了类型正确性。`dynamic_cast` 在这里既不必要又浪费性能。

### L5：CRTP 在什么场景下不适用？

> 见第九节 4 条：运行时类型、RTTI 需求、类型组合爆炸、ABI 兼容性。

## 十一、关键代码片段汇总

### 11.1 完整 NodeBase + `Node<T>`

```cpp
class NodeBase : virtual public Object {
public:
    using DoProcessFunc = int (*)(NodeBase*, struct record_info*);
    
    int DoProcess(struct record_info *record) {
        return m_doProcessFun(this, record);
    }

protected:
    DoProcessFunc m_doProcessFun = nullptr;
};

template<typename T>
class Node : public NodeBase {
public:
    Node() {
        m_doProcessFun = &Node<T>::DoProcessImpl;
    }

private:
    static int DoProcessImpl(NodeBase *base, struct record_info *record) {
        T *derived = static_cast<T*>(base);
        int ret = derived->BeforeProcess(record);
        if (ret == 0) {
            ret = derived->Process(record);
            derived->ActionsMatchSucc(record);
        }
        return ret;
    }
};
```

### 11.2 业务 Node 定义

```cpp
class FragilityRiskNode : public Node<FragilityRiskNode> {
public:
    int BeforeProcess(struct record_info *record) {
        if (record->audit_id.empty()) return -1;
        return 0;
    }
    
    int Process(struct record_info *record) {
        // 脆弱性规则匹配主逻辑
        for (auto& rule : fragile_rules_) {
            if (rule.match(record)) {
                record->risk_level = std::max(record->risk_level, rule.level);
            }
        }
        return 0;
    }
    
    int ActionsMatchSucc(struct record_info *record) {
        // 匹配成功后的统计上报
        stats_.increment(record->api_id, record->risk_level);
        return 0;
    }
    
private:
    std::vector<FragilityRule> fragile_rules_;
    FragilityStats stats_;
};
```

## 十二、延伸阅读

- [ai_aas 项目介绍：企业级网络安全流量审计引擎](/posts/aas-1)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)
- [C++17 配置热更新：atomic 版本号 + thread_local + DCLP](/posts/config-hot-reload)

---

> CRTP 的核心不是"模板魔法"，而是**用编译期信息替代运行时查表**。理解了这一点，就能在性能敏感场景下灵活运用。
