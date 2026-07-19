---
title: GDB 深度实战手册
date: 2026-07-19
tags:
  - GDB
  - 调试
  - Linux
  - C++
  - 八股文
description: GDB 从 ptrace 原理到多线程/多进程/core dump/远程调试/Python 扩展 — 工程级深度手册
category: 工具与部署
---

# GDB 深度实战手册

> GDB 是 Linux 下 C/C++ 程序员的瑞士军刀。本文从 ptrace 工作原理切入，覆盖断点家族、栈帧导航、多线程/多进程、Core Dump、反汇编、远程调试、Python 扩展、TUI 与现代化插件（gef/pwndbg），最后给实战案例与面试问答。

---

## 一、GDB 工作原理：ptrace 系统调用

GDB 之所以能控制另一个进程、读它的寄存器和内存，靠的是 Linux 的 **ptrace(2)** 系统调用。

```text
   ┌──────────────┐                 ┌──────────────┐
   │   GDB 进程    │  ─── ptrace ──→ │   被调试进程  │
   │  (Tracer)    │                 │   (Tracee)   │
   └──────────────┘                 └──────────────┘
          │                                │
          │  • PTRACE_TRACEME              │
          │  • PTRACE_ATTACH <pid>          │
          │  • PTRACE_PEEKDATA / POKEDATA   │
          │  • PTRACE_GETREGS / SETREGS     │
          │  • PTRACE_SINGLESTEP            │
          │  • PTRACE_CONT                  │
          └────────────────────────────────┘
```

**两种被调试方式**：

1. **fork + exec**：GDB fork 子进程，子进程调用 `PTRACE_TRACEME` 然后把自己变成目标程序。
2. **attach**：GDB 调 `PTRACE_ATTACH <pid>`，给目标发 SIGSTOP，夺取控制权。

**断点实现原理**：
- GDB 在断点位置把机器码改成 `0xCC`（x86 INT3 指令）。
- 程序执行到那里触发 SIGTRAP。
- GDB 收到信号后把指令恢复成原样，PC 回退一字节，等待用户命令。

> 这也解释了**为什么 -O2 下断点经常打不上**：编译器把代码内联/重排，断点行已不存在。

---

## 二、启动方式

```bash
# 启动程序
gdb ./myapp
gdb --args ./myapp --config /etc/x.yml --port 8080

# Attach 到运行中的进程
gdb -p 12345
gdb ./myapp 12345              # 同上

# 分析 core dump
gdb ./myapp core
gdb ./myapp /var/coredumps/core.myapp.12345

# 启动时执行命令
gdb -ex "break main" -ex "run" ./myapp

# 执行脚本
gdb -x commands.gdb ./myapp

# 跳过启动 banner
gdb -q ./myapp
```

---

## 三、断点家族

```gdb
# 普通断点
break main                    # 函数入口
break file.cpp:42             # 文件:行号
break Class::method           # 类方法
break namespace::Class::method

# 临时断点（命中后自动删除）
tbreak init_module

# 正则断点
rbreak ^MyClass::.*           # 给 MyClass 所有方法设断点
rbreak file.cpp:.*            # 文件内所有函数

# 硬件断点（修改代码内存的场景，如自修改代码）
hbreak critical_section

# 条件断点（最常用）
break handle_request if req.size > 1000
break loop_start if i == 100

# 修改已有断点的条件
condition 2 i == 50           # 修改 bp 2 的条件
condition 2                   # 清除 bp 2 的条件

# 忽略前 N 次命中
ignore 3 1000                 # bp 3 忽略前 1000 次命中
```

### 3.1 Watchpoint（数据断点）

监控变量/表达式变化，变化时中断：

```gdb
watch global_counter          # 写时中断
rwatch global_counter         # 读时中断
awatch global_counter         # 读/写都中断
```

**用途**：内存被神秘修改（race、野指针）时定位。

> Watchpoint 用硬件调试寄存器实现（x86 4 个 DR 寄存器），所以同时只能 4 个。

### 3.2 Catchpoint（事件断点）

```gdb
catch throw                   # C++ 抛异常时
catch catch                   # 捕获异常时
catch fork                    # 调 fork 时
catch vfork
catch exec                    # 调 execve 时
catch syscall open            # 调 open(2) 时
catch syscall                 # 任意系统调用
```

