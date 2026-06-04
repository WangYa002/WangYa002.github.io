---
title: 前后端分离项目部署指南
date: 2026-03-20
tags:
  - 部署
  - DevOps
description: 如何将前后端分离的项目部署到服务器，包括Nginx配置和反向代理
category: 工具与部署
---

# 前后端分离项目部署指南

## 项目结构

```
project/
├── frontend/    # Vue/React 前端
└── backend/     # Node.js/Python 后端
```

## 前端构建

```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 输出目录 dist/
```

## Nginx 配置

```nginx
# /etc/nginx/conf.d/blog.conf

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/blog/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /var/www/blog/frontend/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## PM2 部署后端

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start server.js --name blog-api

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

## HTTPS 配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

## 完整 Nginx 配置（带 HTTPS）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/blog/frontend/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 部署检查清单

- [ ] 前端构建完成
- [ ] 后端环境变量配置
- [ ] Nginx 配置正确
- [ ] SSL 证书生效
- [ ] 防火墙端口开放
- [ ] 域名解析生效

---

部署完成后，记得定期检查日志和进行备份！