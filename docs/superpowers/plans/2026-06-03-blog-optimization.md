# Blog Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Progressively optimize the VitePress blog across performance, SEO, developer experience, and user experience.

**Architecture:** Incremental enhancements to existing VitePress setup. No new frameworks. A shared `scan-posts.cjs` utility replaces all hardcoded article lists. The `transformHead` hook provides per-page SEO. CSS improvements handle accessibility, animation, and mobile.

**Tech Stack:** VitePress 1.6.4, Vue 3, gray-matter, Node.js 20

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `docs/.vitepress/utils/scan-posts.cjs` | Create | Shared post scanning + frontmatter parsing |
| `docs/.vitepress/config.mjs` | Modify | cleanUrls, head tags, vite config, transformHead, sidebar auto-gen |
| `docs/.vitepress/theme/custom.css` | Modify | Font, animation, mobile, a11y, dark mode fixes |
| `docs/.vitepress/plugins/feed.cjs` | Modify | Auto-scan instead of hardcoded list |
| `docs/.vitepress/plugins/sitemap.cjs` | Modify | Auto-scan instead of hardcoded list |
| `docs/.vitepress/theme/components/IntroAnimation.vue` | Modify | Reduced-motion support |
| `docs/.vitepress/theme/components/GiscusComment.vue` | Modify | Dark mode sync via useData |
| `docs/.vitepress/theme/components/DocLayout.vue` | Modify | ViewTransition API support |
| `docs/404.md` | Create | Custom 404 page |
| `docs/posts/*.md` (12 files) | Modify | Add category field to frontmatter |
| `package.json` | Modify | Add gray-matter devDependency |

---

### Task 1: Install gray-matter and create scan-posts utility

**Files:**
- Create: `docs/.vitepress/utils/scan-posts.cjs`
- Modify: `package.json`

- [ ] **Step 1: Install gray-matter**

```bash
npm install --save-dev gray-matter
```

- [ ] **Step 2: Create the scan-posts utility**

Create `docs/.vitepress/utils/scan-posts.cjs`:

```js
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const POSTS_DIR = path.resolve(__dirname, '../../posts')
const TAGS_DIR = path.resolve(__dirname, '../../tags')
const BASE_URL = 'https://WangYa002.github.io'

const CATEGORY_ORDER = {
  '前端开发': 1,
  '后端开发': 2,
  '工具与部署': 3,
  '八股文': 4,
  '算法': 5,
  '项目经历': 6,
  'GOlang&C++': 7,
}

function getPosts() {
  if (!fs.existsSync(POSTS_DIR)) return []

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && f !== 'index.md')

  return files.map(file => {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
    const { data } = matter(content)
    const slug = file.replace(/\.md$/, '')

    return {
      title: data.title || slug,
      date: data.date ? String(data.date).slice(0, 10) : null,
      description: data.description || '',
      tags: data.tags || [],
      category: data.category || '',
      url: `/posts/${slug}`,
      slug,
    }
  }).filter(post => post.date).sort((a, b) => new Date(b.date) - new Date(a.date))
}

function generateSidebar() {
  const posts = getPosts()
  const groups = {}

  posts.forEach(post => {
    const cat = post.category || '未分类'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(post)
  })

  return Object.entries(groups)
    .sort(([a], [b]) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99))
    .map(([cat, items]) => ({
      text: cat,
      collapsed: false,
      items: items.map(post => ({
        text: post.title,
        link: `/posts/${post.slug}`,
      })),
    }))
}

function getTagPages() {
  const pages = []
  if (!fs.existsSync(TAGS_DIR)) return pages

  const dirs = fs.readdirSync(TAGS_DIR, { withFileTypes: true })
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const indexPath = path.join(TAGS_DIR, dir.name, 'index.md')
      if (fs.existsSync(indexPath)) {
        pages.push(`/tags/${dir.name}/`)
      }
    }
  }
  return pages
}

function getAllPages() {
  const posts = getPosts()
  const tagPages = getTagPages()
  return [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/posts/', priority: '0.9', changefreq: 'weekly' },
    { url: '/tags/', priority: '0.8', changefreq: 'weekly' },
    { url: '/archive/', priority: '0.8', changefreq: 'weekly' },
    { url: '/about', priority: '0.7', changefreq: 'monthly' },
    ...posts.map(post => ({
      url: post.url,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: post.date,
    })),
    ...tagPages.map(url => ({
      url,
      priority: '0.6',
      changefreq: 'monthly',
    })),
  ]
}

module.exports = { getPosts, generateSidebar, getTagPages, getAllPages, BASE_URL, CATEGORY_ORDER }
```

