---
title: GCC 编译优化实战
date: 2026-07-19
tags:
  - GCC
  - 编译优化
  - C++
  - 性能
  - 八股文
description: GCC -O 等级/内联/循环优化/LTO/PGO/BOLT + Sanitizer + 调试符号 — 编译期工程优化全解
category: 工具与部署
---

# GCC 编译优化实战

> 编译器是 C++ 工程师最好的性能优化搭档。本文从编译四阶段讲起，对比 -O0/-O1/-O2/-O3/-Os/-Ofast/-Og 七个等级，再深入内联、循环、LTO、PGO、BOLT，最后给反汇编对比与 Sanitizer 选型。

---

## 一、编译四阶段

```text
   source.cpp
       ↓
   ┌───────────┐
   │  预处理    │  g++ -E source.cpp -o source.ii   (-E)
   │  -E       │  展开 #include、#define
   └─────┬─────┘
         ↓
   ┌───────────┐
   │  编译      │  g++ -S source.ii -o source.s     (-S)
   │  -S       │  生成汇编
   └─────┬─────┘
         ↓
   ┌───────────┐
   │  汇编      │  g++ -c source.s -o source.o      (-c)
   │  -c       │  生成目标文件
   └─────┬─────┘
         ↓
   ┌───────────┐
   │  链接      │  g++ source.o -o source           (默认)
   │           │  符号解析、动态库/静态库合并
   └───────────┘
```

每一步产物可独立查看：

```bash
g++ -E main.cpp -o main.ii         # 看预处理后（含展开的所有头）
g++ -S main.cpp -o main.s          # 看汇编
objdump -d main.o                  # 反汇编 .o 文件
readelf -s main.o                  # 看符号表
nm main.o                          # 同上简化
```

---

## 二、-O 等级对比

| 等级 | 含义 | 调试 | 适用 |
| --- | --- | --- | --- |
| **-O0** | 默认，不优化 | ✅ 完美 | 开发调试 |
| **-O / -O1** | 基础优化 | 较好 | 编译提速 |
| **-O2** | 安全优化，**生产推荐** | 差 | 生产 |
| **-O3** | 激进优化（含 -O2 + 循环展开/向量化） | 差 | 性能关键路径 |
| **-Os** | 优化代码体积（嵌入式） | 差 | 嵌入式 |
| **-Ofast** | -O3 + -ffast-math | 差 | 数值计算（破坏 IEEE754） |
| **-Og** | 调试友好的优化 | ✅ | GCC 推荐调试模式 |

### 2.1 各等级启用的 -f 选项

```bash
# 看每个 -O 等级开了哪些 -f
g++ -O2 -Q --help=optimizers | head
g++ -O3 -Q --help=optimizers | head
g++ -O2 -O3 -Q --help=optimizers | grep enabled  # 看 O3 比 O2 多开什么
```

**O1 包含**（典型）：
- `-fauto-inc-dec`：自增自减合并
- `-fcombine-stack-adjustments`
- `-fcompare-elim`
- `-fdce`：死代码消除
- `-fdse`：死存储消除
- `-fforward-propagate`
- `-fguess-branch-probability`
- `-fif-conversion` / `-fif-conversion2`
- `-finline-functions-called-once`
- `-ftree-dce` / `-ftree-dse`
- `-ftree-ccp`：常量传播

**O2 比 O1 多**（典型）：
- `-finline-functions` / `-finline-small-functions`
- `-findirect-inlining`
- `-fpartial-inlining`
- `-ftree-vrp`：值范围传播
- `-fpeephole2`
- `-fschedule-insns` / `-fschedule-insns2`：指令调度
- `-fstrict-aliasing`
- `-ftree-sra`：标量替换
- `-fgcse` / `-fgcse-lm`：全局公共子表达式消除

**O3 比 O2 多**（典型）：
- `-finline-functions`：内联更多函数
- `-funswitch-loops`
- `-fgcse-after-reload`
- `-fpeel-loops`
- `-fpredictive-commoning`
- `-fsplit-loops`
- `-fsplit-paths`
- `-ftree-loop-distribution`
- `-ftree-partial-pre`
- `-ftree-vectorize`：自动向量化
- `-fvect-cost-model=dynamic`
- `-funroll-loops`（隐含）

