const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const POSTS_DIR = path.resolve(__dirname, '../../posts')
const TAGS_DIR = path.resolve(__dirname, '../../tags')
const BASE_URL = 'https://WangYa002.github.io'

// 分类排序与展示信息（icon / 中文名）
const CATEGORY_ORDER = {
  '前端开发': 1,
  '后端开发': 2,
  '工具与部署': 3,
  '八股文': 4,
  '算法': 5,
  '项目经历': 6,
  'GOlang&C++': 7,
  '其他': 8,
}

// 分类 → emoji 图标映射
const CATEGORY_ICON = {
  '前端开发': '🚀',
  '后端开发': '⚙️',
  '工具与部署': '🛠️',
  '八股文': '📚',
  '算法': '🧮',
  '项目经历': '🚀',
  'GOlang&C++': '🐹',
  '其他': '📦',
}

// tag slug → { name, icon } 映射
const TAG_META = {
  frontend: { name: '前端', icon: '🌐' },
  backend: { name: '后端', icon: '🖥️' },
  vue: { name: 'Vue', icon: '💚' },
  typescript: { name: 'TypeScript', icon: '🔷' },
  css: { name: 'CSS', icon: '🎨' },
  nodejs: { name: 'Node.js', icon: '🟢' },
  git: { name: 'Git', icon: '📦' },
  docker: { name: 'Docker', icon: '🐳' },
  devops: { name: 'DevOps', icon: '🔄' },
  interview: { name: '八股文', icon: '📚' },
  algorithm: { name: '算法', icon: '🧮' },
  project: { name: '项目经历', icon: '🚀' },
  golang: { name: 'GOlang&C++', icon: '🐹' },
  'Golang&C++': { name: 'GOlang&C++', icon: '🐹' },
}

// tag 中文名/别名 → slug 映射（slug 必须对应 docs/tags/ 下真实存在的目录）
const TAG_ALIAS = {
  '前端': 'frontend',
  '后端': 'backend',
  'Vue': 'vue',
  'TypeScript': 'typescript',
  'CSS': 'css',
  'Node.js': 'nodejs',
  'Git': 'git',
  'Docker': 'docker',
  'DevOps': 'devops',
  '八股文': 'interview',
  '算法': 'algorithm',
  '项目经历': 'project',
  'GOlang&C++': 'golang',
  'Golang&C++': 'golang',
}

/**
 * 把 frontmatter 的 date 归一化为 'YYYY-MM-DD' 字符串。
 * gray-matter 会把未加引号的日期解析成 Date 对象，
 * 直接 String().slice(0,10) 会得到 'Fri May 01' 这样的废数据，
 * 必须先判 Date 实例再取 toISOString。
 */
function normalizeDate(d) {
  if (!d) return null
  if (d instanceof Date) {
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  const s = String(d).trim()
  // 已经是 YYYY-MM-DD 或以日期开头
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
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
      date: normalizeDate(data.date),
      description: data.description || '',
      tags: data.tags || [],
      category: data.category || '其他',
      url: `/posts/${slug}`,
      slug,
    }
  }).filter(post => post.date).sort((a, b) => new Date(b.date) - new Date(a.date))
}

function generateSidebar() {
  const posts = getPosts()
  const groups = {}

  posts.forEach(post => {
    const cat = post.category || '其他'
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

/**
 * 全站总数统计：文章数 / 分类数 / 标签数（仅计有目录的标签）
 */
function getStats() {
  const posts = getPosts()
  const categories = new Set(posts.map(p => p.category))
  return {
    posts: posts.length,
    categories: categories.size,
    tags: getTagStats().length,
  }
}

/**
 * 分类维度统计：[{ name, count, icon }]，按 CATEGORY_ORDER 排序
 */
function getCategoryStats() {
  const posts = getPosts()
  const groups = {}
  posts.forEach(p => {
    const c = p.category || '其他'
    groups[c] = (groups[c] || 0) + 1
  })
  return Object.entries(groups)
    .sort(([a], [b]) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99))
    .map(([name, count]) => ({
      name,
      count,
      icon: CATEGORY_ICON[name] || '📦',
    }))
}

/**
 * 标签维度统计：[{ slug, name, icon, count }]
 * slug = tags 目录名（用于生成链接）；count = 含该 tag 的文章数
 * 只返回在 docs/tags/ 下真实存在目录的标签，避免死链。
 */
function getTagStats() {
  const posts = getPosts()
  const existingDirs = getTagPages().map(url => url.replace(/^\/tags\//, '').replace(/\/$/, ''))

  // 统计每个 slug 对应的中文 name 与文章数
  const stat = {} // slug -> { name, icon, count }
  posts.forEach(p => {
    (p.tags || []).forEach(t => {
      const slug = TAG_ALIAS[t] || t
      // 没有 alias 映射的标签（如 LeetCode/Express）跳过，因为没有对应目录
      if (!slug || !TAG_ALIAS[t]) return
      if (!stat[slug]) {
        const meta = TAG_META[slug] || {}
        stat[slug] = {
          slug,
          name: meta.name || t,
          icon: meta.icon || '🏷️',
          count: 0,
        }
      }
      stat[slug].count += 1
    })
  })

  // 仅保留有对应 tags 目录的，避免点击死链
  const result = Object.values(stat).filter(t => existingDirs.includes(t.slug))

  // 按文章数倒序，再按名字
  return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
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

module.exports = {
  getPosts,
  generateSidebar,
  getStats,
  getCategoryStats,
  getTagStats,
  getTagPages,
  getAllPages,
  normalizeDate,
  BASE_URL,
  CATEGORY_ORDER,
  CATEGORY_ICON,
  TAG_META,
  TAG_ALIAS,
}