- [ ] **Step 3: Verify the utility works**

```bash
node -e "const { getPosts } = require('./docs/.vitepress/utils/scan-posts.cjs'); console.log(JSON.stringify(getPosts().map(p => p.title), null, 2))"
```

Expected: JSON array of post titles (categories will be empty strings until Task 2).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json docs/.vitepress/utils/scan-posts.cjs
git commit -m "feat: add scan-posts utility with gray-matter frontmatter parsing"
```

---

### Task 2: Add category field to all post frontmatter

**Files:**
- Modify: `docs/posts/vue3-composition-api.md`
- Modify: `docs/posts/typescript-basics.md`
- Modify: `docs/posts/css-flexbox.md`
- Modify: `docs/posts/nodejs-express-api.md`
- Modify: `docs/posts/git-commands.md`
- Modify: `docs/posts/docker-basics.md`
- Modify: `docs/posts/deployment-guide.md`
- Modify: `docs/posts/八股文-1.md`
- Modify: `docs/posts/算法-1.md`
- Modify: `docs/posts/aas-1.md`
- Modify: `docs/posts/golang-1.md`
- Modify: `docs/posts/first-blog.md`

- [ ] **Step 1: Add category to each post frontmatter**

Add `category: <value>` as the last line in each post's frontmatter (before the closing `---`).

Mapping:
- `vue3-composition-api.md` → `category: 前端开发`
- `typescript-basics.md` → `category: 前端开发`
- `css-flexbox.md` → `category: 前端开发`
- `nodejs-express-api.md` → `category: 后端开发`
- `git-commands.md` → `category: 工具与部署`
- `docker-basics.md` → `category: 工具与部署`
- `deployment-guide.md` → `category: 工具与部署`
- `八股文-1.md` → `category: 八股文`
- `算法-1.md` → `category: 算法`
- `aas-1.md` → `category: 项目经历`
- `golang-1.md` → `category: GOlang&C++`
- `first-blog.md` → `category: 其他`

Example for `vue3-composition-api.md`:
```yaml
---
title: Vue3 组合式API完全指南
date: 2026-05-01
tags:
  - Vue
  - 前端
description: 深入理解Vue3组合式API的核心概念和使用方法
category: 前端开发
---
```

- [ ] **Step 2: Verify scan-posts picks up categories**

```bash
node -e "const { generateSidebar } = require('./docs/.vitepress/utils/scan-posts.cjs'); const s = generateSidebar(); s.forEach(g => console.log(g.text, '→', g.items.length, 'posts'))"
```

Expected: Each category name with post count, matching the sidebar in the original config.

- [ ] **Step 3: Commit**

```bash
git add docs/posts/
git commit -m "feat: add category field to all post frontmatter"
```

---

### Task 3: Rewrite feed.cjs and sitemap.cjs to use scan-posts

**Files:**
- Modify: `docs/.vitepress/plugins/feed.cjs`
- Modify: `docs/.vitepress/plugins/sitemap.cjs`

- [ ] **Step 1: Rewrite feed.cjs**

Replace the entire content of `docs/.vitepress/plugins/feed.cjs`:

```js
const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve } = require('path')
const { getPosts, BASE_URL } = require('../utils/scan-posts.cjs')

function generateRSS() {
  const posts = getPosts()
  const now = new Date().toISOString()

  const items = posts
    .map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}${post.url}</link>
      <guid>${BASE_URL}${post.url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.description}]]></description>
    </item>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>汪洋恣意-信一的博客</title>
    <link>${BASE_URL}</link>
    <description>分享技术心得与编程经验，记录成长路上的点点滴滴</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <generator>VitePress</generator>${items}
  </channel>
