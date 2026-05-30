---
layout: page
title: 文章归档
---

<div class="archive-page">

## 文章统计

<div class="archive-stats">
  <div class="stat-card">
    <span class="stat-number">8</span>
    <span class="stat-text">篇文章</span>
  </div>
  <div class="stat-card">
    <span class="stat-number">3</span>
    <span class="stat-text">个分类</span>
  </div>
  <div class="stat-card">
    <span class="stat-number">9</span>
    <span class="stat-text">个标签</span>
  </div>
</div>

## 时间线

### 2026 年

<div class="timeline-section">
  <div class="timeline-month">
    <h3 class="month-title">五月</h3>
    <div class="timeline-posts">
      <a href="/posts/vue3-composition-api" class="post-item">
        <span class="post-date">05-01</span>
        <span class="post-title">Vue3 组合式API完全指南</span>
        <span class="post-category frontend">前端</span>
      </a>
    </div>
  </div>

  <div class="timeline-month">
    <h3 class="month-title">四月</h3>
    <div class="timeline-posts">
      <a href="/posts/typescript-basics" class="post-item">
        <span class="post-date">04-20</span>
        <span class="post-title">TypeScript 入门指南</span>
        <span class="post-category frontend">前端</span>
      </a>
      <a href="/posts/nodejs-express-api" class="post-item">
        <span class="post-date">04-15</span>
        <span class="post-title">Node.js + Express 快速构建REST API</span>
        <span class="post-category backend">后端</span>
      </a>
      <a href="/posts/git-commands" class="post-item">
        <span class="post-date">04-10</span>
        <span class="post-title">Git 常用命令速查表</span>
        <span class="post-category tool">工具</span>
      </a>
      <a href="/posts/css-flexbox" class="post-item">
        <span class="post-date">04-05</span>
        <span class="post-title">CSS Flexbox 布局详解</span>
        <span class="post-category frontend">前端</span>
      </a>
    </div>
  </div>

  <div class="timeline-month">
    <h3 class="month-title">三月</h3>
    <div class="timeline-posts">
      <a href="/posts/docker-basics" class="post-item">
        <span class="post-date">03-28</span>
        <span class="post-title">Docker 入门教程</span>
        <span class="post-category devops">DevOps</span>
      </a>
      <a href="/posts/deployment-guide" class="post-item">
        <span class="post-date">03-20</span>
        <span class="post-title">前后端分离项目部署指南</span>
        <span class="post-category devops">DevOps</span>
      </a>
    </div>
  </div>
</div>

</div>

<style scoped>
.archive-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 0;
}

.archive-page h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
}

/* 统计卡片 */
.archive-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  margin-bottom: 3rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  line-height: 1;
  font-family: Georgia, serif;
}

.stat-text {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
}

/* 时间线 */
.timeline-section {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.timeline-month {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.month-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--vp-c-brand-1);
  display: inline-block;
}

.timeline-posts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-left: 1rem;
}

.post-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.25s ease;
  border: 1px solid transparent;
}

.post-item:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateX(8px);
  box-shadow: 0 4px 16px rgba(198, 107, 61, 0.1);
}

.post-date {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
  font-family: Georgia, serif;
  min-width: 50px;
}

.post-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.post-item:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-category {
  font-size: 0.75rem;
  padding: 0.25em 0.75em;
  border-radius: 20px;
  color: #fff;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.post-category.frontend {
  background: #C66B3D;
}

.post-category.backend {
  background: #606C38;
}

.post-category.tool {
  background: #8B8279;
}

.post-category.devops {
  background: #B08B6E;
}

/* 响应式 */
@media (max-width: 768px) {
  .archive-stats {
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .stat-number {
    font-size: 2rem;
  }

  .post-item {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 1rem;
  }

  .post-title {
    order: 3;
    width: 100%;
  }

  .post-date {
    order: 1;
  }

  .post-category {
    order: 2;
    margin-left: auto;
  }
}
</style>
