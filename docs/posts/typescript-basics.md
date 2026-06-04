---
title: TypeScript 入门指南
date: 2026-04-20
tags:
  - TypeScript
  - 前端
description: TypeScript基础类型、接口、泛型等核心概念详解
category: 前端开发
---

# TypeScript 入门指南

## 为什么选择 TypeScript？

TypeScript 是 JavaScript 的超集，提供了：

- 静态类型检查
- 先进的面向对象特性
- 更好的开发体验
- 易于维护的大型项目

## 基础类型

```typescript
// 基础类型
let name: string = 'TypeScript'
let age: number = 10
let isActive: boolean = true

// 数组
let numbers: number[] = [1, 2, 3]
let names: Array<string> = ['a', 'b']

// 元组
let tuple: [string, number] = ['hello', 123]

// 枚举
enum Status {
  Pending,
  Active,
  Completed
}

// 任意类型
let anyValue: any = 'any'

// void（无返回值）
function log(): void {
  console.log('log')
}
```

## 接口

```typescript
interface User {
  name: string
  age: number
  email?: string  // 可选属性
  readonly id: number  // 只读属性
}

// 函数类型接口
interface Func {
  (x: number, y: number): number
}

// 索引类型
interface StringArray {
  [index: number]: string
}
```

## 泛型

```typescript
// 泛型函数
function identity<T>(arg: T): T {
  return arg
}

// 泛型接口
interface Container<T> {
  value: T
}

// 泛型约束
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length
}
```

## 类型守卫

```typescript
// typeof
function padLeft(value: string | number) {
  if (typeof value === 'string') {
    return value + '...'
  }
  return value.toFixed(2)
}

// instanceof
class Pet {
  name: string = 'Pet'
}
class Dog extends Pet {
  bark() {}
}
function isDog(pet: Pet): pet is Dog {
  return pet instanceof Dog
}
```

## 实用技巧

1. **使用 `unknown` 代替 `any`**
2. **善用类型推断**
3. **使用交叉类型合并接口**
4. **使用类型守卫确保类型安全**

---

TypeScript 让我们的代码更加健壮，推荐大家在新项目中尝试！