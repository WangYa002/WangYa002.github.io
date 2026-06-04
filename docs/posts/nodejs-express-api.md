---
title: Node.js + Express 快速构建REST API
date: 2026-04-15
tags:
  - Node.js
  - 后端
  - Express
description: 使用Node.js和Express快速搭建RESTful API，包括路由、中间件、错误处理
category: 后端开发
---

# Node.js + Express 快速构建REST API

## 项目初始化

```bash
mkdir my-api
cd my-api
npm init -y
npm install express cors helmet morgan
npm install -D nodemon
```

## 目录结构

```
my-api/
├── src/
│   ├── routes/      # 路由
│   ├── controllers/ # 控制器
│   ├── models/     # 数据模型
│   ├── middlewares/# 中间件
│   └── app.js      # 应用入口
└── package.json
```

## 基础设置

```javascript
// src/app.js
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const app = express()

// 中间件
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 路由
app.use('/api/users', require('./routes/users'))
app.use('/api/posts', require('./routes/posts'))

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

module.exports = app
```

## RESTful 路由设计

```javascript
// src/routes/users.js
const express = require('express')
const router = express.Router()

// GET /users - 获取所有用户
router.get('/', async (req, res) => {
  const users = await User.find()
  res.json(users)
})

// GET /users/:id - 获取单个用户
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json(user)
})

// POST /users - 创建用户
router.post('/', async (req, res) => {
  const user = new User(req.body)
  await user.save()
  res.status(201).json(user)
})

// PUT /users/:id - 更新用户
router.put('/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  )
  res.json(user)
})

// DELETE /users/:id - 删除用户
router.delete('/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

module.exports = router
```

## 中间件示例

```javascript
// src/middlewares/validate.js
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }
    next()
  }
}

module.exports = validate
```

## 启动服务

```javascript
// src/index.js
const app = require('./app')
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

---

这样一个基本的 REST API 就完成了！可以进一步添加数据库连接、认证等功能。