</rss>`
}

const distDir = resolve(__dirname, '../../.vitepress/dist')

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true })
}

try {
  writeFileSync(resolve(distDir, 'feed.xml'), generateRSS())
  console.log('RSS feed generated at feed.xml')
} catch (e) {
  console.error('Failed to generate RSS feed:', e.message)
}
```

- [ ] **Step 2: Rewrite sitemap.cjs**

Replace the entire content of `docs/.vitepress/plugins/sitemap.cjs`:

```js
const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve } = require('path')
const { getAllPages, BASE_URL } = require('../utils/scan-posts.cjs')

function generateSitemap() {
  const pages = getAllPages()
  const today = new Date().toISOString().split('T')[0]

  const urls = pages.map(page => `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod || today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

const distDir = resolve(__dirname, '../../.vitepress/dist')

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true })
}

try {
  writeFileSync(resolve(distDir, 'sitemap.xml'), generateSitemap())
  console.log('Sitemap generated at sitemap.xml')
} catch (e) {
  console.error('Failed to generate sitemap:', e.message)
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds, `feed.xml` and `sitemap.xml` generated.

- [ ] **Step 4: Verify sitemap content**

```bash
grep -c "<url>" docs/.vitepress/dist/sitemap.xml
```

Expected: Count matches total pages (5 static + 12 posts + tag pages).

- [ ] **Step 5: Verify feed content**

```bash
grep -c "<item>" docs/.vitepress/dist/feed.xml
```

Expected: 12 (one per post).

- [ ] **Step 6: Commit**

```bash
git add docs/.vitepress/plugins/feed.cjs docs/.vitepress/plugins/sitemap.cjs
git commit -m "refactor: auto-generate RSS and sitemap from markdown frontmatter"
```

---

### Task 4: Vite build optimization + cleanUrls + sidebar auto-gen + SEO head tags + transformHead

**Files:**
- Modify: `docs/.vitepress/config.mjs`

- [ ] **Step 1: Replace config.mjs with optimized version**

Replace the entire content of `docs/.vitepress/config.mjs`:

```js
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { generateSidebar } = require('./utils/scan-posts.cjs')

const BASE_URL = 'https://WangYa002.github.io'

export default {
  title: "汪洋恣意-信一的博客",
  description: "分享前端、后端开发经验和编程心得的个人技术博客",
  lang: "zh-CN",
  base: "/",
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/logo2.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: '汪洋恣意的博客', href: '/feed.xml' }],
    ['meta', { name: 'keywords', content: '技术博客, 前端开发, 后端开发, Vue, JavaScript' }],
    ['meta', { name: 'author', content: '汪洋恣意' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'theme-color', content: '#C66B3D' }],
    ['link', { rel: 'apple-touch-icon', href: '/logo.svg' }],
    ['meta', { name: 'applicable-device', content: 'pc,mobile' }],
    ['meta', { name: 'Cache-Control', content: 'no-transform' }],
    ['link', { rel: 'sitemap', type: 'application/xml', title: 'Sitemap', href: '/sitemap.xml' }],
    // Open Graph global defaults
    ['meta', { property: 'og:site_name', content: '汪洋恣意-信一的博客' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:creator', content: '@WangYa002' }],
  ],

  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "标签", link: "/tags/" },
      { text: "归档", link: "/archive/" },
      { text: "关于", link: "/about" }
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/WangYa002" }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    outline: {
      level: [2, 3],
      label: '目录'
    },

    sidebar: {
      '/posts/': generateSidebar(),
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
      '/archive/': [
        {
          text: '快速导航',
          items: [
            { text: '文章列表', link: '/posts/' },
            { text: '标签云', link: '/tags/' }
          ]
        }
      ],
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024-present 汪洋恣意'
    },

    darkModeSwitch: true,
    mobileMenuLabel: '菜单',
    appearances: ['light', 'dark']
  },

  markdown: {
    lineNumbers: false
  },

  vite: {
    build: {
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: {
            'framework': ['vue'],
          }
        }
      }
    },
    optimizeDeps: {
      include: ['vue']
    }
  },

  transformHead({ head, pageData }) {
    const pageUrl = '/' + pageData.relativePath
      .replace(/\.md$/, '')
      .replace(/\/index$/, '/')
      .replace(/^\/index$/, '/')

    // Canonical URL
    head.push(['link', { rel: 'canonical', href: `${BASE_URL}${pageUrl}` }])

    // Per-page OG tags
    if (pageData.title) {
      head.push(['meta', { property: 'og:title', content: pageData.title }])
    }
    if (pageData.description) {
      head.push(['meta', { property: 'og:description', content: pageData.description }])
    }
    head.push(['meta', { property: 'og:url', content: `${BASE_URL}${pageUrl}` }])

    // Article-specific SEO
    if (pageData.relativePath.startsWith('posts/') && !pageData.relativePath.endsWith('index.md')) {
      head.push(['meta', { property: 'og:type', content: 'article' }])

      // JSON-LD structured data
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: pageData.title || '',
        description: pageData.description || '',
        datePublished: pageData.frontmatter.date
          ? new Date(pageData.frontmatter.date).toISOString()
          : '',
        author: {
          '@type': 'Person',
          name: '汪洋恣意',
          url: BASE_URL
        },
        url: `${BASE_URL}${pageUrl}`,
      }
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)])
    } else {
      head.push(['meta', { property: 'og:type', content: 'website' }])

      // WebSite JSON-LD for homepage
      if (pageData.relativePath === 'index.md') {
        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: '汪洋恣意-信一的博客',
          url: BASE_URL,
          description: '分享前端、后端开发经验和编程心得的个人技术博客',
        }
        head.push(['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)])
      }
    }

    return head
  },
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Build succeeds with cleanUrls enabled, sidebar auto-generated.

- [ ] **Step 3: Verify JSON-LD in article HTML**

```bash
grep "application/ld+json" docs/.vitepress/dist/posts/vue3-composition-api/index.html
```

Expected: Shows the JSON-LD script tag with BlogPosting data.

- [ ] **Step 4: Verify canonical URL**

```bash
grep "canonical" docs/.vitepress/dist/posts/vue3-composition-api/index.html
```

Expected: Shows `<link rel="canonical" href="https://WangYa002.github.io/posts/vue3-composition-api">`.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/config.mjs
git commit -m "feat: cleanUrls, auto sidebar, SEO head tags, transformHead with OG/JSON-LD/canonical"
```

---

### Task 5: Font stack + animation performance + prefers-reduced-motion in custom.css

**Files:**
- Modify: `docs/.vitepress/theme/custom.css`

- [ ] **Step 1: Fix font stack**

In `custom.css`, find the code block font-family declaration (around line 527):

```css
font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace !important;
```

Replace with:

```css
font-family: Consolas, 'Courier New', monospace !important;
```

- [ ] **Step 2: Add hardware acceleration for animated elements**

After the `/* Animations - Gentle & Organic */` section (around line 776), add before the closing of that section:

```css
/* Hardware acceleration for animated elements */
.VPFeature,
.post-card,
.quick-nav-item,
.header-decoration {
  will-change: transform;
}
```

- [ ] **Step 3: Add prefers-reduced-motion support at end of file**

Append to the end of `custom.css`:

```css
/* ============================================
   Reduced Motion - Accessibility
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .VPFeature,
  .VPButton,
  .VPCard,
  .post-card,
  .quick-nav-item,
  .header-decoration,
  .tag-pill,
  .article-card {
    transition: none !important;
    animation: none !important;
  }

  .VPFeature:hover,
  .VPCard:hover {
    transform: none !important;
  }

  .VPHome .post-card:hover {
    transform: none !important;
  }

  .VPHome .quick-nav-item:hover {
    transform: none !important;
  }

  @keyframes posts-float {
    0%, 100% { transform: none; }
  }

  @keyframes tags-float {
    0%, 100% { transform: none; }
  }

  @keyframes archive-float {
    0%, 100% { transform: none; }
  }
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds with no CSS errors.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/theme/custom.css
git commit -m "perf: fix font stack, add hardware acceleration and prefers-reduced-motion"
```

---

### Task 6: IntroAnimation.vue reduced-motion support

**Files:**
- Modify: `docs/.vitepress/theme/components/IntroAnimation.vue`

- [ ] **Step 1: Add reduced-motion detection in script setup**

In the `<script setup>` section, after line 68 (`let animId = null`), add:

```js
const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

- [ ] **Step 2: Skip animation if reduced motion preferred**

Modify the initialization block. Change:

```js
if (typeof window !== 'undefined' && !sessionStorage.getItem('intro_shown')) {
  visible.value = true
}
```

to:

```js
if (typeof window !== 'undefined' && !sessionStorage.getItem('intro_shown')) {
  if (prefersReducedMotion) {
    sessionStorage.setItem('intro_shown', '1')
  } else {
    visible.value = true
  }
}
```

- [ ] **Step 3: Add reduced-motion CSS in scoped style**

Add at the end of the `<style scoped>` section, before `</style>`:

```css
@media (prefers-reduced-motion: reduce) {
  .intro-logo {
    animation: none !important;
  }
  .title-char {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
  .intro-sub {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .divider-line {
    animation: none !important;
    width: 100px !important;
  }
  .enter-btn {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .spotlight {
    animation: none !important;
  }
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/theme/components/IntroAnimation.vue
git commit -m "a11y: skip intro animation when prefers-reduced-motion is set"
```

---

### Task 7: Custom 404 page

**Files:**
- Create: `docs/404.md`

- [ ] **Step 1: Create the 404 page**

Create `docs/404.md`:

```md
---
layout: page
title: 页面未找到
---

<div class="not-found-page">
  <div class="not-found-center">
    <div class="not-found-code">404</div>
    <h1 class="not-found-title">页面未找到</h1>
    <p class="not-found-desc">抱歉，你访问的页面不存在或已被移动。</p>
    <div class="not-found-actions">
      <a href="/" class="not-found-btn primary">返回首页</a>
      <a href="/posts/" class="not-found-btn">浏览文章</a>
    </div>
  </div>
</div>

<style>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}
.not-found-center {
  text-align: center;
}
.not-found-code {
  font-size: 6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #C66B3D, #606C38);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  margin-bottom: 1rem;
}
.not-found-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.75rem;
}
.not-found-desc {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  margin-bottom: 2rem;
}
.not-found-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}
.not-found-btn {
  padding: 0.65em 1.4em;
  border-radius: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s ease;
}
.not-found-btn.primary {
  background: linear-gradient(135deg, #C66B3D, #B08B6E);
  color: #fff;
  box-shadow: 0 4px 20px rgba(198, 107, 61, 0.25);
}
.not-found-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(198, 107, 61, 0.35);
}
.not-found-btn:not(.primary) {
  border: 2px solid #C66B3D;
  color: #C66B3D;
  background: transparent;
}
.not-found-btn:not(.primary):hover {
  background: #C66B3D;
  color: #fff;
  transform: translateY(-2px);
}
</style>
```

- [ ] **Step 2: Build and verify 404 page is generated**

```bash
npm run build && ls docs/.vitepress/dist/404.html
```

Expected: `404.html` file exists in dist.

- [ ] **Step 3: Commit**

```bash
git add docs/404.md
git commit -m "feat: add custom 404 page with blog-consistent styling"
```

---

### Task 8: Mobile CSS improvements

**Files:**
- Modify: `docs/.vitepress/theme/custom.css`

- [ ] **Step 1: Improve blog stats on small screens**

In the `@media (max-width: 768px)` section for `.VPHome`, find the existing `.blog-stats` rules (around line 301-303):

```css
  .VPHome .blog-stats {
    gap: 2rem;
  }

  .VPHome .blog-stats .stat-value {
    font-size: 2rem;
  }
```

Replace with:

```css
  .VPHome .blog-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .VPHome .blog-stats .stat-value {
    font-size: 1.75rem;
  }
```

- [ ] **Step 2: Add better mobile padding for article content**

In the same `@media (max-width: 768px)` section, after the `.VPDocAside` rule, add:

```css
  .VPDoc .content-container {
    padding: 0 1.25rem !important;
  }
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/custom.css
git commit -m "ux: improve mobile layout for blog stats and article content"
```

---

### Task 9: Accessibility improvements

**Files:**
- Modify: `docs/index.md`
- Modify: `docs/.vitepress/theme/custom.css`

- [ ] **Step 1: Add aria-hidden to decorative emoji in index.md**

In `docs/index.md`, add `aria-hidden="true"` to all emoji icon spans. Change:

```html
<span class="quick-nav-icon">🏷️</span>
```
to:
```html
<span class="quick-nav-icon" aria-hidden="true">🏷️</span>
```

Apply to all three quick-nav-icon spans (🏷️, 📅, 👤).

- [ ] **Step 2: Add aria-label to quick navigation links**

Change each quick-nav-item anchor to include `aria-label`:

```html
<a href="/tags/" class="quick-nav-item" aria-label="标签分类">
```

```html
<a href="/archive/" class="quick-nav-item" aria-label="文章归档">
```

```html
<a href="/about/" class="quick-nav-item" aria-label="关于作者">
```

- [ ] **Step 3: Add focus-visible styles in custom.css**

Append to the end of `custom.css`:

```css
/* ============================================
   Focus Styles - Accessibility
   ============================================ */
:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
  border-radius: 4px;
}

.post-card:focus-visible,
.quick-nav-item:focus-visible,
.not-found-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add docs/index.md docs/.vitepress/theme/custom.css
git commit -m "a11y: add aria labels, focus-visible styles, and decorative icon hiding"
```

---

### Task 10: Dark mode consistency - Giscus fix

**Files:**
- Modify: `docs/.vitepress/theme/components/GiscusComment.vue`

- [ ] **Step 1: Fix dark mode switching to use VitePress useData**

Replace the `<script setup>` section of `GiscusComment.vue` with:

```js
import { ref, onMounted, watch } from 'vue'
import { useData } from 'vitepress'

const giscusHost = ref(null)
const isLoaded = ref(false)
const { isDark } = useData()

const giscusConfig = {
  repo: 'your-github/your-repo',
  repoId: 'your-repo-id',
  category: 'General',
  categoryId: 'your-category-id',
  mapping: 'pathname',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'bottom',
  lang: 'zh-CN',
  loading: 'lazy'
}

function loadGiscus() {
  if (!giscusHost.value) return

  const isConfigured = !giscusConfig.repo.includes('your-github') &&
                       !giscusConfig.repoId.includes('your-repo-id')

  if (!isConfigured) {
    console.log('Giscus 评论功能未配置。请访问 https://giscus.app 获取配置信息。')
    return
  }

  const theme = isDark.value ? 'dark_dimmed' : 'light'

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', giscusConfig.repo)
  script.setAttribute('data-repo-id', giscusConfig.repoId)
  script.setAttribute('data-category', giscusConfig.category)
  script.setAttribute('data-category-id', giscusConfig.categoryId)
  script.setAttribute('data-mapping', giscusConfig.mapping)
  script.setAttribute('data-strict', giscusConfig.strict)
  script.setAttribute('data-reactions-enabled', giscusConfig.reactionsEnabled)
  script.setAttribute('data-emit-metadata', giscusConfig.emitMetadata)
  script.setAttribute('data-input-position', giscusConfig.inputPosition)
  script.setAttribute('data-theme', theme)
  script.setAttribute('data-lang', giscusConfig.lang)
  script.setAttribute('data-loading', giscusConfig.loading)
  script.crossOrigin = 'anonymous'
  script.async = true

  giscusHost.value.appendChild(script)
  isLoaded.value = true
}

onMounted(() => {
  loadGiscus()
})

watch(isDark, (newIsDark) => {
  if (!isLoaded.value) return

  const iframe = document.querySelector('iframe.giscus-frame')
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: newIsDark ? 'dark_dimmed' : 'light' } } },
      'https://giscus.app'
    )
  }
})
```

Key change: Replace `document.documentElement.classList.contains('dark')` with VitePress `useData().isDark` reactive ref, so the watcher actually triggers on theme change.

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/GiscusComment.vue
git commit -m "fix: use VitePress useData for Giscus dark mode reactivity"
```

