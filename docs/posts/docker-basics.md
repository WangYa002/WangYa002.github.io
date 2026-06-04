---
title: Docker 入门教程
date: 2026-03-28
tags:
  - Docker
  - DevOps
description: Docker基础概念、常用命令，以及如何用Docker部署应用
category: 工具与部署
---

# Docker 入门教程

## 什么是 Docker？

Docker 是一个开源的容器化平台，让开发者可以打包应用及其依赖到容器中，实现快速部署和迁移。

**核心概念**：
- **镜像（Image）**：应用的只读模板
- **容器（Container）**：镜像的运行实例
- **仓库（Registry）**：存放镜像的地方（如 Docker Hub）

## 安装 Docker

```bash
# macOS
brew install --cask docker

# Ubuntu
curl -fsSL https://get.docker.com | sh

# 验证安装
docker --version
```

## 常用命令

### 镜像操作

```bash
# 拉取镜像
docker pull ubuntu:20.04

# 查看本地镜像
docker images

# 构建镜像
docker build -t my-app:1.0 .

# 删除镜像
docker rmi ubuntu:20.04

# 推送镜像
docker push my-user/my-app:1.0
```

### 容器操作

```bash
# 运行容器
docker run -it ubuntu:20.04 /bin/bash
docker run -d --name my-app -p 3000:3000 my-app:1.0

# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a

# 停止容器
docker stop my-app

# 启动已停止的容器
docker start my-app

# 重启容器
docker restart my-app

# 删除容器
docker rm my-app

# 进入容器
docker exec -it my-app /bin/bash

# 查看容器日志
docker logs -f my-app
```

## Dockerfile 示例

```dockerfile
# 基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
```

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: myapp
    volumes:
      - db-data:/var/lib/mysql

volumes:
  db-data:
```

常用命令：

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f web
```

## 实用技巧

```bash
# 清理未使用的资源
docker system prune

# 复制文件到容器
docker cp file.txt my-app:/app/

# 查看资源使用
docker stats

# 进入容器（已停止的）
docker run -it --rm --entrypoint=/bin/bash my-app:1.0
```

---

Docker 是现代云原生开发的基础，建议深入学习 Docker Compose 和 Kubernetes。