**Os 比 O2 少**（避免体积增大）：
- 关掉 `-finline-functions`、`-fprefetch-loop-arrays` 等
- 加 `-Os`：体积优先

### 2.2 O3 一定比 O2 快吗？

**不一定**。常见反例：
- **指令缓存抖动**：循环展开让代码体积膨胀，I-cache miss 增加。
- **激进向量化**：在小循环上反而引入开销。
- **过度内联**：函数膨胀，编译时间+代码体积都涨。

经验值：
- 网络密集型业务：`-O2` 足够。
- 计算密集（图像/视频/AI 推理）：`-O3` 有 5-15% 收益。
- 测了 benchmark 才知道。

---

## 三、关键优化技术（反汇编对比）

### 3.1 内联展开

```cpp
inline int add(int a, int b) { return a + b; }

int main() {
    return add(1, 2);
}
```

**-O0**：

```asm
main:
    push   rbp
    mov    rbp, rsp
    mov    esi, 1
    mov    edi, 2            ; 参数
    call   add(int, int)     ; 真的 call 了
    ...
```

**-O2**：

```asm
main:
    mov    eax, 3            ; 直接返回 3
    ret
```

**强制内联**：

```cpp
__attribute__((always_inline)) inline int add(int a, int b);
// 或在类内定义的成员函数自动 inline
```

**禁止内联**：

```cpp
__attribute__((noinline)) int heavy();
```

**GCC 12+ 的 `-Winline`** 警告本应内联但没成功的函数。

### 3.2 循环展开

```cpp
for (int i = 0; i < 100; ++i) {
    sum += arr[i];
}
```

**-O3 -funroll-loops** 编译成：

```asm
    mov    eax, 0
    mov    ecx, 0
.L2:
    add    eax, DWORD PTR arr[rcx]
    add    eax, DWORD PTR arr[rcx+4]
    add    eax, DWORD PTR arr[rcx+8]
    add    eax, DWORD PTR arr[rcx+12]    ; 一次 4 个
    add    rcx, 16
    cmp    rcx, 400
    jne    .L2
```

收益：循环开销（cmp/jne）减少到 1/4，指令流水更顺。

代价：代码体积变大，I-cache 压力。

### 3.3 自动向量化

```cpp
void add_arrays(int* a, int* b, int* c, int n) {
    for (int i = 0; i < n; ++i) {
        c[i] = a[i] + b[i];
    }
}
```

**-O2 -ftree-vectorize -march=native**（开启 AVX2）：

```asm
.Lvec:
    vmovdqu ymm0, [rdi+rax*4]      ; 一次加载 8 个 int
    vmovdqu ymm1, [rsi+rax*4]
    vpaddd  ymm0, ymm0, ymm1       ; 8 个 int 同时加
    vmovdqu [rdx+rax*4], ymm0
    add     rax, 8
    cmp     rax, r8
    jb      .Lvec
```

8 倍提速。

**关键参数**：
- `-march=native`：用本机所有指令集（AVX2、AVX-512、NEON）。
- `-fopt-info-vec-optimized=stderr`：打印哪些循环被向量化。
- `-fopt-info-vec-missed=stderr`：哪些没被向量化（找原因）。

**常见无法向量化的原因**：
- 循环有数据依赖（`a[i] = a[i-1] + 1`）
- 函数调用（除非被内联）
- 复杂分支
- `alias`：编译器不确定 `a` 和 `c` 是否重叠 → 加 `__restrict` 关键字解决

### 3.4 常量传播 + 死代码消除

```cpp
int x = 5;
int y = x * 2;
if (y > 100) { /* dead */ }
return y;
```

**编译期直接算出**：

```asm
mov    eax, 10
ret
```

### 3.5 尾调用优化（TCO）

```cpp
int factorial(int n, int acc = 1) {
    if (n <= 1) return acc;
    return factorial(n - 1, n * acc);  // 尾递归
}
```

**-O2** 把递归转成循环，O(1) 栈空间，避免栈溢出。

### 3.6 强度削减（Strength Reduction）

```cpp
for (int i = 0; i < n; ++i) {
    arr[i * 4] = 1;     // 乘法
}
```

**优化为加法**：

```cpp
for (int idx = 0; idx < n*4; idx += 4) {
    arr[idx] = 1;       // 加法
}
```

乘法变加法，CPU 周期减少。

---

## 四、LTO（Link Time Optimization）

