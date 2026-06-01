---
layout: home

hero:
  name: "汪洋恣意"
  text: "信一的个人博客"
  tagline: "分享技术心得与编程经验，记录成长路上的点点滴滴"
  image: false
  actions:
    - theme: brand
      text: 阅读文章
      link: /posts/
    - theme: alt
      text: 关于我
      link: /about

features:
  - icon: 📝
    title: 技术文章
    link: /posts/vue3-composition-api
    details: 分享前端、后端开发经验和最佳实践，涵盖 Vue、React、Node.js 等技术栈
  - icon: 💡
    title: 学习心得
    link: /posts/八股文-1
    details: 记录学习新技术的过程和思考，帮助小白少走弯路
  - icon: 🚀
    title: 项目实战
    link: /posts/deployment-guide
    details: 展示个人项目和开源贡献，代码皆可运行

features2:
  - icon: 🏷️
    title: 标签分类
    link: /tags/
    details: 按标签查看文章，快速定位所需内容
  - icon: 📅
    title: 文章归档
    link: /archive/
    details: 按时间线回顾所有文章
  - icon: 🔍
    title: 站内搜索
    details: 输入关键词快速找到文章
---

<script setup>
import { ref } from 'vue'

const stats = ref({
  posts: 12,
  categories: 7,
  tags: 13
})

const recentPosts = ref([
  {
    title: 'Vue3 组合式API完全指南',
    date: '2026-05-01',
    category: '前端',
    tags: ['Vue', 'JavaScript'],
    link: '/posts/vue3-composition-api'
  },
  {
    title: 'TypeScript 入门指南',
    date: '2026-04-20',
    category: '前端',
    tags: ['TypeScript'],
    link: '/posts/typescript-basics'
  },
  {
    title: 'Git 常用命令速查表',
    date: '2026-04-10',
    category: '工具',
    tags: ['Git'],
    link: '/posts/git-commands'
  }
])

function getCategoryColor(category) {
  const colors = {
    '前端': '#C66B3D',
    '后端': '#606C38',
    '工具': '#8B8279',
    'DevOps': '#B08B6E'
  }
  return colors[category] || '#C66B3D'
}
</script>

<div class="VPHome">
  <!-- 博客统计 -->
  <div class="blog-stats">
    <div class="stat-item">
      <div class="stat-value">{{ stats.posts }}</div>
      <div class="stat-label">篇文章</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">{{ stats.categories }}</div>
      <div class="stat-label">个分类</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">{{ stats.tags }}</div>
      <div class="stat-label">个标签</div>
    </div>
  </div>

  <!-- 最新文章 -->
  <div class="recent-posts">
    <div class="section-header">
      <h2 class="section-title">最新文章</h2>
      <div class="section-line"></div>
      <a href="/posts/" class="section-link">查看全部 →</a>
    </div>
    <div class="post-list">
      <a
        v-for="post in recentPosts"
        :key="post.title"
        :href="post.link"
        class="post-card"
      >
        <div class="post-info">
          <div class="post-title-section">
            <span class="post-title">{{ post.title }}</span>
            <div class="post-meta">
              <span class="post-date"> {{ post.date }}</span>
              <span
                class="post-category"
                :style="{ background: getCategoryColor(post.category) }"
              >
                {{ post.category }}
              </span>
              <div class="post-tags">
                <span
                  v-for="tag in post.tags"
                  :key="tag"
                  class="post-tag"
                >{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
        <span class="post-arrow">→</span>
      </a>
    </div>
  </div>

  <!-- 快速导航 -->
  <div class="quick-nav">
    <a href="/tags/" class="quick-nav-item">
      <span class="quick-nav-icon">🏷️</span>
      <span class="quick-nav-title">标签分类</span>
      <span class="quick-nav-desc">按标签快速查找文章</span>
    </a>
    <a href="/archive/" class="quick-nav-item">
      <span class="quick-nav-icon">📅</span>
      <span class="quick-nav-title">文章归档</span>
      <span class="quick-nav-desc">按时间线回顾所有文章</span>
    </a>
    <a href="/about/" class="quick-nav-item">
      <span class="quick-nav-icon">👤</span>
      <span class="quick-nav-title">关于作者</span>
      <span class="quick-nav-desc">了解博主的更多信息</span>
    </a>
  </div>
</div>