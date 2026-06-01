// docs/.vitepress/config.mjs
export default {
  // 网站标题与描述
  title: "汪洋恣意-信一的博客",
  description: "分享前端、后端开发经验和编程心得的个人技术博客",
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
    ['meta', { name: 'keywords', content: '技术博客, 前端开发, 后端开发, Vue, JavaScript' }],
    // 作者
    ['meta', { name: 'author', content: '汪洋恣意' }],
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

    // 文章页侧边栏
    sidebar: {
      '/posts/': [
        {
          text: '前端开发',
          collapsed: false,
          items: [
            { text: 'Vue3 组合式API完全指南', link: '/posts/vue3-composition-api' },
            { text: 'TypeScript 入门指南', link: '/posts/typescript-basics' },
            { text: 'CSS Flexbox 布局详解', link: '/posts/css-flexbox' }
          ]
        },
        {
          text: '后端开发',
          collapsed: false,
          items: [
            { text: 'Node.js + Express 快速构建REST API', link: '/posts/nodejs-express-api' }
          ]
        },
        {
          text: '工具与部署',
          collapsed: false,
          items: [
            { text: 'Git 常用命令速查表', link: '/posts/git-commands' },
            { text: 'Docker 入门教程', link: '/posts/docker-basics' },
            { text: '前后端分离项目部署指南', link: '/posts/deployment-guide' }
          ]
        },
        {
          text: '八股文',
          collapsed: false,
          items: [
            { text: 'HTTP与TCP', link: '/posts/八股文-1' }
          ]
        },
        {
          text: '算法',
          collapsed: false,
          items: [
            { text: '两数之和', link: '/posts/算法-1' }
          ]
        },
        {
          text: '项目经历',
          collapsed: false,
          items: [
            { text: '项目介绍', link: '/posts/aas-1' }
          ]
        },
        {
          text: 'GOlang&C++',
          collapsed: false,
          items: [
            { text: '环境搭建', link: '/posts/golang-1' }
          ]
        }
      ]
    },

    // 标签页侧边栏
    '/tags/': [
      {
        text: '标签分类',
        items: [
          { text: '前端', link: '/tags/frontend/' },
          { text: '后端', link: '/tags/backend/' },
          { text: '八股文', link: '/tags/interview/' },
          { text: '算法', link: '/tags/algorithm/' },
          { text: '项目经历', link: '/tags/project/' },
          { text: 'GOlang&C++', link: '/tags/golang/' },
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
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024-present 汪洋恣意'
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
}