**原理**：编译期每个 cpp 编译成带 GIMPLE 中间表示的 `.o`，链接期所有 GIMPLE 汇总再做一次全局优化（跨文件内联、虚拟函数去虚化、删除未用代码）。

```text
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ foo.cpp  │ │ bar.cpp  │ │ main.cpp │
   └────┬─────┘ └────┬─────┘ └────┬─────┘
        │ g++ -flto  │            │
        ↓            ↓            ↓
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ foo.o    │ │ bar.o    │ │ main.o   │   ← 携带 GIMPLE
   │ (LTO)    │ │ (LTO)    │ │ (LTO)    │
   └────┬─────┘ └────┬─────┘ └────┬─────┘
        │            │            │
        └────────────┴────────────┘
                     ↓
            ┌──────────────────┐
            │  链接器 + LTO    │ ← 全局优化
            │  • 跨文件内联    │
            │  • 去虚化        │
            │  • DCE           │
            └────────┬─────────┘
                     ↓
                  binary
```

### 4.1 启用

```bash
g++ -O2 -flto main.cpp foo.cpp bar.cpp -o app

# 或在 CMake 里
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION_RELEASE ON)
```

### 4.2 与 ar/nm 配合

LTO 的 `.o` 文件含特殊符号，普通 `ar` 不认识，需 `gcc-ar` / `gcc-nm` / `gcc-ranlib`：

```bash
gcc-ar rcs libfoo.a foo.o bar.o
gcc-nm libfoo.a
```

CMake 自动处理（`CMAKE_AR` 在 `-flto` 时会切到 `gcc-ar`）。

### 4.3 收益与代价

| 项目 | 收益 |
| --- | --- |
| 跨文件内联 | 中等函数 5-15% 加速 |
| 去虚化（devirtualization） | 多态调用 10% 加速 |
| DCE | 减小体积 5-30% |
| 链接时间 | 增加 2-5 倍 |
| 内存峰值 | 编译器内存涨 2-3 倍 |

**`-flto=auto`**（GCC 10+）自动用所有 CPU 核并行做 LTO。

### 4.4 实测对比（编造数据示意）

```text
benchmark                -O2      -O2+LTO    -O3+LTO+PGO
hash_array(1M items)     450ms    420ms (-7%)   350ms (-22%)
parse_json(1MB)          220ms    200ms (-9%)   170ms (-23%)
matrix_mult(1024²)       980ms    950ms (-3%)   820ms (-16%)
```

---

## 五、PGO（Profile-Guided Optimization）

**三步走**：

```bash
# 1. 编译期插桩
g++ -O2 -fprofile-generate -o app_prof main.cpp

# 2. 跑典型负载收集 profile
./app_prof input1.txt input2.txt ...
# 生成 *.gcda 文件

# 3. 用 profile 重新编译
g++ -O2 -fprofile-use -o app main.cpp
```

### 5.1 收益来源

- **分支预测**：编译器知道 `if (likely(x))` 的真实概率，生成更好的代码。
- **内联决策**：热路径激进内联，冷路径不内联（减体积）。
- **代码布局**：热函数放一起，I-cache 友好。

### 5.2 实际应用

- **Chrome**：用 PGO 编译，性能提升 10-15%。
- **Firefox**：同样大量使用 PGO。
- **数据库**：MySQL/PostgreSQL 性能关键路径都用 PGO。

### 5.3 注意

- profile 数据要**有代表性**（用真实流量跑）。
- profile 过时（代码大改后）效果打折。
- 编译时间显著增加（两次编译）。

---

## 六、BOLT（Post-Link Optimization）

BOLT 是 LLVM 工具（GCC 项目没有），但与 LTO/PGO 概念互补：

```text
   源码 → 编译 → 链接 → 二进制
                            ↓
                       BOLT 后处理
                            ↓
                       优化后二进制
```

特点：
- 链接**之后**再优化（不动源码、不重新链接）。
- 利用 PGO 数据做更激进的代码布局。
- Chrome/LLVM 自身在 BOLT 后获得 2-7% 额外加速。

---

## 七、架构相关优化

