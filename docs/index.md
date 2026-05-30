---
layout: page

title: 汪洋恣意 - 信一的个人博客
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
/* 博客首页容器 */
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* Hero 区域 */
.hero-section {
  text-align: center;
  padding: 3rem 0;
  margin-bottom: 3rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}

.hero-tagline {
  font-size: 1.1rem;
  color: var(--vp-c-text-3);
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* 主内容区域 - 水平布局 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

/* 博客统计 */
.blog-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem;
}

.stat-value {
  font-size: 3rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  line-height: 1;
}

.stat-label {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
}

/* 最新文章 */
.recent-posts {
  padding: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
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

.post-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  text-decoration: none;
}

.post-card:hover {
  transform: translateX(8px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 24px rgba(198, 107, 61, 0.12);
}

.post-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
}

.post-card:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.post-date {
  color: var(--vp-c-text-3);
}

.post-category {
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
}

.post-tag {
  padding: 0.2rem 0.6rem;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  border-radius: 6px;
  font-size: 0.8rem;
}

.post-arrow {
  font-size: 1.25rem;
  color: var(--vp-c-text-3);
  transition: all 0.3s ease;
}

.post-card:hover .post-arrow {
  color: var(--vp-c-brand-1);
  transform: translateX(4px);
}

/* 快速导航 */
.quick-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.quick-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.quick-nav-item:hover {
  transform: translateY(-6px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(198, 107, 61, 0.18);
}

.quick-nav-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
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
}

/* 响应式 */
@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .blog-stats {
    flex-direction: row;
    justify-content: space-around;
  }
  
  .quick-nav {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
  }
  
  .blog-stats {
    flex-direction: column;
  }
  
  .hero-actions {
    flex-direction: column;
  }
}
</style>

<div class="home-container">
  <!-- Hero 区域 -->
  <div class="hero-section">
    <h1 class="hero-title">汪洋恣意</h1>
    <p class="hero-subtitle">信一的个人博客</p>
    <p class="hero-tagline">分享技术心得与编程经验，记录成长路上的点点滴滴</p>
    <div class="hero-actions">
      <a href="/posts/" class="VPButton brand">阅读文章</a>
      <a href="/about/" class="VPButton alt">关于我</a>
    </div>
  </div>

  <!-- 主内容区域 -->
  <div class="main-content">
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
          <div>
            <div class="post-title">{{ post.title }}</div>
            <div class="post-meta">
              <span class="post-date">{{ post.date }}</span>
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
          <span class="post-arrow">→</span>
        </a>
      </div>
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
      <span class="quick-nav-icon"></span>
      <span class="quick-nav-title">关于作者</span>
      <span class="quick-nav-desc">了解博主的更多信息</span>
    </a>
  </div>
</div>