<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <Logo class="nav-logo" />
    </template>
    <template #home-hero-image>
      <span></span>
    </template>
    <template #home-hero-after>
      <Logo class="home-hero-logo" />
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
:deep(.home-hero-logo) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(calc(50% + 220px), -50%);
  width: 160px;
  height: 160px;
  pointer-events: auto;
}
:deep(.VPHero) {
  position: relative;
  overflow: visible;
}
</style>