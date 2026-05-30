---
title: Go语言环境搭建与快速入门
date: 2026-05-10
tags:
  - GOlang&C++
  - 后端
description: 从零搭建Go开发环境，快速入门Go语言编程
---

# Go语言环境搭建与快速入门

## 安装 Go

### Windows

从 [go.dev](https://go.dev) 下载安装包，一路下一步即可。

```powershell
# 验证安装
go version
```

### Linux

```bash
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

## IDE 推荐

- **VS Code**：轻量级，安装 Go 插件
- **GoLand**：功能强大，JetBrains 出品

## 第一个 Go 程序

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
```

运行：

```bash
go run main.go
```

## 基本语法速览

### 变量声明

```go
// 方式一
var name string = "Go"

// 方式二
var age = 25

// 方式三
city := "Beijing"
```

### 函数

```go
func add(a, b int) int {
    return a + b
}

// 多返回值
func divide(a, b int) (int, int) {
    return a / b, a % b
}
```

### 协程

```go
go func() {
    fmt.Println("异步执行")
}()
```

## 常用命令

| 命令 | 作用 |
|------|------|
| go run | 运行程序 |
| go build | 编译程序 |
| go get | 安装依赖 |
| go test | 运行测试 |

---

Go语言简洁高效，值得学习！