### 3.3 断点管理

```gdb
info breakpoints              # 列出所有断点（简写 i b）
info breakpoints 2            # 查看指定断点
disable 2                     # 禁用 bp 2
disable                       # 禁用全部
enable 2
enable once 2                 # 启用一次（命中后禁用）
enable delete 2               # 启用一次（命中后删除）
delete 2                      # 删 bp 2
delete                        # 删全部
clear file.cpp:42             # 清除指定位置
```

---

## 四、执行控制

```gdb
run                           # 从头跑（简写 r）
run arg1 arg2                 # 带参数
start                         # 跑到 main 第一行停下

continue                      # 继续直到下一个断点（c）
continue 5                    # 继续，跳过接下来 5 次断点

next                          # 单步跨过函数（n）
next 3                        # 一次跨 3 行
step                          # 单步进入函数（s）

finish                        # 跑完当前函数并在调用处停（fin）
until                         # 跑到循环外（无参数）
until file.cpp:50             # 跑到指定行

# 进阶
reverse-continue              # 逆向继续（需 record 模式）
reverse-step
reverse-next
advance foo                   # 跑到 foo 函数
skip                          # 跳过指定函数（不进入）
skip file noisy_lib.c         # 整文件不进入
```

**逆向调试**（record + replay）：

```gdb
record                        # 开始记录执行
continue
# 跑到崩溃点后
reverse-continue              # 反向继续，定位根因
```

---

## 五、查看状态

### 5.1 查看变量与表达式

```gdb
print x                       # 简写 p
print *ptr                    # 解引用
print arr[0]@5                # 数组前 5 个元素
print/x 0xff                  # 十六进制
print/c 65                    # 字符（'A'）
print/f 3.14                  # 浮点
print {int[5]}0x7fff1000      # 把地址当 int[5] 数组看
print sizeof(struct Node)

# 自动显示
display x                     # 每次停都打印 x
display/i $pc                 # 每次停都打印当前指令
info display
undisplay 1                   # 取消编号 1 的 display

# 改值
set var x = 10
set var p->next = NULL
set args a b c                # 修改程序命令行参数

# 调用函数
print hash("hello")           # 调用程序里的函数
```

### 5.2 查看信息

```gdb
info args                     # 当前函数参数
info locals                   # 当前函数局部变量
info variables                # 全局变量
info registers                # CPU 寄存器
info frame                    # 当前栈帧详细信息
info args                     # 函数参数

info stack                    # = backtrace
info threads                  # 所有线程
info breakpoints              # 所有断点
info source                   # 当前文件信息
info sources                  # 所有调试符号源文件
info sharedlibrary            # 加载的动态库
info functions                # 所有函数（慢）
info functions ^std::         # 正则过滤

info proc mappings            # 进程内存映射
info inferiors                # 所有被调试进程
```

---

## 六、栈帧导航

```gdb
# 调用栈
backtrace                    # 简写 bt
backtrace full               # 包含每帧的局部变量
backtrace 10                 # 只看最内 10 帧

# 切换栈帧
frame 3                       # 切到第 3 帧
frame                         # 显示当前帧
up 2                          # 向外（调用方）移 2 帧
down 1                        # 向内移 1 帧
```

**典型场景**：在 `foo()` 里崩了，想看 `foo()` 的调用者传了什么参数。

```text
(gdb) bt
#0  foo (x=0x0, n=10) at foo.cpp:15
#1  0x... in bar (p=0x7fffc0) at bar.cpp:42
#2  0x... in main (argc=2, argv=...) at main.cpp:100
(gdb) frame 1
#1  bar (p=0x7fffc0) at bar.cpp:42
42      foo(p->next, p->size);
(gdb) print *p                  # 看调用者这边的 p
$1 = {next = 0x0, size = 10, data = ...}
```

---

## 七、多线程调试

