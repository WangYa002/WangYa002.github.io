import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createFeedPlugin() {
  // Get posts data for RSS
  const posts = [
    {
      title: 'Vue3 组合式API完全指南',
      date: '2026-05-01',
      description: '深入理解Vue3组合式API的核心概念和使用方法',
      url: '/posts/vue3-composition-api'
    },
    {
      title: 'TypeScript 入门指南',
      date: '2026-04-20',
      description: 'TypeScript基础类型、接口、泛型等核心概念详解',
      url: '/posts/typescript-basics'
    },
    {
      title: 'Node.js + Express 快速构建REST API',
      date: '2026-04-15',
      description: '使用Node.js和Express快速搭建RESTful API',
      url: '/posts/nodejs-express-api'
    },
    {
      title: 'Git 常用命令速查表',
      date: '2026-04-10',
      description: '日常开发中常用的Git命令，涵盖分支管理、版本控制、协作等场景',
      url: '/posts/git-commands'
    },
    {
      title: 'CSS Flexbox 布局详解',
      date: '2026-04-05',
      description: '详解Flexbox布局的核心概念，包括容器属性和项目属性',
      url: '/posts/css-flexbox'
    },
    {
      title: 'Docker 入门教程',
      date: '2026-03-28',
      description: 'Docker基础概念、常用命令，以及如何用Docker部署应用',
      url: '/posts/docker-basics'
    },
    {
      title: '前后端分离项目部署指南',
      date: '2026-03-20',
      description: '如何将前后端分离的项目部署到服务器，包括Nginx配置和反向代理',
      url: '/posts/deployment-guide'
    },
    {
      title: '我的第一篇博客',
      date: '2026-04-05',
      description: '这是用 VitePress 官方模板写的第一篇文章，极简稳定！',
      url: '/posts/first-blog'
    }
  ]

  return {
    name: 'vitepress-plugin-rss',
    buildEnd() {
      const baseUrl = 'https://your-domain.com'

      const rssXml = generateRSS(posts, baseUrl)
      // Output to docs/.vitepress/dist/feed.xml
      const feedPath = resolve(__dirname, '../dist/feed.xml')

      try {
        writeFileSync(feedPath, rssXml)
        console.log('RSS feed generated at feed.xml')
      } catch (e) {
        // Ignore errors during build
      }
    }
  }
}

function generateRSS(posts, baseUrl) {
  const now = new Date().toISOString()

  const items = posts
    .map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}${post.url}</link>
      <guid>${baseUrl}${post.url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.description}]]></description>
    </item>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>汪洋恣意-信一的博客</title>
    <link>${baseUrl}</link>
    <description>分享技术心得与编程经验，记录成长路上的点点滴滴</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <generator>VitePress</generator>${items}
  </channel>
</rss>`
}