```bash
# 启用本机所有指令集
g++ -O2 -march=native main.cpp

# 显式指定
g++ -O2 -march=skylake main.cpp       # Intel Skylake
g++ -O2 -march=x86-64-v3 main.cpp     # x86-64 v3（含 AVX2）
g++ -O2 -march=armv8.2-a main.cpp     # ARM v8.2

# 调优但不开启新指令集
g++ -O2 -mtune=native main.cpp

# ARM NEON
g++ -O2 -mfpu=neon main.cpp
```

**`-march` vs `-mtune`**：

| 标志 | 含义 |
| --- | --- |
| `-march=native` | **用**本机新指令（AVX2/AVX-512），二进制不能跨机器跑 |
| `-mtune=native` | 调度对齐本机 CPU，但**不用**新指令，可跨机器 |

**警告**：`-march=native` 编出来的二进制**不能**部署到旧 CPU！

---

## 八、ABI 兼容

### 8.1 C++11 std::string/std::list ABI 切换

GCC 5 开始 `std::string` 和 `std::list` 切换到 C++11 ABI（小字符串优化、list 节点结构改了）。

```bash
# 旧 ABI（兼容老库）
g++ -D_GLIBCXX_USE_CXX11_ABI=0 ...

# 新 ABI（推荐，C++11 标准）
g++ -D_GLIBCXX_USE_CXX11_ABI=1 ...
```

**问题**：如果链接的两个库一个 0 一个 1，`std::string` 没法在它们之间传递（运行时崩溃）。

**解决**：项目统一选 1。

### 8.2 关闭 RTTI / 异常

```bash
g++ -fno-rtti          # 减小体积，禁用 typeid/dynamic_cast
g++ -fno-exceptions    # 禁用异常
```

**代价**：
- 任何用 `dynamic_cast`、`typeid` 的代码都编不过。
- `throw`/`try`/`catch` 编不过。
- 与第三方库（如 glog、gflags）ABI 不兼容。

**适用**：嵌入式、游戏引擎、极致体积优化。**普通业务不要用**。

---

## 九、调试符号

| 标志 | 含义 |
| --- | --- |
| `-g` | 等同 `-g2`，基础调试信息 |
| `-g0` | 无调试信息 |
| `-g1` | 仅函数级 |
| `-g2` | 含局部变量 |
| `-g3` | 含宏定义（展开 `#define`） |
| `-ggdb` | GDB 专用 DWARF 格式 |
| `-gsplit-dwarf` | debug info 拆到 `.dwo`，二进制瘦身 |
| `-fno-omit-frame-pointer` | **必加**，保留帧指针，调试/perf 依赖 |

### 9.1 build-id 与 debuginfo 包

```bash
# 二进制里的 build-id
readelf -n app | grep "Build ID"
# 输出：Build ID: abc123def456...

# RHEL/Fedora 安装 debuginfo
debuginfo-install mypackage
# 文件被装到 /usr/lib/debug/.build-id/ab/c123def.debug

# gdb 自动通过 build-id 找到对应的 debuginfo
```

### 9.2 拆分 debug info（部署瘦身）

```bash
# 编译时把 debug info 拆出
g++ -gsplit-dwarf main.cpp -o app
# 生成 app 和 main.dwo

# 或在 release 后用 objcopy 提取
objcopy --only-keep-debug app app.debug
objcopy --strip-debug app
objcopy --add-gnu-debuglink=app.debug app

# 部署只发 app，debug 文件归档
```

---

## 十、警告与错误

```bash
g++ -Wall -Wextra -Wpedantic -Werror main.cpp
```

| 标志 | 含义 |
| --- | --- |
| `-Wall` | 常见警告（unused var、sign-compare 等） |
| `-Wextra` | 额外警告（参数未用、基类未初始化等） |
| `-Wpedantic` | 严格 ISO 标准（禁 GNU 扩展） |
| `-Wconversion` | 隐式转换警告（int→char、signed→unsigned） |
| `-Wold-style-cast` | C 风格强转 `(int)x` 警告 |
| `-Wzero-as-null-pointer-constant` | `0` 当 nullptr 警告 |
| `-Wshadow` | 局部变量遮蔽外层警告 |
| `-Wnon-virtual-dtor` | 多态基类析构非 virtual 警告 |
| `-Werror` | 警告当错误 |
| `-Werror=unused-variable` | 仅指定警告当错误 |
| `-Wno-unused-parameter` | 关闭指定警告 |

### 10.1 静态分析 -fanalyzer（GCC 10+）

```bash
g++ -fanalyzer main.cpp
```

