<template>
  <div class="tags-page">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-decoration">
        <span class="header-icon">🏷️</span>
      </div>
      <h1 class="header-title">标签云</h1>
      <p class="header-subtitle">点击标签查看该分类下的所有文章</p>
    </div>

    <!-- 概览条：分类维度 -->
    <div class="overview-strip">
      <div class="overview-item" v-for="c in categories" :key="c.name">
        <span class="overview-icon">{{ c.icon }}</span>
        <div class="overview-data">
          <span class="overview-num">{{ c.count }}</span>
          <span class="overview-lbl">{{ c.name }}</span>
        </div>
      </div>
    </div>

    <!-- 全部标签网格 -->
    <div class="tag-grid-wrapper">
      <div class="section-label">
        <span class="label-icon">📋</span>
        <span class="label-text">全部标签</span>
        <span class="label-count">{{ tags.length }} 个标签</span>
      </div>
      <div class="tag-grid">
        <a
          v-for="t in tags"
          :key="t.slug"
          :href="`/tags/${t.slug}/`"
          class="tag-pill"
          :class="`tag-${t.slug}`"
        >
          <span class="pill-icon">{{ t.icon }}</span>
          <span class="pill-name">{{ t.name }}</span>
          <span class="pill-count">{{ t.count }} 篇</span>
        </a>
      </div>
    </div>

    <!-- 分类文章区块 -->
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

const { posts, categories, tags } = data

const categoryBlocks = categories.map(cat => ({
  name: cat.name,
  icon: cat.icon,
  posts: posts.filter(p => p.category === cat.name),
}))
</script>
