<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <Logo class="nav-logo" />
    </template>
    <template #home-hero-after>
      <div class="custom-hero-wrapper">
        <Logo class="home-hero-logo" />
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
  width: 280px;
  height: 280px;
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
}

:deep(.VPHero .container) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding-top: 0.5rem;
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
}

:deep(.VPHero .main) {
  margin-top: 0;
  flex: 1;
  min-width: 0;
}

/* Logo 容器 - 使用 Flexbox 布局 */
.custom-hero-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 300px;
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

/* 平板端适配 (768px - 1024px) */
@media (max-width: 1024px) {
  :deep(.VPHero .container) {
    gap: 1.5rem;
  }
  
  :deep(.home-hero-logo) {
    width: 240px;
    height: 240px;
  }
  
  .custom-hero-wrapper {
    width: 260px;
  }
}

/* 移动端适配 (< 768px) */
@media (max-width: 768px) {
  :deep(.VPHero .container) {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
    padding-top: 1rem;
  }
  
  :deep(.VPHero .main) {
    order: 1;
    max-width: 100%;
  }
  
  .custom-hero-wrapper {
    order: 2;
    width: 100%;
    margin-top: 1.5rem;
  }
  
  :deep(.home-hero-logo) {
    width: 200px;
    height: 200px;
  }
  
  :deep(.VPHero .actions) {
    justify-content: center;
  }
}

/* 小屏移动端 (< 480px) */
@media (max-width: 480px) {
  :deep(.home-hero-logo) {
    width: 160px;
    height: 160px;
  }
  
  .custom-hero-wrapper {
    margin-top: 1rem;
  }
  
  :deep(.VPHero .container) {
    padding-top: 0.75rem;
  }
}
</style>