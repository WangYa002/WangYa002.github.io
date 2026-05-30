# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 **VitePress** 的个人技术博客，使用 Vue 3 构建的静态站点生成器。

## 常用命令

```bash
npm run dev     # 本地开发预览
npm run build   # 构建静态站点
npm run preview # 预览构建结果
```

## 技术栈

- **框架**: VitePress 1.6.4
- **主题**: VitePress DefaultTheme（已自定义样式）
- **搜索**: Algolia DocSearch（已配置）
- **代码高亮**: Shiki

## 目录结构

```
docs/                    # VitePress 内容目录
├── index.md            # 首页（layout: home）
├── about.md            # 关于页面
├── posts/              # 博客文章目录
│   ├── index.md        # 文章列表页
│   └── first-blog.md   # 示例文章
└── .vitepress/         # VitePress 配置
    ├── config.mjs      # 站点配置（标题、导航、基础路径）
    └── theme/          # 自定义主题
        ├── index.js    # 主题入口
        └── custom.css  # 自定义样式
```

## 配置说明

- `base: "/"` - 部署在 GitHub Pages 根目录
- 主题已启用暗色模式支持
- 导航栏: 首页 / 文章 / 关于

## 添加文章

在 `docs/posts/` 目录下创建 `.md` 文件即可，Frontmatter 支持 `title`、`date`、`tags` 等字段。