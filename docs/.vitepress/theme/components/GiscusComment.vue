<template>
  <div class="giscus-wrapper">
    <div ref="giscusHost" class="giscus"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const giscusHost = ref(null)

function loadGiscus() {
  const theme = document.documentElement.classList.contains('dark') ? 'dark_dimmed' : 'light'

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'your-github/your-repo')
  script.setAttribute('data-repo-id', 'your-repo-id')
  script.setAttribute('data-category', 'General')
  script.setAttribute('data-category-id', 'DIC_kwDOA....')
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', theme)
  script.setAttribute('data-lang', 'zh-CN')
  script.setAttribute('data-loading', 'lazy')
  script.crossOrigin = 'anonymous'
  script.async = true

  giscusHost.value.appendChild(script)
}

onMounted(() => {
  loadGiscus()
})
</script>

<style scoped>
.giscus-wrapper {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}

.giscus {
  width: 100%;
}
</style>