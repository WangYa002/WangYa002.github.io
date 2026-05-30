const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve } = require('path')

const posts = [
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
]

function generateSitemap(posts, baseUrl) {
  const today = new Date().toISOString().split('T')[0]

  const urls = posts.map(post => `
  <url>
    <loc>${baseUrl}${post.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${post.changefreq}</changefreq>
    <priority>${post.priority}</priority>
  </url>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

const baseUrl = 'https://your-domain.com' // 修改为你的域名
const sitemapXml = generateSitemap(posts, baseUrl)

const distDir = 'D:/BLOG_WANGYANG/docs/.vitepress/dist'

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true })
}

const sitemapPath = resolve(distDir, 'sitemap.xml')

try {
  writeFileSync(sitemapPath, sitemapXml)
} catch (e) {
  // Silent fail
}