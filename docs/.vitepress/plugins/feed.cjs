const { writeFileSync, existsSync, mkdirSync } = require('fs')
const { resolve } = require('path')
const { getPosts, BASE_URL } = require('../utils/scan-posts.cjs')

// 文章数据统一来自 scan-posts.cjs（已修复 date 解析），
// 不再在此手写 posts 数组，新增/修改文章自动同步到 RSS。
const posts = getPosts()

function generateRSS() {
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
    <description>分享技术心得与编程经验，记录成长的点点滴滴</description>
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
