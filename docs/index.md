---
layout: home

hero:
  name: "汪洋恣意"
  text: "信一的个人博客"
  tagline: "分享技术心得与编程经验，记录成长路上的点点滴滴"
  image:
    src: /logo.png
    alt: Blog Logo
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
    details: 分享前端、后端开发经验和最佳实践，涵盖 Vue、React、Node.js 等技术栈
  - icon: 💡
    title: 学习心得
    details: 记录学习新技术的过程和思考，帮助小白少走弯路
  - icon: 🚀
    title: 项目实战
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
import { ref, onMounted } from 'vue'

// 最新文章数据
const recentPosts = ref([
  { title: 'Vue3 组合式API完全指南', date: '2026-05-01', link: '/posts/vue3-composition-api' },
  { title: 'TypeScript 入门指南', date: '2026-04-20', link: '/posts/typescript-basics' },
  { title: 'Git 常用命令速查表', date: '2026-04-10', link: '/posts/git-commands' }
])

// 博客统计
const stats = ref({
  posts: 8,
  categories: 3,
  tags: 9
})
</script>

<style scoped>
/* 最新文章区域 */
.recent-posts {
  padding: 2rem 0;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--vp-c-text-1);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
}

.post-item:hover {
  transform: translateX(8px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 12px rgba(100, 108, 255, 0.1);
}

.post-date {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-right: 1rem;
  min-width: 80px;
}

.post-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.post-title:hover {
  color: var(--vp-c-brand-1);
}

/* 博客统计 */
.blog-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 2rem 0;
  margin-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .blog-stats {
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .post-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .post-date {
    margin-right: 0;
  }
}
</style>

<div class="VPHome">
  <!-- 博客统计 -->
  <div class="blog-stats">
    <div class="stat-item">
      <div class="stat-value">{stats.value.posts}</div>
      <div class="stat-label">文章</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">{stats.value.categories}</div>
      <div class="stat-label">分类</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">{stats.value.tags}</div>
      <div class="stat-label">标签</div>
    </div>
  </div>

  <!-- 最新文章 -->
  <div class="recent-posts">
    <h2 class="section-title">📖 最新文章</h2>
    <div class="post-list">
      <a
        v-for="post in recentPosts"
        :key="post.title"
        :href="post.link"
        class="post-item"
      >
        <span class="post-date">{{ post.date }}</span>
        <span class="post-title">{{ post.title }}</span>
      </a>
    </div>
  </div>
</div>