能检测：
- **double-free**
- **use-after-free**
- **memory leak**（malloc 没 free）
- **null dereference**
- **文件描述符泄漏**
- **taint analysis**（用户输入到危险函数）

**对比 Clang Static Analyzer**：
- GCC 的还在发展，覆盖面比 Clang 小。
- 速度比 Clang 慢。

**实战配置**：

```cmake
option(ENABLE_WARNINGS "Enable strict warnings" ON)
if(ENABLE_WARNINGS)
    add_compile_options(
        -Wall -Wextra -Wpedantic -Wconversion
        -Wshadow -Wnon-virtual-dtor
        $<$<CONFIG:Release>:-Werror>
    )
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" AND CMAKE_CXX_COMPILER_VERSION VERSION_GREATER_EQUAL 10)
        add_compile_options(-fanalyzer)
    endif()
endif()
```

---

## 十一、Sanitizers

### 11.1 五大 Sanitizer

| 名称 | 检测 | 启用 | 速度影响 |
| --- | --- | --- | --- |
| **ASan**（Address） | 越界/UAF/double-free/泄漏 | `-fsanitize=address` | 慢 2-3x |
| **MSan**（Memory） | 未初始化值 | `-fsanitize=memory` | 慢 3x |
| **TSan**（Thread） | 数据竞争/死锁 | `-fsanitize=thread` | 慢 5-10x |
| **UBSan**（Undefined） | UB（整数溢出、空指针、错位） | `-fsanitize=undefined` | 几乎无 |
| **LSan**（Leak） | 泄漏（ASan 内置） | `-fsanitize=leak` | 无 |

### 11.2 启用配置

```cmake
set(SANITIZERS "")
if(ENABLE_ASAN)
    list(APPEND SANITIZERS address)
endif()
if(ENABLE_UBSAN)
    list(APPEND SANITIZERS undefined)
endif()
if(SANITIZERS)
    string(JOIN "," SAN_STR ${SANITIZERS})
    add_compile_options(-fsanitize=${SAN_STR} -fno-omit-frame-pointer -g)
    add_link_options(-fsanitize=${SAN_STR})
endif()
```

### 11.3 注意事项

- **ASan 和 TSan 不能同时启用**（都用了 shadow memory）。
- **MSan 要求所有依赖都用 MSan 编译**（极少有人这么做，MSan 难落地）。
- **ASan 不能用 setuid 程序**（权限问题）。
- 默认 ASan 检测泄漏（`ASAN_OPTIONS=detect_leaks=0` 关掉）。

---

## 十二、性能验证

### 12.1 google-benchmark

```cpp
#include <benchmark/benchmark.h>

static void BM_HashString(benchmark::State& state) {
    std::string s(1000, 'x');
    for (auto _ : state) {
        benchmark::DoNotOptimize(std::hash<std::string>{}(s));
    }
}
BENCHMARK(BM_HashString);
BENCHMARK_MAIN();
```

### 12.2 实测对比 -O 等级

```bash
# 编不同优化等级
g++ -O0 -std=c++20 bench.cpp -lbenchmark -o bench_O0
g++ -O2 ...
g++ -O3 ...
g++ -O3 -flto ...
g++ -O3 -flto -fprofile-use ...

# 跑分
./bench_O0
./bench_O2
# 对比数据
```

典型结果（编造数据，仅供示意）：

```text
Benchmark                 O0     O2    O3    O3+LTO   O3+LTO+PGO
HashString/1000B       1250ns  180ns 150ns  140ns    120ns (-90% vs O0)
MatrixMult/1024²       3200ms  980ms 820ms  780ms    720ms
SortVector/1M          1850ms  420ms 380ms  350ms    330ms
```

---

## 十三、面试高频 Q&A

### Q1：-O3 一定比 -O2 快吗？

> 不一定。-O3 比 -O2 多开循环展开、激进内联、向量化等，但：
> - 循环展开导致代码体积膨胀，I-cache miss 增加。
> - 向量化在小循环上反而有开销。
> - 激进内联导致编译时间和二进制体积都涨。
> 实际项目要看 benchmark 数据。很多大厂生产用 `-O2`，性能关键模块单独 `-O3`。

### Q2：为什么 Release 包不能用 -O0？

