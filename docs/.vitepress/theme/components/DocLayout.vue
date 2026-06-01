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
    </template>
  </DefaultTheme.Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
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
  width: 600px;
  height: 600px;
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
  justify-content: center;
  gap: 3rem;
  padding-top: 3rem;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
}

:deep(.VPHero .main) {
  margin-top: 0;
  flex: 1;
  min-width: 0;
  text-align: center;
}

/* Logo 容器 - 右上角定位 */
.custom-hero-wrapper {
  flex-shrink: 0;
  position: absolute;
  top: 1%;
  right: -1%;
  transform: translate(0, 0);
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
    width: 500px;
    height: 500px;
  }
  
  .custom-hero-wrapper {
    width: 100%;
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
    margin-left: 0;
  }
  
  :deep(.home-hero-logo) {
    width: 400px;
    height: 400px;
  }
  
  :deep(.VPHero .actions) {
    justify-content: center;
  }
}

/* 小屏移动端 (< 480px) */
@media (max-width: 480px) {
  :deep(.home-hero-logo) {
    width: 280px;
    height: 280px;
  }
  
  .custom-hero-wrapper {
    margin-top: 1rem;
  }
  
  :deep(.VPHero .container) {
    padding-top: 0.75rem;
  }
}
</style>