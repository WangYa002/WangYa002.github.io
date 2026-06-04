---
title: Vue3 组合式API完全指南
date: 2026-05-01
tags:
  - Vue
  - 前端
description: 深入理解Vue3组合式API的核心概念和使用方法
category: 前端开发
---

# Vue3 组合式API完全指南

## 为什么需要组合式API？

Vue3 引入了组合式API（Composition API），这是一种全新的逻辑组织方式。相比于选项式API，组合式API：

- 更好的逻辑复用
- 更灵活的代码组织
- 更好的类型推导支持

## 基本使用

```javascript
import { ref, computed, watch, onMounted } from 'vue'

export default {
  setup() {
    // 响应式数据
    const count = ref(0)
    const name = ref('Vue3')

    // 计算属性
    const doubleCount = computed(() => count.value * 2)

    // 方法
    const increment = () => {
      count.value++
    }

    // 监听器
    watch(count, (newVal, oldVal) => {
      console.log(`count changed from ${oldVal} to ${newVal}`)
    })

    // 生命周期钩子
    onMounted(() => {
      console.log('Component mounted!')
    })

    return {
      count,
      name,
      doubleCount,
      increment
    }
  }
}
```

## 响应式系统

### ref 和 reactive

```javascript
// ref 用于基本类型
const count = ref(0)

// reactive 用于对象
const state = reactive({
  name: 'Vue',
  version: 3
})
```

### toRefs 解构

```javascript
const state = reactive({
  name: 'Vue',
  version: 3
})

// 解构后保持响应式
const { name, version } = toRefs(state)
```

## 依赖注入

使用 `provide` 和 `inject` 实现跨组件通信：

```javascript
// 父组件
import { provide } from 'vue'
provide('theme', 'dark')

// 子组件
import { inject } from 'vue'
const theme = inject('theme')
```

## 最佳实践

1. **逻辑组合**：将相关逻辑提取到独立的 composable 函数
2. **命名规范**：composable 函数以 `use` 开头
3. **响应式注意**：避免直接解构 reactive 对象

---

希望这篇指南能帮助你更好地理解和使用 Vue3 的组合式API！