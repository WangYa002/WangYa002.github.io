<template>
  <div class="busuanzi-wrapper">
    <span id="busuanzi_container_page_pv" v-if="showPV">
      <span class="busuanzi-value" id="busuanzi_value_page_pv">0</span> 次阅读
    </span>
    <span class="separator" v-if="showPV && showUV">|</span>
    <span id="busuanzi_container_site_uv" v-if="showUV">
      <span class="busuanzi-value" id="busuanzi_value_site_uv">0</span> 位访客
    </span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineProps({
  showPV: {
    type: Boolean,
    default: true
  },
  showUV: {
    type: Boolean,
    default: false
  }
})

const pageViews = ref(0)

onMounted(() => {
  if (document.getElementById('busuanzi_script')) return

  const script = document.createElement('script')
  script.id = 'busuanzi_script'
  script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
  script.async = true
  document.body.appendChild(script)
})
</script>

<style scoped>
.busuanzi-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.busuanzi-value {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.separator {
  color: var(--vp-c-divider);
}
</style>