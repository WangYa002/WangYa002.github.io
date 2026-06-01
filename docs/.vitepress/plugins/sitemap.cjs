const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve } = require('path')

const baseUrl = 'https://WangYa002.github.io'

const pages = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/posts/', priority: '0.9', changefreq: 'weekly' },
  { url: '/tags/', priority: '0.8', changefreq: 'weekly' },
  { url: '/archive/', priority: '0.8', changefreq: 'weekly' },
  { url: '/about', priority: '0.7', changefreq: 'monthly' },
  { url: '/posts/vue3-composition-api', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/typescript-basics', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/nodejs-express-api', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/git-commands', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/css-flexbox', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/docker-basics', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/deployment-guide', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/first-blog', priority: '0.6', changefreq: 'monthly' },
  { url: '/posts/八股文-1', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/算法-1', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/aas-1', priority: '0.8', changefreq: 'monthly' },
  { url: '/posts/golang-1', priority: '0.8', changefreq: 'monthly' },
  { url: '/tags/frontend/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/backend/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/vue/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/typescript/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/nodejs/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/css/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/git/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/docker/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/devops/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/interview/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/algorithm/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/project/', priority: '0.6', changefreq: 'monthly' },
  { url: '/tags/golang/', priority: '0.6', changefreq: 'monthly' },
]

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0]

  const urls = pages.map(page => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
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
