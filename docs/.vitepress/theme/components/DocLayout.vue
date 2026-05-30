<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <Logo class="nav-logo" />
    </template>
    <template #doc-footer-before>
      <Busuanzi class="page-views" />
      <GiscusComment />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
import GiscusComment from './GiscusComment.vue'
import Busuanzi from './Busuanzi.vue'
import Logo from './Logo.vue'
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
</style>