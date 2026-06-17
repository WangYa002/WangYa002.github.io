<template>
  <div class="tag-detail-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-decoration">
        <span class="header-icon">{{ tagMeta.icon }}</span>
      </div>
      <h1 class="header-title">{{ tagMeta.name }}</h1>
      <p class="header-subtitle">{{ tagMeta.name }} 相关的技术文章</p>
    </div>

    <!-- 统计条 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-icon">📄</span>
        <span class="stat-value">{{ filtered.length }}</span>
        <span class="stat-label">篇文章</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-icon">🏷️</span>
        <span class="stat-value">{{ relatedTags.length }}</span>
        <span class="stat-label">个关联标签</span>
      </div>
    </div>

    <a href="/tags/" class="back-link">← 返回标签云</a>

    <!-- 文章列表 -->
    <div class="article-list">
      <a
        v-for="post in filtered"
        :key="post.slug"
        :href="post.url"
        class="article-card"
      >
        <div class="article-date">
          <span class="day">{{ parseDate(post.date).day }}</span>
          <span class="month">{{ parseDate(post.date).monthLabel }}</span>
        </div>
        <div class="article-body">
          <div class="article-title">{{ post.title }}</div>
          <div class="article-desc">{{ post.description }}</div>
        </div>
        <span class="article-arrow">→</span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { data } from '../../posts.data.mjs'

const props = defineProps({
  // tag 中文名，如 '前端'、'Vue'
  tag: { type: String, required: true },
})

const { posts, tags } = data

// 日期解析：'YYYY-MM-DD' -> { day, monthLabel }
function parseDate(dateStr) {
  if (!dateStr) return { day: '—', monthLabel: '' }
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return { day: '—', monthLabel: '' }
  return { day: m[3], monthLabel: `${m[2]}月` }
}

// 当前 tag 的展示元信息（icon/name），从 scan-posts 的 TAG_META 反查
const tagMeta = computed(() => {
  const found = tags.find(t => t.name === props.tag)
  return found || { name: props.tag, icon: '🏷️' }
})

// 按文章 frontmatter 的 tags 数组过滤（语义正确）
const filtered = computed(() =>
  posts.filter(p => Array.isArray(p.tags) && p.tags.includes(props.tag))
)

// 关联标签：本标签下所有文章出现过的其它标签
const relatedTags = computed(() => {
  const set = new Set()
  filtered.value.forEach(p =>
    (p.tags || []).forEach(t => { if (t !== props.tag) set.add(t) })
  )
  return [...set]
})
</script>
