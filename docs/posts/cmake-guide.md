---
title: CMake 实战指南
date: 2026-07-19
tags:
  - CMake
  - C++
  - 构建工具
  - 八股文
description: CMake 从最小工程到交叉编译/Presets/Generator Expression — 现代 C++ 工程构建实战
category: 工具与部署
---

# CMake 实战指南

> CMake 是 C++ 生态事实上的构建系统。本文从最小工程一路讲到 target-based 现代 CMake、find_package、Generator Expression、交叉编译与 CMakePresets，覆盖面试常考点和工程实践。

---

## 一、CMake 是什么

**CMake = Cross-platform Make**，1999 年诞生于 Kitware。本身**不是构建工具**，而是**构建系统生成器**：

```text
   CMakeLists.txt
        ↓
       CMake  ──────┐
                   ↓
   ┌────────────────────────────────┐
   │  生成原生构建文件               │
   ├────────────────────────────────┤
   │  • Unix Makefiles              │
   │  • Ninja / Ninja Multi-Config  │
   │  • Visual Studio .sln          │
   │  • Xcode .xcodeproj            │
   │  • VS Code / CLion 项目         │
   └────────────────────────────────┘
                   ↓
        make / ninja / msbuild
                   ↓
            可执行文件 / 库
```

**为什么不是 Makefile？**

| 维度 | 手写 Makefile | CMake |
| --- | --- | --- |
| 跨平台 | ❌ Linux/Mac/Windows 各写一份 | ✅ 一份 CMakeLists 通吃 |
| IDE 集成 | ❌ | ✅ CLion/VSCode/VS 原生 |
| 依赖管理 | 手写 -I/-L | find_package 一行 |
| 多配置 | 困难 | toolchain + Presets |
| 学习曲线 | 低 | 中（但收益高） |

**对比 Bazel/Meson/Conan**：Bazel 强在多语言+远程缓存，Meson 更现代但生态小，Conan 是包管理器（可与 CMake 配合）。C++ 后端求职**必须会 CMake**。

---

## 二、最小工程

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)

project(MyApp
    VERSION 1.0.0
    DESCRIPTION "A demo C++ project"
    LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)        # 不用 GNU 扩展，纯标准 C++

add_executable(main main.cpp)
```

**构建命令**：

```bash
# 推荐：out-of-source 构建，保持源码树干净
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j              # --parallel

# 运行
./build/main

# 安装（如果定义了 install）
cmake --install build --prefix /usr/local
```

**CMAKE_BUILD_TYPE** 四种（单配置生成器如 Makefile/Ninja）：

| 类型 | 优化 | 调试符号 | 场景 |
| --- | --- | --- | --- |
| Debug | `-O0 -g` | ✓ | 开发 |
| Release | `-O3 -DNDEBUG` | ✗ | 生产 |
| RelWithDebInfo | `-O2 -g -DNDEBUG` | ✓ | 性能分析 |
| MinSizeRel | `-Os -DNDEBUG` | ✗ | 嵌入式 |

> 多配置生成器（VS / Xcode / Ninja Multi-Config）不读 `CMAKE_BUILD_TYPE`，而是 `cmake --build build --config Release`。

---

## 三、变量与缓存

CMake 三种变量：

| 类型 | 声明 | 作用域 | 持久化 |
| --- | --- | --- | --- |
| **Normal** | `set(VAR value)` | 当前目录/函数 | ❌ |
| **CACHE** | `set(VAR value CACHE STRING "doc")` | 全局 | ✅（写入 CMakeCache.txt） |
| **Environment** | `set(ENV{PATH} ...)` | 进程级 | ❌ |

**CACHE 变量类型**：BOOL / FILEPATH / PATH / STRING / INTERNAL。

```cmake
option(BUILD_TESTS "Build unit tests" ON)   # = set(BUILD_TESTS OFF CACHE BOOL "..." )

if(BUILD_TESTS)
    add_subdirectory(tests)
