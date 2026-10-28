<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <Logo class="nav-logo" />
    </template>
    <template #doc-footer-before>
      <Busuanzi class="page-views" />
    </template>
    <template #layout-top>
      <IntroAnimation />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Busuanzi from './Busuanzi.vue'
import Logo from './Logo.vue'
import IntroAnimation from './IntroAnimation.vue'
import { getChinaTimeTheme } from '../chinaTimeTheme.mjs'

const route = useRoute()
const { isDark } = useData()
let lastScheduledTheme
let themeCheckInterval

function updateBrowserThemeColor() {
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', isDark.value ? '#0B1824' : '#F3F8FA'
  )
}

function syncThemeAtBoundary() {
  const scheduledTheme = getChinaTimeTheme()
  if (scheduledTheme !== lastScheduledTheme) {
    lastScheduledTheme = scheduledTheme
    isDark.value = scheduledTheme === 'dark'
  }
}

function collapseActiveSidebarGroup() {
  // VitePress automatically opens the group containing the current article.
  nextTick(() => {
    requestAnimationFrame(() => {
      document
        .querySelectorAll('.VPSidebarItem.level-0.has-active:not(.collapsed) > .item')
        .forEach(item => item.click())
    })
  })
}

onMounted(() => {
  collapseActiveSidebarGroup()
  lastScheduledTheme = getChinaTimeTheme()
  isDark.value = lastScheduledTheme === 'dark'
  updateBrowserThemeColor()
  themeCheckInterval = window.setInterval(syncThemeAtBoundary, 30_000)
  document.addEventListener('visibilitychange', syncThemeAtBoundary)
})
onUnmounted(() => {
  window.clearInterval(themeCheckInterval)
  document.removeEventListener('visibilitychange', syncThemeAtBoundary)
})
watch(() => route.path, collapseActiveSidebarGroup)
watch(isDark, updateBrowserThemeColor)
</script>

<style scoped>
.page-views {
  margin-bottom: 1rem;
}

:deep(.nav-logo) {
  width: 40px;
  height: 40px;
  margin-right: 8px;
  cursor: pointer;
}

:deep(.VPHero .main) {
  text-align: center;
  margin-inline: auto;
}

:deep(.VPHero .actions) {
  justify-content: center;
}

:deep(.VPNavBar) {
  z-index: 100;
  position: relative;
}

@media (max-width: 768px) {
  :deep(.VPHero .container) {
    padding-top: 0.75rem;
  }
}
</style>
