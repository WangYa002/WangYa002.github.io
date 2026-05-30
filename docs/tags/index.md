---
layout: page
title: 标签云
---

<div class="tags-page">

## 标签概览

<div class="tags-overview">
  <div class="overview-card">
    <span class="overview-number">4</span>
    <span class="overview-text">前端标签</span>
  </div>
  <div class="overview-card">
    <span class="overview-number">2</span>
    <span class="overview-text">后端标签</span>
  </div>
  <div class="overview-card">
    <span class="overview-number">3</span>
    <span class="overview-text">工具与运维</span>
  </div>
</div>

## 技术标签

<div class="tag-section">
  <h3 class="section-title">
    <span class="section-icon">🚀</span>
    前端
  </h3>
  <div class="tag-grid">
    <a href="/tags/frontend/" class="tag-card">
      <span class="tag-name">前端</span>
      <span class="tag-desc">所有前端文章</span>
      <span class="tag-count">4 篇</span>
    </a>
    <a href="/tags/vue/" class="tag-card">
      <span class="tag-name">Vue</span>
      <span class="tag-desc">Vue 相关</span>
      <span class="tag-count">1 篇</span>
    </a>
    <a href="/tags/typescript/" class="tag-card">
      <span class="tag-name">TypeScript</span>
      <span class="tag-desc">TypeScript 相关</span>
      <span class="tag-count">1 篇</span>
    </a>
    <a href="/tags/css/" class="tag-card">
      <span class="tag-name">CSS</span>
      <span class="tag-desc">CSS 相关</span>
      <span class="tag-count">1 篇</span>
    </a>
  </div>
</div>

<div class="tag-section">
  <h3 class="section-title">
    <span class="section-icon">⚙️</span>
    后端
  </h3>
  <div class="tag-grid">
    <a href="/tags/backend/" class="tag-card">
      <span class="tag-name">后端</span>
      <span class="tag-desc">所有后端文章</span>
      <span class="tag-count">2 篇</span>
    </a>
    <a href="/tags/nodejs/" class="tag-card">
      <span class="tag-name">Node.js</span>
      <span class="tag-desc">Node.js 相关</span>
      <span class="tag-count">1 篇</span>
    </a>
  </div>
</div>

<div class="tag-section">
  <h3 class="section-title">
    <span class="section-icon">🛠️</span>
    工具与运维
  </h3>
  <div class="tag-grid">
    <a href="/tags/git/" class="tag-card">
      <span class="tag-name">Git</span>
      <span class="tag-desc">Git 版本控制</span>
      <span class="tag-count">1 篇</span>
    </a>
    <a href="/tags/docker/" class="tag-card">
      <span class="tag-name">Docker</span>
      <span class="tag-desc">Docker 容器化</span>
      <span class="tag-count">1 篇</span>
    </a>
    <a href="/tags/devops/" class="tag-card">
      <span class="tag-name">DevOps</span>
      <span class="tag-desc">运维相关</span>
      <span class="tag-count">2 篇</span>
    </a>
  </div>
</div>

</div>

<style scoped>
.tags-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 0;
}

.tags-page h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
}

/* 标签概览 */
.tags-overview {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  margin-bottom: 3rem;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.overview-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
  line-height: 1;
  font-family: Georgia, serif;
}

.overview-text {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
}

/* 标签分组 */
.tag-section {
  margin-bottom: 3rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--vp-c-brand-1);
}

.section-icon {
  font-size: 1.5rem;
}

/* 标签网格 */
.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.tag-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.25s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.tag-card::before {
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

.tag-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 24px rgba(198, 107, 61, 0.15);
}

.tag-card:hover::before {
  transform: scaleX(1);
}

.tag-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  transition: color 0.2s ease;
}

.tag-card:hover .tag-name {
  color: var(--vp-c-brand-1);
}

.tag-desc {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
  flex: 1;
}

.tag-count {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  font-weight: 600;
  background: var(--vp-c-bg-mute);
  padding: 0.25em 0.75em;
  border-radius: 20px;
  align-self: flex-start;
}

/* 响应式 */
@media (max-width: 768px) {
  .tags-overview {
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .overview-number {
    font-size: 2rem;
  }

  .tag-grid {
    grid-template-columns: 1fr;
  }

  .tag-card {
    padding: 1.25rem;
  }

  .section-title {
    font-size: 1.1rem;
  }
}
</style>
