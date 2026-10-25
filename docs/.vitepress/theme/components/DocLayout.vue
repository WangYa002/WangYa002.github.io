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
import { nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Busuanzi from './Busuanzi.vue'
import Logo from './Logo.vue'
import IntroAnimation from './IntroAnimation.vue'

const route = useRoute()

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

onMounted(collapseActiveSidebarGroup)
watch(() => route.path, collapseActiveSidebarGroup)
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