```gdb
info threads                  # 列出所有线程，带 *
  Id   Target Id         Frame
* 1    Thread 0x7f... "app" foo () at x.cpp:10
  2    Thread 0x7f... "app" bar () at y.cpp:20
  3    Thread 0x7f... "app" pthread_cond_wait (...)

thread 2                      # 切到 2 号线程
thread apply all bt           # 所有线程都打 bt（神级命令）
thread apply 2 3 bt           # 只给 2、3 号打 bt
thread apply all bt 10        # 每个线程打最内 10 帧

# 锁住其他线程，单步只动当前线程
set scheduler-locking on      # 完全锁
set scheduler-locking step    # step 时锁，continue 时不锁（推荐）
set scheduler-locking replay  # record replay 模式

# 信号处理
handle SIGINT nostop noprint pass
handle SIGUSR1 stop
```

### 7.1 调试死锁

死锁症状：程序 hang 住，CPU 0%，所有线程在 `__lll_lock_wait`。

```text
(gdb) thread apply all bt

Thread 2:
#0  __lll_lock_wait () at ../sysdeps/...
#1  0x... in pthread_mutex_lock ...
#2  0x... in transfer_money (from=..., to=...) at money.cpp:50
                                       ↑ 持有 to.mutex，等待 from.mutex

Thread 1:
#0  __lll_lock_wait () at ../sysdeps/...
#1  0x... in pthread_mutex_lock ...
#2  0x... in transfer_money (from=..., to=...) at money.cpp:50
                                       ↑ 持有 from.mutex，等待 to.mutex
```

死锁确认。下一步看代码搞清锁顺序。

### 7.2 non-stop 模式

调试只关心某个线程时，不让其他线程停。

```gdb
set non-stop on
set pagination off
continue &
# 此时只有当前线程在跑
thread 2
# ... 单独调试 2 号
```

---

## 八、多进程调试

```gdb
# 默认行为：跟随父进程
set follow-fork-mode parent
set follow-fork-mode child     # 跟子进程

# detach-on-fork
set detach-on-fork on          # 默认：父或子其中一个 detach 掉
set detach-on-fork off         # 都调试（inferior 概念）

# exec
set follow-exec-mode new       # 新 inferior 调试 exec 后的进程
set follow-exec-mode same      # 同一进程
```

**多 inferior 操作**：

```gdb
info inferiors
inferior 2
add-inferior --copies 2
```

---

## 九、Core Dump 全流程

### 9.1 准备环境

```bash
# 当前 shell
ulimit -c unlimited            # 允许生成 core

# 永久生效（写入 /etc/security/limits.conf）
# *  soft  core  unlimited

# core 文件位置和命名
cat /proc/sys/kernel/core_pattern
# 默认可能是：core
# 改成带 PID/时间的：
echo '/var/coredumps/core.%e.%p.%t' | sudo tee /proc/sys/kernel/core_pattern
sudo mkdir -p /var/coredumps && sudo chmod 777 /var/coredumps

# Ubuntu 上关闭 apport（会拦截 core）
sudo systemctl disable apport
```

### 9.2 编译带调试符号

```bash
g++ -g -O0 -fno-omit-frame-pointer app.cpp -o app
```

> `-g` 必加；`-O0` 让变量不被优化掉；`-fno-omit-frame-pointer` 让 gdb 能正确回溯。

### 9.3 分析 core

```bash
gdb ./app core.app.12345.1689754321
```

```text
(gdb) bt
#0  0x... in strlen () from /lib/libc.so.6
#1  0x... in process (str=0x0) at app.cpp:30
        ← str 是 NULL！
#2  0x... in main () at app.cpp:50

(gdb) frame 1
#1  process (str=0x0) at app.cpp:30
30      int len = strlen(str);

(gdb) info locals
str = 0x0
len = <optimized out>          # ← 还没赋值

(gdb) list                    # 看源码
25    void process(const char* str) {
26      if (!str) return;
27      // ... 这里漏写了 return 后还是会走到 strlen(str)
30      int len = strlen(str);
```

---

## 十、反汇编与寄存器

### 10.1 查看汇编

```gdb
disassemble                    # 当前函数汇编
disassemble main
disassemble /m main            # 混合源码与汇编
disassemble /r main            # 显示原始字节码
disassemble 0x400500, 0x400520 # 指定地址范围
```

输出：

