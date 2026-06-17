<template>
  <div class="VPHome">
    <!-- 博客统计：自动计算 -->
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

    <!-- 最新文章：取最近 N 篇 -->
    <div class="recent-posts">
      <div class="section-header">
        <h2 class="section-title">最新文章</h2>
        <div class="section-line"></div>
        <a href="/posts/" class="section-link">查看全部 →</a>
      </div>
      <div class="post-list">
        <a
          v-for="post in recent"
          :key="post.slug"
          :href="post.url"
          class="post-card"
        >
          <div class="post-info">
            <div class="post-title-section">
              <span class="post-title">{{ post.title }}</span>
              <div class="post-meta">
                <span class="post-date"> {{ post.date }}</span>
                <span
                  class="post-category"
                  :style="{ background: categoryColor(post.category) }"
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
</template>

<script setup>
import { data } from '../../posts.data.mjs'

const props = defineProps({
  limit: { type: Number, default: 5 },
})

const { posts, stats } = data

// 最新 N 篇（posts 已按 date 倒序）
const recent = posts.slice(0, props.limit)

// 分类配色：与原 index.md 的 getCategoryColor 保持一致
const CATEGORY_COLORS = {
  '前端开发': '#C66B3D',
  '后端开发': '#606C38',
  '工具与部署': '#8B8279',
  'DevOps': '#B08B6E',
  '八股文': '#B08B6E',
  '算法': '#606C38',
  '项目经历': '#C66B3D',
  'GOlang&C++': '#606C38',
  '其他': '#8B8279',
}
function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#C66B3D'
}
</script>