---

### Task 11: ViewTransition API support

**Files:**
- Modify: `docs/.vitepress/theme/components/DocLayout.vue`

- [ ] **Step 1: Add ViewTransition support**

Add to the `<script setup>` section of `DocLayout.vue`, after the existing imports:

```js
import { onMounted, onBeforeUnmount } from 'vue'
import { useData } from 'vitepress'

const { isDark } = useData()

function handleViewTransition(e) {
  if (!document.startViewTransition) return
  e.preventDefault()
  document.startViewTransition(() => {
    isDark.value = !isDark.value
  })
}

onMounted(() => {
  const toggle = document.querySelector('.VPSwitch.VPSwitchAppearance')
  if (toggle) {
    toggle.addEventListener('click', handleViewTransition, true)
  }
})

onBeforeUnmount(() => {
  const toggle = document.querySelector('.VPSwitch.VPSwitchAppearance')
  if (toggle) {
    toggle.removeEventListener('click', handleViewTransition, true)
  }
})
```

Note: Merge `onMounted`/`onBeforeUnmount` with any existing imports if they're already imported (they're not in the current file).

- [ ] **Step 2: Add ViewTransition CSS**

Add to the `<style scoped>` section:

```css
::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

.dark::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}

.dark::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. ViewTransition is progressive enhancement — unsupported browsers ignore it.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/components/DocLayout.vue
git commit -m "feat: add ViewTransition API for smooth dark mode toggle"
```