```text
(gdb) disassemble /m main
10  int main() {
   0x0000000000400526 <+0>:     push   rbp
   0x0000000000400527 <+1>:     mov    rbp,rsp
11    return foo(42);
   0x000000000040052a <+4>:     mov    esi,0x2a
   0x000000000040052f <+9>:     call   0x400500 <foo(int)>
12  }
   0x0000000000400534 <+14>:    pop    rbp
   0x0000000000400535 <+15>:    ret
```

### 10.2 查看与设置寄存器

```gdb
info registers                 # 整数寄存器
info registers xmm0 ymm0       # SSE/AVX 寄存器
info all-registers             # 全部

print/x $rax                   # 查看
set $rax = 0x1234              # 修改
```

### 10.3 单步汇编

```gdb
stepi                          # 单步一条汇编指令（si）
nexti                          # 同上但跨过 call（ni）
```

调试 release 二进制 / JIT 出来的代码 / 优化器 bug 时必备。

---

## 十一、内存查看

```gdb
x/nfu addr
  n = 数量
  f = 格式（x=十六进制 / d=十进制 / u=无符号 / t=二进制 / o=八进制 / s=字符串 / i=指令 / c=字符）
  u = 单位（b=字节 / h=半字 / w=字=4字节 / g=八字节）
```

**常用例**：

```gdb
x/16xb 0x7fff1000              # 16 字节十六进制
x/16xw 0x7fff1000              # 16 个 4 字节
x/s 0x400600                   # 当 C 字符串看
x/4i $pc                       # 当前 PC 后 4 条指令
x/2gd 0x7fff1000               # 2 个 double

# 自动类型推断
x/gx ptr
```

### 11.1 查看堆

```gdb
info proc mappings             # 看堆地址范围
maintenance info sections      # 看 .text .data .bss 位置
```

---

## 十二、远程调试

**目标机（被调试端，如 ARM 嵌入式设备）**：

```bash
gdbserver :1234 ./myapp
# 或附加已有进程
gdbserver --attach :1234 12345
```

**主机（调试端）**：

```bash
gdb ./myapp
(gdb) target remote 192.168.1.100:1234
(gdb) continue
```

**容器场景**：

```bash
# 容器内
gdbserver :2345 --attach $(pidof myapp)

# 主机
gdb /path/to/myapp
(gdb) target extended-remote | docker exec -i mycontainer gdbserver - --attach 12345
```

> 远程调试要求**主机有带调试符号的同版本二进制**，否则只能看汇编。

---

## 十三、GDB 脚本

**`.gdbinit`**（每次启动自动加载）：

```gdb
# ~/.gdbinit
set pagination off
set print pretty on
set print object on
set print array on
set print thread-events off
set history save on
set history size 10000

# 加载 STL 美化打印
python
import sys
sys.path.insert(0, '/usr/share/gcc-12/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers(None)
end

# 自定义命令
define pvec
    if $argc == 1
        print *(($arg1)._M_impl._M_start)@$arg1.size()
    end
end
document pvec
Print std::vector contents.
Usage: pvec vec_name
end
```

**单独脚本文件**：

```gdb
# dump-bt.gdb
set pagination off
set logging file bt.log
set logging on
thread apply all bt
set logging off
quit
```

```bash
gdb -x dump-bt.gdb -p $(pidof myapp)
```

---

## 十四、Python 扩展

GDB 7+ 内嵌 Python 解释器，可写自定义命令、pretty-printer。

```gdb
(gdb) python
>class Hello(gdb.Command):
>    """Print hello."""
>    def __init__(self):
>        super().__init__("hello", gdb.COMMAND_USER)
>    def invoke(self, arg, from_tty):
>        print(f"Hello, {arg}!")
>Hello()
>end
(gdb) hello world
Hello, world!
```

**实战：自动 dump 死锁时的所有线程栈到文件**：

```python
# deadlock_dump.py
import gdb
import datetime

class DumpDeadlock(gdb.Command):
    def __init__(self):
        super().__init__("dump-deadlock", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        out = gdb.execute(f"thread apply all bt", to_string=True)
        with open(f"/tmp/deadlock-{ts}.log", "w") as f:
            f.write(out)
        print(f"Wrote /tmp/deadlock-{ts}.log")

DumpDeadlock()
```

