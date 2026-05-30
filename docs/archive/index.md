---
layout: page
title: 文章归档
---

<div class="archive-page">

<!-- Page Header -->
<div class="page-header">
  <div class="header-decoration">
    <span class="header-icon">📚</span>
  </div>
  <h1 class="header-title">文章归档</h1>
  <p class="header-subtitle">按时间线回顾所有文章，记录成长的每一步</p>
</div>

<!-- Stats Bar -->
<div class="stats-bar">
  <div class="stat-item">
    <span class="stat-icon">📝</span>
    <span class="stat-value">8</span>
    <span class="stat-label">篇文章</span>
  </div>
  <div class="stat-divider"></div>
  <div class="stat-item">
    <span class="stat-icon">📂</span>
    <span class="stat-value">3</span>
    <span class="stat-label">个分类</span>
  </div>
  <div class="stat-divider"></div>
  <div class="stat-item">
    <span class="stat-icon">🏷️</span>
    <span class="stat-value">9</span>
    <span class="stat-label">个标签</span>
  </div>
</div>

<!-- Year Grid -->
<div class="year-section">
  <div class="year-header">
    <span class="year-badge">2026</span>
    <span class="year-line"></span>
  </div>

  <!-- Posts Grid - 2 columns -->
  <div class="posts-masonry">
    <div class="month-column">
      <div class="month-header">
        <span class="month-dot"></span>
        <span class="month-name">五月</span>
        <span class="month-count">1篇</span>
      </div>
      <a href="/posts/vue3-composition-api" class="post-card compact">
        <div class="post-date">
          <span class="day">01</span>
          <span class="month">05月</span>
        </div>
        <div class="post-body">
          <h3 class="title">Vue3 组合式API完全指南</h3>
          <div class="meta">
            <span class="category frontend">前端</span>
            <span class="tags">Vue · JavaScript</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
    </div>

    <div class="month-column">
      <div class="month-header">
        <span class="month-dot"></span>
        <span class="month-name">四月</span>
        <span class="month-count">4篇</span>
      </div>
      <a href="/posts/typescript-basics" class="post-card compact">
        <div class="post-date">
          <span class="day">20</span>
          <span class="month">04月</span>
        </div>
        <div class="post-body">
          <h3 class="title">TypeScript 入门指南</h3>
          <div class="meta">
            <span class="category frontend">前端</span>
            <span class="tags">TypeScript</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
      <a href="/posts/nodejs-express-api" class="post-card compact">
        <div class="post-date">
          <span class="day">15</span>
          <span class="month">04月</span>
        </div>
        <div class="post-body">
          <h3 class="title">Node.js + Express 快速构建REST API</h3>
          <div class="meta">
            <span class="category backend">后端</span>
            <span class="tags">Node.js</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
      <a href="/posts/git-commands" class="post-card compact">
        <div class="post-date">
          <span class="day">10</span>
          <span class="month">04月</span>
        </div>
        <div class="post-body">
          <h3 class="title">Git 常用命令速查表</h3>
          <div class="meta">
            <span class="category tool">工具</span>
            <span class="tags">Git</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
      <a href="/posts/css-flexbox" class="post-card compact">
        <div class="post-date">
          <span class="day">05</span>
          <span class="month">04月</span>
        </div>
        <div class="post-body">
          <h3 class="title">CSS Flexbox 布局详解</h3>
          <div class="meta">
            <span class="category frontend">前端</span>
            <span class="tags">CSS</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
    </div>

    <div class="month-column">
      <div class="month-header">
        <span class="month-dot"></span>
        <span class="month-name">三月</span>
        <span class="month-count">2篇</span>
      </div>
      <a href="/posts/docker-basics" class="post-card compact">
        <div class="post-date">
          <span class="day">28</span>
          <span class="month">03月</span>
        </div>
        <div class="post-body">
          <h3 class="title">Docker 入门教程</h3>
          <div class="meta">
            <span class="category devops">DevOps</span>
            <span class="tags">Docker</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
      <a href="/posts/deployment-guide" class="post-card compact">
        <div class="post-date">
          <span class="day">20</span>
          <span class="month">03月</span>
        </div>
        <div class="post-body">
          <h3 class="title">前后端分离项目部署指南</h3>
          <div class="meta">
            <span class="category devops">DevOps</span>
            <span class="tags">DevOps</span>
          </div>
        </div>
        <span class="arrow">→</span>
      </a>
    </div>
  </div>
</div>

</div>

<style scoped>
.archive-page {
  max-width: 1300px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
}

/* Page Header */
.page-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.header-decoration {
  width: 72px;
  height: 72px;
  margin: 0 auto 1.25rem;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(198, 107, 61, 0.25);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.header-icon { font-size: 2rem; }

.header-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.header-subtitle {
  font-size: 1rem;
  color: var(--vp-c-text-3);
}

/* Stats Bar - Horizontal */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  padding: 1.25rem 2rem;
  margin-bottom: 2.5rem;
  border: 1px solid var(--vp-c-border);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.stat-icon { font-size: 1.25rem; }

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  font-family: Georgia, serif;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--vp-c-border);
}

/* Year Section */
.year-section {
  background: var(--vp-c-bg-soft);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid var(--vp-c-border);
}

.year-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.year-badge {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  font-family: Georgia, serif;
  background: var(--vp-c-bg);
  padding: 0.5rem 1.25rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-border);
}

.year-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, var(--vp-c-brand-1), transparent);
  border-radius: 1px;
}

/* Posts Masonry - 3 Column Grid */
.posts-masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.month-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.month-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.month-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
}

.month-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.month-count {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-mute);
  padding: 0.2em 0.6em;
  border-radius: 10px;
  margin-left: auto;
}

/* Compact Post Card */
.post-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: var(--vp-c-bg);
  border-radius: 12px;
  border: 1px solid var(--vp-c-border);
  text-decoration: none;
  transition: all 0.25s ease;
  position: relative;
}

.post-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(198, 107, 61, 0.1);
}

.post-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--vp-c-brand-1);
  border-radius: 3px 0 0 3px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.post-card:hover::before {
  opacity: 1;
}

.post-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  border-radius: 10px;
  color: #fff;
  flex-shrink: 0;
}

.post-date .day {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.1;
}

.post-date .month {
  font-size: 0.6rem;
  opacity: 0.9;
}

.post-body {
  flex: 1;
  min-width: 0;
}

.post-body .title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.post-card:hover .title {
  color: var(--vp-c-brand-1);
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category {
  font-size: 0.7rem;
  padding: 0.15em 0.5em;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
}

.category.frontend { background: #C66B3D; }
.category.backend { background: #606C38; }
.category.tool { background: #8B8279; }
.category.devops { background: #B08B6E; }

.tags {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.arrow {
  font-size: 1rem;
  color: var(--vp-c-text-3);
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.post-card:hover .arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--vp-c-brand-1);
}

/* Responsive */
@media (max-width: 1024px) {
  .posts-masonry {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .archive-page {
    padding: 2rem 1rem;
  }

  .stats-bar {
    gap: 1rem;
    padding: 1rem 1.25rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .posts-masonry {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .month-column {
    gap: 0.5rem;
  }

  .post-card {
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .year-section {
    padding: 1.5rem;
  }
}

@media (max-width: 480px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .stat-divider {
    display: none;
  }
}
</style>
