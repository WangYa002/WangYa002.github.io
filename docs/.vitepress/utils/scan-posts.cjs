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
