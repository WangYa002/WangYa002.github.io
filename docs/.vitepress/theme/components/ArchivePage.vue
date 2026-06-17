<template>
  <div class="archive-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-decoration">
        <span class="header-icon">📚</span>
      </div>
      <h1 class="header-title">文章归档</h1>
      <p class="header-subtitle">按时间线回顾所有文章，记录成长的每一步</p>
    </div>

    <!-- 统计条 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-icon">📝</span>
        <span class="stat-value">{{ stats.posts }}</span>
        <span class="stat-label">篇文章</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-icon">📂</span>
        <span class="stat-value">{{ stats.categories }}</span>
        <span class="stat-label">个分类</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-icon">🏷️</span>
        <span class="stat-value">{{ stats.tags }}</span>
        <span class="stat-label">个标签</span>
      </div>
    </div>

    <!-- 年份时间线 -->
    <div
      v-for="[year, yearPosts] in timeline"
      :key="year"
      class="year-section"
    >
      <div class="year-header">
        <span class="year-badge">{{ year }}</span>
        <span class="year-line"></span>
      </div>

      <div class="posts-masonry">
        <div
          v-for="[month, monthPosts] in yearPosts"
          :key="month"
          class="month-column"
        >
          <div class="month-header">
            <span class="month-dot"></span>
            <span class="month-name">{{ cnMonthName(month) }}</span>
            <span class="month-count">{{ monthPosts.length }}篇</span>
          </div>
          <div
            v-for="post in monthPosts"
            :key="post.slug"
            class="post-card"
          >
            <a :href="post.url">
              <div class="post-date">
                <span class="day">{{ parseDate(post.date).day }}</span>
                <span class="month">{{ parseDate(post.date).monthLabel }}</span>
              </div>
              <div class="post-body">
                <h3 class="title">{{ post.title }}</h3>
                <div class="meta">
                  <span class="category" :class="categoryClass(post.category)">
                    {{ shortCategory(post.category) }}
                  </span>
                  <span class="tags">{{ (post.tags || []).slice(0, 2).join(' · ') }}</span>
                </div>
              </div>
              <span class="arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { data } from '../../posts.data.mjs'

const { posts, stats } = data

// 日期解析：'YYYY-MM-DD' -> { year, month, day, monthLabel }
function parseDate(dateStr) {
  if (!dateStr) return { year: '—', month: '01', day: '—', monthLabel: '' }
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return { year: '—', month: '01', day: '—', monthLabel: '' }
  return { year: m[1], month: m[2], day: m[3], monthLabel: `${m[2]}月` }
}

const CN_MONTH_NAMES = ['', '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月']
function cnMonthName(monthStr) {
  return CN_MONTH_NAMES[parseInt(monthStr, 10)] || monthStr
}

// 把扁平文章列表按 year -> month 二级分组，各自按时间倒序
function buildTimeline(list) {
  const map = new Map()
  list.forEach(p => {
    const { year, month } = parseDate(p.date)
    if (!map.has(year)) map.set(year, new Map())
    const ym = map.get(year)
    if (!ym.has(month)) ym.set(month, [])
    ym.get(month).push(p)
  })
  // 年份倒序、月份倒序
  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, ym]) => [
      year,
      [...ym.entries()].sort((a, b) => Number(b[0]) - Number(a[0])),
    ])
}
const timeline = buildTimeline(posts)

// 归档卡片上的分类色块：复用 custom.css 里 .category.frontend/backend/tool/devops
function categoryClass(cat) {
  if (/前端/.test(cat)) return 'frontend'
  if (/后端/.test(cat)) return 'backend'
  if (/工具|部署|DevOps/i.test(cat)) return 'devops'
  return 'tool'
}
function shortCategory(cat) {
  return (cat || '其他').replace(/开发|与部署/g, '')
}
</script>
