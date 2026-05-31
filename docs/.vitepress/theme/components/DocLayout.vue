<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <Logo class="nav-logo" />
    </template>
    <template #home-hero-after>
      <div class="custom-hero-wrapper">
        <div class="custom-hero-content">
          <div class="custom-hero-logo-wrapper">
            <Logo class="home-hero-logo" />
          </div>
        </div>
      </div>
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
  width: 240px;
  height: 240px;
  display: block;
  filter: drop-shadow(0 8px 40px rgba(198, 107, 61, 0.3));
  animation: heroLogoFloat 4s ease-in-out infinite;
}

@keyframes heroLogoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

:deep(.VPHero) {
  position: relative;
  overflow: visible;
  min-height: 240px;
}

:deep(.VPHero .container) {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 3rem;
  padding-top: 0.75rem; /* Hero离导航栏近一点 */
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
}

:deep(.VPHero .main) {
  margin-top: 0;
  flex: 1;
  max-width: calc(100% - 280px);
}

.custom-hero-wrapper {
  display: flex;
  align-items: flex-start;
  width: 280px;
  flex-shrink: 0;
  padding-top: 1.5rem; /* Logo离导航栏更远 */
}

.custom-hero-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

:deep(.home-hero-logo) {
  width: 240px;
  height: 240px;
  display: block;
  filter: drop-shadow(0 8px 40px rgba(198, 107, 61, 0.3));
  animation: heroLogoFloat 4s ease-in-out infinite;
}

:deep(.VPHero .image) {
  display: none;
}

:deep(.VPHero .image-container) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

:deep(.VPNavBar) {
  z-index: 100;
  position: relative;
}
</style>