> 1. **性能差几十倍**：完全没优化。
> 2. **bug 表现不同**：UB 在 -O0 下可能"侥幸通过"，-O2 下崩。
> 3. **断言失败**：assert 在 NDEBUG 下消失，但代码可能依赖其副作用。
> 4. **API 行为变化**：内联差异让 ABI 不兼容。

### Q3：-O2 -g 可以调试吗？

> 可以，但**体验差**：
> - 变量被优化掉：`<optimized out>`。
> - 行号乱跳：内联后单步执行飞来飞去。
> - 函数参数看不到。
> 推荐 `-Og`（GCC 推荐）：保留一定优化但可调试性最好。

### Q4：LTO 和 PGO 必须一起用吗？

> 不必。可以单用：
> - **只 LTO**：跨文件内联，**不需要**重新跑一遍。
> - **只 PGO**：基于 profile 调整内联和布局。
> 但两者**互补**：LTO 提供跨文件视野，PGO 提供热路径数据，组合效果最好（5-25% 加速）。

### Q5：-march=native 部署到别的机器会怎样？

> **可能崩**。`-march=native` 让编译器使用本机所有新指令（如 AVX2、AVX-512、NEON）。如果部署机器不支持，运行时 `Illegal instruction (core dumped)`。
> 解决：
> - 用 `-march=x86-64-v3` 这种**显式 ISA 等级**（v3 含 AVX2）。
> - 或编译时 `-march=haswell`（具体型号）。
> - Docker 镜像要兼容多 CPU 时，用 `-march=x86-64-v2` 或 `-march=x86-64`（最保守）。

### Q6：Sanitizer 上线吗？

> **不上**。Sanitizer 是开发/测试工具，性能影响大（ASan 慢 2-3 倍，TSan 慢 10 倍），生产环境不可接受。
> 实践：
> - 单元测试 / 集成测试：CI 上必跑 ASan + UBSan。
> - 灰度环境：抽样跑 TSan 检测竞争。
> - 生产：用 eBPF/uprobe 动态插桩。

### Q7：编译时间太长怎么优化？

> 1. **CCache**：二次编译跳过未改文件。
> 2. **Ninja**：比 Make 更准的增量。
> 3. **拆模块**：减少头文件依赖（前向声明、PIMPL）。
> 4. **PCH**（precompiled header）：常用头预编译。
> 5. **Unity Build**：合并 cpp 减少重复编译。
> 6. **分布式编译**：distcc / icecream。
> 7. **关掉模板滥用**：模板膨胀是编译慢的主要原因。

---

## 十四、易错点速查表

| 易错点 | 正确做法 |
| --- | --- |
| 生产用 `-O0` | 至少 `-O2`，性能关键 `-O3` |
| `-march=native` 编生产包 | 改用 `-march=x86-64-v3` 等显式等级 |
| `_GLIBCXX_USE_CXX11_ABI` 不统一 | 项目全局统一，CMake 里 `add_compile_definitions` |
| `-Werror` 在 Debug 开 | 只在 Release 或 CI 开 |
| ASan 和 TSan 同时用 | 互斥，CI 分两套 |
| `-fno-rtti` 后用 dynamic_cast | 编不过，要么改设计要么别关 rtti |
| Release 不带 `-g` | 应该带，方便 core dump 分析 |
| 关 frame pointer (`-fomit-frame-pointer`) | 生产建议 `-fno-omit-frame-pointer`，perf/火焰图依赖 |
| LTO 配合 `ar` 失败 | 用 `gcc-ar` / `gcc-ranlib` |
| PGO profile 不更新 | 代码大改后重生成 profile |
| `-O2 -ggdb3` 二进制巨大 | 用 `-gsplit-dwarf` 或部署时 strip |
| 不看 `-fopt-info` 输出 | 调优时必看哪些循环被/没被向量化 |

---

## 十五、相关文章

- [CMake 实战指南](/posts/cmake-guide)
- [GDB 深度实战手册](/posts/gdb-guide)
- [Valgrind 深度实战手册](/posts/valgrind-guide)
- [Redis 核心八股](/posts/redis-interview)

---

> 优化的本质是**让编译器看见更多上下文**。从单文件 `-O2` 到跨文件 LTO，再到运行时 PGO，每一步都把更多"未来"信息交给编译器。理解这一点，就能解释为什么 PGO+LTO+BOLT 三件套能榨出 20-30% 性能。