---

### Task 12: Image compression

**Files:**
- Modify: `docs/public/logo.png`
- Modify: `docs/public/logo2.png`
- Modify: `index.png`

- [ ] **Step 1: Check current image sizes**

```bash
ls -lh docs/public/logo.png docs/public/logo2.png index.png
```

- [ ] **Step 2: Install sharp for compression**

```bash
npm install --save-dev sharp
```

- [ ] **Step 3: Compress images**

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
const files = [
  { in: 'index.png', out: 'index.png', maxW: 1200 },
  { in: 'docs/public/logo.png', out: 'docs/public/logo.png', maxW: 512 },
  { in: 'docs/public/logo2.png', out: 'docs/public/logo2.png', maxW: 512 },
];
Promise.all(files.map(f =>
  sharp(f.in)
    .resize({ width: f.maxW, withoutEnlargement: true })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(f.out + '.tmp')
    .then(info => {
      fs.renameSync(f.out + '.tmp', f.out);
      console.log('Compressed:', f.in, '→', Math.round(info.size / 1024) + 'KB');
    })
)).then(() => console.log('All done'));
"
```

- [ ] **Step 4: Verify compression results**

```bash
ls -lh docs/public/logo.png docs/public/logo2.png index.png
```

Expected: File sizes significantly reduced, especially `index.png`.

- [ ] **Step 5: Remove sharp devDependency**

```bash
npm uninstall sharp
```

- [ ] **Step 6: Build and verify**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add index.png docs/public/logo.png docs/public/logo2.png package.json package-lock.json
git commit -m "perf: compress blog images for faster loading"
```

