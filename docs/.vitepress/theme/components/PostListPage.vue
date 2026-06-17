<template>
  <div class="posts-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-decoration">
        <span class="header-icon">📝</span>
      </div>
      <h1 class="header-title">文章列表</h1>
      <p class="header-subtitle">涵盖前端、后端、八股文、算法、项目经历、GOlang&C++等技术领域</p>
    </div>

    <!-- 统计条：自动计算 -->
    <div class="stats-bar">
      <div class="stat-item" v-for="s in statItems" :key="s.label">
        <span class="stat-icon">{{ s.icon }}</span>
        <span class="stat-value">{{ s.value }}</span>
        <span class="stat-label">{{ s.label }}</span>
        <div class="stat-divider"></div>
      </div>
    </div>

    <!-- 分类区块：按 CATEGORY_ORDER 自动分组 -->
    <div class="category-sections">
      <div class="category-block" v-for="cat in categoryBlocks" :key="cat.name">
        <div class="category-header">
          <span class="cat-icon">{{ cat.icon }}</span>
          <h2 class="cat-title">{{ cat.name }}</h2>
          <div class="cat-line"></div>
        </div>
        <div class="cat-posts">
          <a
            v-for="post in cat.posts"
            :key="post.slug"
            :href="post.url"
            class="post-row"
          >
            <span class="post-icon">{{ cat.icon }}</span>
            <span class="post-name">{{ post.title }}</span>
            <span class="post-date">{{ post.date }}</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { data } from '../../posts.data.mjs'

const { posts, categories } = data

// 顶部统计：总数 + 各主要分类数
const statItems = [
  { icon: '📄', value: posts.length, label: '篇文章' },
  ...categories.slice(0, 5).map(c => ({
    icon: c.icon,
    value: c.count,
    label: `${c.name.replace(/开发|与部署/g, '')}文章`,
  })),
]

// 按分类分组，复用 CATEGORY_ORDER 排序
const categoryBlocks = categories.map(cat => ({
  name: cat.name,
  icon: cat.icon,
  posts: posts.filter(p => p.category === cat.name),
}))
</script>