endif()
```

**命令行覆盖**：

```bash
cmake -B build -DBUILD_TESTS=OFF -DCMAKE_INSTALL_PREFIX=/opt/myapp
```

**作用域陷阱**：

```cmake
set(X 1)              # 父目录
add_subdirectory(sub) # 子目录看到 X=1
                       # 子目录里 set(X 2) 只影响子目录作用域
                       # 父目录 X 仍是 1
# 子目录把改动传回父目录要加 PARENT_SCOPE：
set(X 2 PARENT_SCOPE)
```

---

## 四、目标（Target）

### 4.1 添加目标

```cmake
# 可执行文件
add_executable(myapp main.cpp utils.cpp)

# 静态库（默认）
add_library(mylib STATIC src1.cpp src2.cpp)

# 动态库
add_library(mylib SHARED src1.cpp src2.cpp)

# 模块（运行时 dlopen 加载，Linux .so，Windows 不支持）
add_library(plugin MODULE plugin.cpp)

# 对象库（不打包，给其他 target 复用 .o）
add_library(common_objs OBJECT common.cpp)

# 头文件库（header-only）
add_library(fmt INTERFACE)
target_include_directories(fmt INTERFACE include/)
```

### 4.2 Glob vs 显式列举

```cmake
# ❌ 不推荐：CMake 不会自动检测新增文件，需手动重新运行 cmake
file(GLOB SOURCES src/*.cpp)
add_executable(app ${SOURCES})

# ✅ 推荐：显式列出，新增文件立即触发重配置
add_executable(app
    src/main.cpp
    src/network.cpp
    src/db.cpp
)
```

如果一定要 Glob，CMake 3.12+ 加 `CONFIGURE_DEPENDS`：

```cmake
file(GLOB_RECURSE SOURCES CONFIGURE_DEPENDS src/*.cpp)
```

代价是每次 build 都会检查文件列表，慢一些。

---

## 五、现代 CMake：target-based

### 5.1 三种 link 关系

```cmake
target_link_libraries(myapp
    PUBLIC    fmt::fmt       # 我用、用我的人也用
    PRIVATE   sqlite3        # 我用、用我的人不感知
    INTERFACE nlohmann_json  # 我不用（只是 header）、但用我的人需要
)
```

| 关键字 | 自己编译 | 下游编译 | 自己链接 | 下游链接 |
| --- | --- | --- | --- | --- |
| **PUBLIC** | ✅ | ✅ | ✅ | ✅ |
| **PRIVATE** | ✅ | ❌ | ✅ | ❌ |
| **INTERFACE** | ❌ | ✅ | ❌ | ✅ |

**判断口诀**：
- 实现里用了 → PUBLIC 或 PRIVATE
- 头文件里出现了 → PUBLIC 或 INTERFACE
- 都用了 → PUBLIC
- 只实现用了 → PRIVATE
- 只头文件用了 → INTERFACE

### 5.2 配套 target_* 命令

```cmake
add_library(mylib src/lib.cpp)

target_include_directories(mylib
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include     # 公开头
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src         # 内部头
)

target_compile_features(mylib PUBLIC cxx_std_20)

target_compile_options(mylib PRIVATE
    -Wall -Wextra -Wpedantic -Werror
    $<$<CONFIG:Debug>:-O0 -g>
    $<$<CONFIG:Release>:-O3>
)

target_compile_definitions(mylib PRIVATE
    VERSION="1.0.0"
    $<$<CONFIG:Debug>:DEBUG_LOG=1>
)
```

### 5.3 反模式：全局命令

```cmake
# ❌ 传统 CMake：全局污染
include_directories(include/)         # 影响所有后续 target
add_definitions(-DFOO=1)              # 同上
link_directories(/usr/local/lib)      # 已废弃

# ✅ 现代 CMake：target 局部
target_include_directories(mylib PUBLIC include/)
target_compile_definitions(mylib PUBLIC FOO=1)
# target_link_directories() 3.13+ 可用，但通常用 find_package 提供的 imported target
```

---

## 六、find_package 与第三方库

```cmake
# 必须找到
find_package(Boost 1.80 REQUIRED COMPONENTS system filesystem regex)

# 可选
find_package(Threads)
if(Threads_FOUND)
    target_link_libraries(myapp PRIVATE Threads::Threads)
endif()

# 找到用 imported target，不要用旧式变量
target_link_libraries(myapp PRIVATE
    Boost::system
    Boost::filesystem
    Boost::regex
)
```

### 6.1 Config vs Module 模式

| 模式 | 工作方式 | 谁写 |
| --- | --- | --- |
| **Config**（推荐） | 找 `<lib>Config.cmake` 文件，由库安装时提供 | 库作者 |
| **Module** | 找 `Find<lib>.cmake` 文件，CMake 自带或项目自写 | CMake / 你 |

主流库（Boost、OpenSSL、fmt、spdlog、glog）都提供 Config 文件，find_package 直接用。

### 6.2 自己写 FindXXX.cmake

```cmake
# cmake/FindMyLib.cmake
find_path(MYLIB_INCLUDE_DIR mylib.h HINTS /opt/mylib/include)
find_library(MYLIB_LIBRARY NAMES mylib HINTS /opt/mylib/lib)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(MyLib
    DEFAULT_MSG MYLIB_LIBRARY MYLIB_INCLUDE_DIR)

if(MyLib_FOUND)
    add_library(MyLib::MyLib UNKNOWN IMPORTED)
    set_target_properties(MyLib::MyLib PROPERTIES
        IMPORTED_LOCATION "${MYLIB_LIBRARY}"
        INTERFACE_INCLUDE_DIRECTORIES "${MYLIB_INCLUDE_DIR}")
endif()

mark_as_advanced(MYLIB_INCLUDE_DIR MYLIB_LIBRARY)
```

```cmake
# CMakeLists.txt
list(APPEND CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/cmake)
find_package(MyLib REQUIRED)
```

---

## 七、Generator Expression

Generator Expression 是 CMake 在**生成构建文件阶段**（不是配置阶段）才求值的表达式，格式 `$<...>`。用于根据配置/平台/目标动态生成参数。

### 7.1 常用表达式

```cmake
# 配置相关
$<CONFIG:Debug>                       # 当前是否 Debug 配置
$<CONFIG:Release>

# 平台
$<PLATFORM_ID:Windows>
$<PLATFORM_ID:Linux>
$<CXX_COMPILER_ID:GNU>
$<CXX_COMPILER_ID:MSVC>

# 条件
$<BOOL:${WITH_OPENSSL}>               # 把变量转 bool
$<IF:condition,true_value,false_value>

# 目标属性
$<TARGET_FILE:myapp>                  # 输出文件完整路径
$<TARGET_FILE_DIR:myapp>              # 输出目录
$<TARGET_PROPERTY:mylib,INTERFACE_INCLUDE_DIRECTORIES>
```

### 7.2 实战案例

```cmake
target_compile_options(myapp PRIVATE
    # Debug 加 sanitizer，Release 加 LTO
    $<$<CONFIG:Debug>:-fsanitize=address -fno-omit-frame-pointer>
    $<$<CONFIG:Release>:-O3 -flto>
)

target_link_options(myapp PRIVATE
    $<$<CONFIG:Debug>:-fsanitize=address>
    $<$<CONFIG:Release>:-flto>
)

# Windows 启用 UNICODE
target_compile_definitions(myapp PRIVATE
    $<$<PLATFORM_ID:Windows>:UNICODE _UNICODE>
)

# 复制 DLL 到可执行目录（Windows 上 boost 等是 dll）
add_custom_command(TARGET myapp POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        $<TARGET_FILE:boost_system>
        $<TARGET_FILE_DIR:myapp>
)
```

---

## 八、多目录工程

```
project/
├── CMakeLists.txt          # 顶层
├── cmake/                  # 自定义 FindXXX
│   └── FindMyLib.cmake
├── src/
│   ├── CMakeLists.txt
│   └── main.cpp
├── lib/
│   ├── CMakeLists.txt
│   └── mylib.cpp
├── tests/
│   ├── CMakeLists.txt
│   └── test_main.cpp
└── third_party/
    └── googletest/
```

**顶层 CMakeLists.txt**：

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyApp CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)   # 给 clangd / VSCode 用

# 模块路径
list(APPEND CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/cmake)

# 子目录
add_subdirectory(lib)
add_subdirectory(src)

option(BUILD_TESTS "Build tests" ON)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
```

---

## 九、安装与导出

让你的库能被别人的 CMake `find_package` 找到。

```cmake
add_library(mylib src/mylib.cpp)
target_include_directories(mylib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>)

install(TARGETS mylib
    EXPORT MyLibTargets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
    INCLUDES DESTINATION include)

install(DIRECTORY include/ DESTINATION include)

# 生成 MyLibTargets.cmake
install(EXPORT MyLibTargets
    FILE MyLibTargets.cmake
    NAMESPACE MyLib::
    DESTINATION lib/cmake/MyLib)

# 生成 MyLibConfig.cmake（让 find_package(MyLib) 工作）
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/MyLibConfigVersion.cmake"
    DESTINATION lib/cmake/MyLib)
```

别人这样用：

```cmake
find_package(MyLib 1.0 REQUIRED)
target_link_libraries(their_app PRIVATE MyLib::mylib)
```

---

## 十、交叉编译

CMake 通过 **toolchain 文件** 实现交叉编译。

**arm-linux.cmake**：

```cmake
set(CMAKE_SYSTEM_NAME      Linux)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER   /opt/arm-linux-gnueabihf-gcc)
set(CMAKE_CXX_COMPILER /opt/arm-linux-gnueabihf-g++)

set(CMAKE_SYSROOT /opt/arm-sysroot)

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
```

**使用**：

```bash
cmake -B build -DCMAKE_TOOLCHAIN_FILE=arm-linux.cmake
cmake --build build -j
```

**常见交叉编译目标**：
- `Linux` + `aarch64`（ARM 服务器）
- `Linux` + `arm`（嵌入式）
- `Windows`（MinGW / MSVC）
- `Android`
- `iOS`（需额外配置）

---

## 十一、CMakePresets.json（3.19+）

替代繁琐的 `-D` 参数，把配置/构建/测试预设存成 JSON。

```json
{
  "version": 5,
  "cmakeMinimumRequired": { "major": 3, "minor": 23, "patch": 0 },
  "configurePresets": [
    {
      "name": "default",
      "displayName": "Default Config",
      "generator": "Ninja",
      "binaryDir": "${sourceDir}/build/${presetName}",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Release",
        "CMAKE_EXPORT_COMPILE_COMMANDS": "ON",
        "BUILD_TESTS": "ON"
      }
    },
    {
      "name": "debug",
      "inherits": "default",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" }
    },
    {
      "name": "arm-cross",
      "inherits": "default",
      "toolchainFile": "${sourceDir}/arm-linux.cmake"
    }
  ],
  "buildPresets": [
    { "name": "default", "configurePreset": "default" },
    { "name": "debug",   "configurePreset": "debug" }
  ],
  "testPresets": [
    {
      "name": "default",
      "configurePreset": "default",
      "output": { "outputOnFailure": true },
      "execution": { "noTestsAction": "error", "stopOnFailure": false }
    }
  ]
}
```

**使用**：

```bash
cmake --list-presets
cmake --preset default
cmake --build --preset default
ctest --preset default
```

**好处**：
- IDE 集成（VSCode/CLion 直接读 Presets）
- CI 配置简洁：`cmake --preset ci-release`
- 团队共享配置，不再各自记 -D 参数

---

## 十二、CCache 集成

```cmake
# 顶部加这段
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    set(CMAKE_CXX_COMPILER_LAUNCHER   ${CCACHE_PROGRAM})
    set(CMAKE_C_COMPILER_LAUNCHER     ${CCACHE_PROGRAM})
endif()
```

或更简单（CMake 3.24+）：

```cmake
set(CMAKE_CXX_COMPILER_LAUNCHER ccache)
```

**收益**：二次编译只重新编译修改过的文件，CI 上节省 80%+ 时间。

```bash
ccache -s               # 查看缓存命中率
ccache -M 10G           # 设置缓存上限
ccache -C               # 清空缓存
```

---

## 十三、IDE 与 CI 集成

### 13.1 compile_commands.json

```cmake
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
```

生成的 `build/compile_commands.json` 喂给 **clangd / VSCode C++ 插件 / vim / emacs**，提供精准的跳转/补全/诊断。

### 13.2 CI 配置（GitHub Actions）

```yaml
# .github/workflows/build.yml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        config: [Debug, Release]
    steps:
      - uses: actions/checkout@v4
      - uses: hendrikmuhs/ccache-action@v1.2
      - uses: lukka/get-cmake@latest

      - name: Configure
        run: cmake --preset ci-${{ matrix.config }}

      - name: Build
        run: cmake --build --preset ci-${{ matrix.config }}

      - name: Test
        run: ctest --preset ci-${{ matrix.config }}
```

### 13.3 Ninja Multi-Config

```bash
cmake -B build -G "Ninja Multi-Config"
cmake --build build --config Debug
cmake --build build --config Release
```

一套 build 目录同时支持多配置，比 VS 更快，CI 推荐。

---

## 十四、常见陷阱

| 陷阱 | 现象 | 解决 |
| --- | --- | --- |
| `file(GLOB)` 不更新 | 新增源文件没编进去 | 显式列举 / 加 `CONFIGURE_DEPENDS` |
| `link_directories` | 链接了错误的 lib 版本 | 用 imported target |
| `add_definitions` 全局 | 误污染其他 target | `target_compile_definitions` |
| target 名冲突 | 链接出错 | 加项目前缀 `myproj_mylib` |
| ABI 不一致 | 链接成功但运行崩 | 全部 target 统一 `cxx_std_20` + `-D_GLIBCXX_USE_CXX11_ABI=1` |
| `set(CMAKE_CXX_FLAGS ...)` 覆盖 | CMAKE_BUILD_TYPE 失效 | 用 `target_compile_options` + Generator Expression |
| subdirectory 后变量丢失 | 子目录看不到顶层变量 | CACHE 或 PARENT_SCOPE |
| install 后找不到 | find_package 失败 | 缺 Config.cmake，需 install(EXPORT) |
| 交叉编译工具链不生效 | 仍用宿主机 gcc | `-DCMAKE_TOOLCHAIN_FILE` 必须在第一次配置时传 |

---

## 十五、面试高频 Q&A

### Q1：target_link_libraries 的 PUBLIC/PRIVATE/INTERFACE 区别？

> - **PUBLIC**：当前目标用，依赖它的目标也用（如 STL）。
> - **PRIVATE**：当前目标用，下游不感知（如内部 sqlite3）。
> - **INTERFACE**：当前目标不用（通常 header-only），但下游需要。
> 判断口诀：实现用 → PRIVATE，头文件暴露 → INTERFACE，都占 → PUBLIC。

### Q2：find_package 的 Config 和 Module 模式？

> - **Config 模式**：库安装时自带 `XXXConfig.cmake`，由库作者维护，最准确。
> - **Module 模式**：找 CMake 自带的或项目自写的 `FindXXX.cmake`，通常用变量（`XXX_LIBRARIES`、`XXX_INCLUDE_DIRS`）暴露结果，需要手动 `target_link_libraries`。
> 现代 CMake 都倾向 Config 模式 + imported target（`Boost::system` 这种）。

### Q3：Generator Expression 是什么？什么场景用？

> 在**生成构建文件阶段**才求值的表达式，格式 `$<...>`。常见用法：
> 1. 区分配置：`$<$<CONFIG:Debug>:-O0>`
> 2. 区分平台：`$<$<PLATFORM_ID:Windows>:UNICODE>`
> 3. 取目标属性：`$<TARGET_FILE:myapp>`
> 4. 条件包含路径：`$<INSTALL_INTERFACE:include>`
> 它解决的是 cmake 配置阶段无法感知的"运行时"信息（如多配置生成器的 Release/Debug）。

### Q4：交叉编译时 toolchain 文件为什么要先指定？

> `CMAKE_TOOLCHAIN_FILE` 影响 CMake 第一次探测编译器、检测系统特性的过程。如果在已有 cache 的 build 目录上改 toolchain，CMake 不会重新探测。正确做法：清空 build 目录后用新 toolchain 重新配置。

### Q5：CMakePresets 解决了什么问题？

> 1. **命令行参数长**：以前要 `-DCMAKE_BUILD_TYPE=Release -DBUILD_TESTS=ON -DCMAKE_TOOLCHAIN_FILE=...`，团队每人各记一份。
> 2. **IDE 配置麻烦**：CLion/VSCode 各自手动配。
> 3. **CI 难维护**：YAML 里嵌一长串参数。
> Presets 把配置/构建/测试预设集中存到 `CMakePresets.json`，进版本库共享。CI 一句 `cmake --preset ci-release` 搞定。

### Q6：怎么让 CMake 项目编译更快？

> 1. 用 **Ninja** 替代 Make（自动并行 + 增量更准）。
> 2. 集成 **CCache**（二次编译跳过未改文件）。
> 3. 启用 **LTO** 时小心链接慢，必要时拆模块。
> 4. **PCH**（precompiled header）：`target_precompile_headers(myapp PRIVATE <vector> <string>)`，3.16+。
> 5. **Unity Build**：`set(CMAKE_UNITY_BUILD ON)`，临时合并 cpp 减少重复编译。
> 6. 拆分动态库，减少编译依赖。

---

## 十六、易错点速查表

| 易错点 | 正确做法 |
| --- | --- |
| `file(GLOB)` 不检测新文件 | 显式列源文件 / `CONFIGURE_DEPENDS` |
| `include_directories` 全局 | `target_include_directories` |
| 用 `Boost_LIBRARIES` 变量链接 | 用 `Boost::system` imported target |
| `CMAKE_BUILD_TYPE` 在多配置生成器无效 | 改用 `--config Release` |
| CACHE 变量未指定类型 | `set(X ON CACHE BOOL "doc")` |
| option 放在 if 之后 | option 必须在 if(BUILD_X) 之前 |
| 修改 toolchain 不清 build | toolchain 文件改动必须删除整个 build 目录 |
| install 没生成 Config.cmake | 用 `install(EXPORT)` + `write_basic_package_version_file` |
| 子目录改了变量父目录看不到 | `set(X val PARENT_SCOPE)` |
| `-D_GLIBCXX_USE_CXX11_ABI=0/1` 不一致 | 项目统一 `target_compile_definitions` |
| `add_subdirectory` 多次嵌套乱 | 模块化，每层只看自己的子目录 |

---

## 十七、相关文章

- [GCC 编译优化实战](/posts/gcc-optimization)
- [GDB 深度实战手册](/posts/gdb-guide)
- [Valgrind 深度实战手册](/posts/valgrind-guide)
- [Redis 核心八股](/posts/redis-interview)

---

> CMake 的本质是**把声明式意图（"我要一个 C++20 的动态库"）翻译成具体平台的构建命令**。理解了这一点，从变量作用域到 Generator Expression 都是为了这个目标服务。学 CMake 别背命令，理解 target-based 的设计哲学是关键。
