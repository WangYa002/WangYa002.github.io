---
layout: home

hero:
  name: "汪洋恣意"
  text: "信一的个人博客"
  tagline: "分享技术心得与编程经验，记录成长路上的点点滴滴"
  image:
    src: /logo.svg
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
import { ref } from 'vue'

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

const stats = ref({
  posts: 8,
  categories: 3,
  tags: 9
})

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

<style scoped>
/* ============================================
   Blog Stats Section
   ============================================ */
.blog-stats {
  display: flex;
  justify-content: center;
  gap: 4rem;
  padding: 2rem 0;
  margin: 0 auto;
  max-width: 600px;
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.stat-item::after {
  content: '';
  position: absolute;
  right: -2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 40px;
  background: var(--vp-c-divider);
}

.stat-item:last-child::after {
  display: none;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  font-family: Georgia, serif;
  line-height: 1;
}

.stat-label {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
  letter-spacing: 0.05em;
}

/* ============================================
   Section Title
   ============================================ */
.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.section-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, var(--vp-c-brand-1), transparent);
  border-radius: 1px;
}

.section-link {
  font-size: 0.95rem;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.section-link:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

/* ============================================
   Recent Posts
   ============================================ */
.recent-posts {
  padding: 2rem 0;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  max-width: 100%;
}

.post-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--vp-c-brand-1);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 24px rgba(198, 107, 61, 0.12);
}

.post-card:hover::before {
  opacity: 1;
}

.post-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  min-width: 0;
}

.post-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  max-width: 60%;
}

.post-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  transition: color 0.2s ease;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-card:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: nowrap;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.post-date {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--vp-c-text-3);
}

.post-category {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.75rem;
  background: var(--vp-c-brand-1);
  color: #fff;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.post-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.post-tag {
  padding: 0.2rem 0.6rem;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  border-radius: 6px;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.post-card:hover .post-tag {
  background: var(--vp-c-bg);
}

.post-arrow {
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
  color: var(--vp-c-text-3);
  transition: all 0.3s ease;
}

.post-card:hover .post-arrow {
  color: var(--vp-c-brand-1);
  transform: translateY(-50%) translateX(4px);
}

/* ============================================
   Quick Navigation
   ============================================ */
.quick-nav {
  display: flex;
  gap: 1.5rem;
  padding: 2rem 0;
  justify-content: center;
}

.quick-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 280px;
  height: 160px;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.quick-nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), #e8a87c);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.quick-nav-item:hover {
  transform: translateY(-6px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(198, 107, 61, 0.18);
}

.quick-nav-item:hover::before {
  transform: scaleX(1);
}

.quick-nav-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  transition: transform 0.3s ease;
}

.quick-nav-item:hover .quick-nav-icon {
  transform: scale(1.1);
}

.quick-nav-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.4rem;
}

.quick-nav-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  text-align: center;
  line-height: 1.5;
}

/* ============================================
   Responsive
   ============================================ */
@media (max-width: 1024px) {
  .quick-nav {
    gap: 1rem;
  }

  .quick-nav-item {
    width: 240px;
    height: 150px;
    padding: 1.25rem;
  }
}

@media (max-width: 900px) {
  .quick-nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }

  .quick-nav-item {
    width: calc(50% - 0.5rem);
    max-width: 280px;
    height: auto;
    min-height: 140px;
  }

  .blog-stats {
    gap: 2.5rem;
    max-width: 100%;
  }

  .stat-item::after {
    right: -1.25rem;
  }
}

@media (max-width: 600px) {
  .quick-nav {
    flex-direction: column;
    align-items: center;
  }

  .quick-nav-item {
    width: 100%;
    max-width: 320px;
  }
}

@media (max-width: 768px) {
  .blog-stats {
    gap: 1.5rem;
    padding: 1.5rem 1rem;
    border-radius: 16px;
  }

  .stat-value {
    font-size: 2rem;
  }
  
  .stat-label {
    font-size: 0.85rem;
  }

  .stat-item::after {
    display: none;
  }

  .post-card {
    padding: 1.25rem 1.5rem;
    flex-direction: column;
    align-items: flex-start;
  }

  .post-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
  }

  .post-title-section {
    width: 100%;
  }

  .post-title {
    white-space: normal;
    font-size: 1.05rem;
  }

  .post-meta {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.75rem;
    width: 100%;
  }
  
  .post-tags {
    flex: 1;
  }

  .post-arrow {
    display: none;
  }

  .section-header {
    flex-wrap: wrap;
  }

  .section-line {
    display: none;
  }
}
</style>

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