---

### Task 13: Final build verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds, feed.xml and sitemap.xml generated.

- [ ] **Step 2: Verify key output files exist**

```bash
ls docs/.vitepress/dist/feed.xml docs/.vitepress/dist/sitemap.xml docs/.vitepress/dist/404.html
```

Expected: All three files exist.

- [ ] **Step 3: Verify sitemap contains all posts**

```bash
grep -c "<url>" docs/.vitepress/dist/sitemap.xml
```

Expected: Count matches total pages.

- [ ] **Step 4: Verify feed contains all posts**

```bash
grep -c "<item>" docs/.vitepress/dist/feed.xml
```

Expected: 12.

- [ ] **Step 5: Verify cleanUrls generated correctly**

```bash
ls docs/.vitepress/dist/posts/vue3-composition-api/index.html
```

Expected: File exists (directory-based URLs from cleanUrls).

- [ ] **Step 6: Verify JSON-LD in article HTML**

```bash
grep "BlogPosting" docs/.vitepress/dist/posts/vue3-composition-api/index.html
```

Expected: Shows BlogPosting in the JSON-LD script.

- [ ] **Step 7: Start dev server for visual check**

```bash
npm run dev
```

Open browser and verify:
- Homepage loads with intro animation
- Navigation works without .html suffixes
- Dark mode toggle works smoothly
- 404 page shows for invalid URLs