```gdb
source deadlock_dump.py
dump-deadlock
```

**Pretty-printer 示例**（让自定义类友好打印）：

```python
class MyStructPrinter:
    def __init__(self, val):
        self.val = val
    def to_string(self):
        return f"MyStruct(id={self.val['id']}, name={self.val['name']})"

def my_lookup(val):
    if str(val.type) == "MyStruct":
        return MyStructPrinter(val)
    return None

gdb.pretty_printers.append(my_lookup)
```

---

## 十五、调试符号

| 标志 | 含义 | 推荐 |
| --- | --- | --- |
| `-g` | 基础调试符号 | 最低要求 |
| `-g2` | 含局部变量 | ✓ |
| `-g3` | 含宏定义 | 调宏时用 |
| `-ggdb` | GDB 专用格式（DWARF） | 默认即可 |
| `-gsplit-dwarf` | debug info 拆到 .dwo | 大项目 |
| `-fno-omit-frame-pointer` | 保留帧指针 | **必加** |

### 15.1 `<optimized out>` 怎么办？

变量被优化掉了（寄存器复用、内联）。

```text
(gdb) print user_count
$1 = <optimized out>
```

**解决方法**：

1. **重编 `-O0`**：最简单粗暴。
2. **改 `-Og`**：保留一定优化但可调试（GCC 推荐）。
3. **`volatile`**：强制变量不被优化掉（影响性能，慎用）。
4. **`-fno-inline`**：禁内联，能定位到函数级。
5. **查寄存器**：`info registers` + `disassemble` 推断变量当前在哪个寄存器。

---

## 十六、TUI 与 GUI

### 16.1 内建 TUI

```gdb
tui enable                     # 启用
layout src                     # 源码窗口
layout asm                     # 汇编窗口
layout split                   # 源码 + 汇编
layout regs                    # 寄存器窗口
focus cmd                      # 焦点切到命令窗口
Ctrl+L                         # 刷新
Ctrl+X A                       # 切换 TUI
Ctrl+X 2                       # 双窗口
```

### 16.2 增强 GDB（强烈推荐）

| 工具 | 特点 |
| --- | --- |
| **gef** | 一键搞定，集成反汇编/寄存器/堆/SECCOMP/结构体解析 |
| **pwndbg** | CTF/Pwn 友好，逆向神器 |
| **peda** | 老牌，Python 2 时代的 |
| **cgdb** | vim 风格的 TUI |

安装：

```bash
# gef（推荐）
bash -c "$(curl -fsSL https://gef.blah.cat/sh)"
echo 'source ~/.gdbinit-gef.py' >> ~/.gdbinit
```

效果：每次断点停下时自动显示寄存器、汇编、栈、源码。

---

## 十七、典型 Bug 实战

### 17.1 SIGSEGV（段错误）

```text
Program received signal SIGSEGV, Segmentation fault.
0x... in std::vector<int>::operator[] ...
(gdb) bt
#0  vector.operator[] (this=0x0, n=5) ...
#1  process (vec=...) at app.cpp:30
```

`this=0x0` → vector 是空的。

### 17.2 SIGABRT（abort）

通常是 `assert` 失败或 `std::terminate`：

```text
(gdb) bt
#0  raise ()
#1  abort ()
#2  __cxa_throw ()
#3  std::__throw_out_of_range ()
#4  vector.at (n=10)             # 越界 at()
```

### 17.3 堆栈损坏（SIGSEGV 在 __libc_start_main）

栈被踩了，看 `bt` 通常乱：

```gdb
# 内存布局
x/16xg $rsp                   # 检查栈空间
# 如果栈被破坏严重，frame 命令也无效
# 找最后一个合法地址
info frame
```

### 17.4 内存泄漏

GDB 本身**不直接检测泄漏**（那是 Valgrind/ASan 的活），但可以：

```gdb
# 在 malloc/free 设断点
break malloc
break free
commands
  silent
  printf "malloc(%d) = %p\n", $rdi, $rax
  continue
end
```

记录所有分配/释放，离线分析。

---

## 十八、面试高频 Q&A

### Q1：GDB 怎么实现的？

