// VitePress Build-Time Data Loader
// 全站唯一的文章数据入口：前端组件从这里取数据，
// 后端构建脚本（feed.cjs / sitemap.cjs）从 scan-posts.cjs 取数据。
// 两者共用同一份 scan-posts.cjs，确保数据源一致。
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  getPosts,
  getStats,
  getCategoryStats,
  getTagStats,
} = require('./utils/scan-posts.cjs')

export default {
  // 文章增删改时，dev 模式自动 HMR 重算
  watch: ['../posts/*.md', '../posts/*.markdown'],
  load() {
    const posts = getPosts()
    return {
      posts,
      stats: getStats(),
      categories: getCategoryStats(),
      tags: getTagStats(),
    }
  },
}
