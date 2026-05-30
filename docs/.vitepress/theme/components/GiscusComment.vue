<template>
  <div class="giscus-wrapper">
    <div ref="giscusHost" class="giscus"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const giscusHost = ref(null)
const isLoaded = ref(false)

/*
  ================================================
  Giscus 评论配置说明
  ================================================

  要启用 Giscus 评论功能，你需要：

  1. 访问 https://giscus.app/zh-CN 获取你的配置
  2. 在下方替换以下占位符：
     - your-github: 你的 GitHub 用户名
     - your-repo: 你的 GitHub 仓库名
     - your-repo-id: 仓库 ID（从 giscus.app 获取）
     - your-category-id: 讨论分类 ID（从 giscus.app 获取）

  3. 配置示例：
     data-repo="your-github/your-repo"
     data-repo-id="R_xxxxxxxxxxxxxx"
     data-category="General"
     data-category-id="DIC_xxxxxxxxxxxxxx"

  ================================================
*/

const giscusConfig = {
  repo: 'your-github/your-repo',           // 替换为你的仓库
  repoId: 'your-repo-id',                   // 替换为你的仓库 ID
  category: 'General',                       // 讨论分类
  categoryId: 'your-category-id',           // 替换为你的分类 ID
  mapping: 'pathname',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'bottom',
  lang: 'zh-CN',
  loading: 'lazy'
}

function loadGiscus() {
  if (!giscusHost.value) return

  // 检查是否已配置（替换了占位符）
  const isConfigured = !giscusConfig.repo.includes('your-github') &&
                       !giscusConfig.repoId.includes('your-repo-id')

  if (!isConfigured) {
    console.log('Giscus 评论功能未配置。请访问 https://giscus.app 获取配置信息。')
    return
  }

  const theme = document.documentElement.classList.contains('dark') ? 'dark_dimmed' : 'light'

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', giscusConfig.repo)
  script.setAttribute('data-repo-id', giscusConfig.repoId)
  script.setAttribute('data-category', giscusConfig.category)
  script.setAttribute('data-category-id', giscusConfig.categoryId)
  script.setAttribute('data-mapping', giscusConfig.mapping)
  script.setAttribute('data-strict', giscusConfig.strict)
  script.setAttribute('data-reactions-enabled', giscusConfig.reactionsEnabled)
  script.setAttribute('data-emit-metadata', giscusConfig.emitMetadata)
  script.setAttribute('data-input-position', giscusConfig.inputPosition)
  script.setAttribute('data-theme', theme)
  script.setAttribute('data-lang', giscusConfig.lang)
  script.setAttribute('data-loading', giscusConfig.loading)
  script.crossOrigin = 'anonymous'
  script.async = true

  giscusHost.value.appendChild(script)
  isLoaded.value = true
}

onMounted(() => {
  loadGiscus()
})

// 监听主题切换
watch(() => document.documentElement.classList.contains('dark'), (isDark) => {
  if (!isLoaded.value) return

  const iframe = document.querySelector('iframe.giscus-frame')
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: isDark ? 'dark_dimmed' : 'light' } } },
      'https://giscus.app'
    )
  }
})
</script>

<style scoped>
.giscus-wrapper {
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

.giscus {
  width: 100%;
}
</style>