> 基于 Linux 的 ptrace 系统调用。GDB 作为 tracer 通过 PTRACE_ATTACH 或 fork+PTRACE_TRACEME 控制 tracee。断点通过修改目标进程内存为 `0xCC`（x86 INT3）实现，命中时触发 SIGTRAP，GDB 接管并把指令恢复。

### Q2：多线程调试 `thread apply all bt` 的作用？

> 一次性打印所有线程的栈。死锁/竞争问题时第一命令，能立即看到哪个线程在等哪个锁。

### Q3：core dump 怎么用？

> 1. 编译加 `-g`。
> 2. `ulimit -c unlimited` 允许生成。
> 3. 配 `/proc/sys/kernel/core_pattern` 指定路径。
> 4. `gdb ./app core` 加载后 `bt` 查调用栈、`print` 看变量。

### Q4：调试 release 二进制怎么办？

> 1. 用 `-Og`（优化 + 可调试的平衡）。
> 2. 找带符号的版本（公司内部应该有 debug build）。
> 3. 没 debug info 时只能看汇编：`disassemble` + `x/i $pc`。
> 4. 关键变量加 `volatile` 强制保留。
> 5. 一些公司有专门的 symbol server（如 Microsoft）。

### Q5：watchpoint 和 breakpoint 区别？

> - **breakpoint**：在指定**位置**（地址/函数/行号）触发。
> - **watchpoint**：在指定**数据**被读写时触发（硬件 DR 寄存器实现）。
> Watchpoint 适合追查"变量神秘被改"问题，比如 race、野指针踩内存。

### Q6：怎么调试一个跑着不能停的生产服务？

> 1. **慎用 attach**：attach 会 SIGSTOP 进程，业务受影响。
> 2. **优先分析 core dump**：在不影响线上时由业务进程主动 `abort()` 触发 core。
> 3. **gcore**：不杀进程只生成 core（`gcore <pid>`）。
> 4. **远程调试**：单独环境复现。
> 5. **eBPF/uprobe**：动态插桩不影响进程。

### Q7：gef / pwndbg 给你什么？

> 增强了原生 GDB 缺失的可视化：
> - 自动显示寄存器、汇编、栈
> - 结构体解析（`struct fd_table` 自动展开）
> - 内存布局图（heap/stack/libs 段）
> - 检查保护机制（NX/PIE/Canary）
> - 一键查 ROP gadget
> 现代 CTF/Pwn 必装，工程调试也大幅提升效率。

---

## 十九、易错点速查表

| 易错点 | 正确做法 |
| --- | --- |
| 编译没加 `-g` | 必须 `-g -fno-omit-frame-pointer` |
| `-O2` 下变量 `<optimized out>` | 重编 `-O0` 或 `-Og`，关键变量加 `volatile` |
| `attach` 需要权限 | `echo 0 \| sudo tee /proc/sys/kernel/yama/ptrace_scope` 或 sudo |
| core_pattern 没配 | Ubuntu 默认 apport 接管，需 `systemctl disable apport` |
| 多线程 `next` 跑飞 | `set scheduler-locking step` |
| `print vec[100]` 失败 | vector 是 `_M_impl._M_start` + 偏移，或加 STL pretty-printer |
| 长字符串被截断 | `set print elements 0` |
| 大数组打印刷屏 | `set print elements 100` |
| 模板类断点难打 | `break ClassName<int>::method` 或 `rbreak` |
| `target remote` 报符号不对 | 主机必须有同版本带符号二进制 |
| GDB 卡死无响应 | 多半是多线程 + scheduler-locking 配错，按 Ctrl+C |
| `info args` 显示 `<optimized out>` | 同上 `-O0` |

---

## 二十、相关文章

- [Valgrind 深度实战手册](/posts/valgrind-guide)
- [GCC 编译优化实战](/posts/gcc-optimization)
- [CMake 实战指南](/posts/cmake-guide)
- [MySQL 与调试工具链](/posts/八股文-7-mysql-debug)

---

> GDB 不只是命令集合，而是把"程序内部状态可观察"这件事做到极致的工具。从 ptrace 原理到 Python 扩展，每一层都让你看到更深的真相。能熟练用 GDB，是 C++ 工程师从初级到资深的分水岭。
