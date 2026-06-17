const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve } = require('path')
const { getAllPages, BASE_URL } = require('../utils/scan-posts.cjs')

// 页面清单统一来自 scan-posts.cjs 的 getAllPages()，
// 不再在此手写 pages 数组，文章/标签页增删自动同步。
const pages = getAllPages()

function generateSitemap() {
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
