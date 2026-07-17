// docs/.vitepress/config.mjs
import { defineConfig } from 'vitepress'
import { createRequire } from 'node:module'

// 在 ESM 配置中引入 CommonJS 工具，复用 scan-posts 的分类逻辑
const require = createRequire(import.meta.url)
const { generateSidebar } = require('./utils/scan-posts.cjs')

export default defineConfig({
  // 网站标题与描述
  title: "汪洋恣意 · C++ 后端开发之路",
  description: "聚焦 C++ 后端 / Linux 系统编程 / 高性能网络编程 / 网络安全流量审计，记录实习实战与技术深度挖掘",
  lang: "zh-CN",

  // GitHub Pages 必须配置为 /
  base: "/",

  // Head 标签（SEO）
  head: [
    // SVG 图标
    ['link', { rel: 'icon', type: 'image/png', href: '/logo2.png' }],
    // RSS 订阅
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: '汪洋恣意的博客', href: '/feed.xml' }],
    // 关键词
    ['meta', { name: 'keywords', content: 'C++ 后端, Linux 系统编程, epoll, Reactor, 无锁队列, CRTP, 流量审计, 高性能网络编程, ai_aas, 共享单车, LeetCode 题解, 现代 C++' }],
    // 作者
    ['meta', { name: 'author', content: '胡汪洋（汪洋恣意）' }],
    // 移动端视口
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    // 主题色 - Terracotta (Organic anchor)
    ['meta', { name: 'theme-color', content: '#C66B3D' }],
    // Apple 图标
    ['link', { rel: 'apple-touch-icon', href: '/logo.svg' }],
    // 禁止百度转码
    ['meta', { name: 'applicable-device', content: 'pc,mobile' }],
    ['meta', { name: 'Cache-Control', content: 'no-transform' }],
    // Sitemap
    ['link', { rel: 'sitemap', type: 'application/xml', title: 'Sitemap', href: '/sitemap.xml' }],

  ],

  // 主题配置
  themeConfig: {
    // Logo
    // logo: '/logo.svg',
    // 导航栏
    nav: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "标签", link: "/tags/" },
      { text: "归档", link: "/archive/" },
      { text: "关于", link: "/about" }
    ],

    // 社交链接
    socialLinks: [
      { icon: "github", link: "https://github.com/WangYa002" }
    ],

    // 搜索配置（可选：本地搜索或 Algolia）
    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    // 侧边栏目录（在文章页显示）
    outline: {
      level: [2, 3],
      label: '目录'
    },

    // 文章页侧边栏（由 scan-posts.cjs 按 category 自动分组，新增文章无需手改）
    sidebar: {
      '/posts/': generateSidebar(),
    },

    // 标签页侧边栏
    '/tags/': [
      {
        text: '标签分类',
        items: [
          { text: 'C++', link: '/tags/cpp/' },
          { text: '后端', link: '/tags/backend/' },
          { text: '网络编程', link: '/tags/network/' },
          { text: 'Linux', link: '/tags/linux/' },
          { text: '八股文', link: '/tags/interview/' },
          { text: '算法', link: '/tags/algorithm/' },
          { text: 'LeetCode', link: '/tags/leetcode/' },
          { text: '项目经历', link: '/tags/project/' },
          { text: 'DevOps', link: '/tags/devops/' }
        ]
      }
    ],

    // 归档页侧边栏
    '/archive/': [
      {
        text: '快速导航',
        items: [
          { text: '文章列表', link: '/posts/' },
          { text: '标签云', link: '/tags/' }
        ]
      }
    ],

    // 上下篇导航
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    // 页面底部信息
    footer: {
      message: '基于 VitePress 构建 · 聚焦 C++ 后端 / Linux 系统编程',
      copyright: 'Copyright © 2024-present 胡汪洋（汪洋恣意）'
    },

    // 暗色模式切换
    darkModeSwitch: true,

    // 返回顶部
    // backToTop is default in VitePress

    // 移动端菜单
    mobileMenuLabel: '菜单',

    // 内容宽度配置
    appearances: ['light', 'dark']
  },

  // Markdown 配置
  markdown: {
    lineNumbers: false
  },

  // Vite 相关配置
  vite: {
    build: {
      assetsInlineLimit: 4096
    },
    optimizeDeps: {
      include: ['vue']
    }
  },

  // 构建后清理
  cleanUrls: false
})
