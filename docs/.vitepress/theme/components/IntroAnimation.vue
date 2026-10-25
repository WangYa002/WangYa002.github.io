<template>
  <div
    v-show="visible"
    class="intro-wrapper"
    :class="{ opening }"
    role="dialog"
    aria-modal="true"
    aria-label="进入博客"
  >
    <div class="curtain curtain-left" aria-hidden="true"></div>
    <div class="curtain curtain-right" aria-hidden="true"></div>
    <div class="curtain-seam" aria-hidden="true"></div>

    <div class="intro-center">
      <div class="intro-logo" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
          <defs>
            <radialGradient id="intro-bg" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stop-color="#F3F8FA" />
              <stop offset="75%" stop-color="#DCECF1" />
              <stop offset="100%" stop-color="#9EC8D3" />
            </radialGradient>
            <linearGradient id="intro-letter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#087F98" />
              <stop offset="100%" stop-color="#166995" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="89" fill="url(#intro-bg)" />
          <circle cx="100" cy="100" r="79" fill="none" stroke="#78AEBE" stroke-width="1" opacity="0.6" />
          <path
            d="M60 95 L75 140 L90 105 L100 140 L110 105 L125 140 L140 95"
            fill="none"
            stroke="url(#intro-letter)"
            stroke-width="8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <h1 class="intro-title">汪洋恣意</h1>
      <p class="intro-sub">致力于用 CPP 构建高性能的一切</p>

      <button class="enter-btn" type="button" :disabled="opening" @click="handleEnter">
        进入博客 <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'

const visible = ref(false)
const opening = ref(false)
let closeTimer

if (typeof window !== 'undefined' && !sessionStorage.getItem('intro_shown')) {
  visible.value = true
}

function handleEnter() {
  if (opening.value) return
  sessionStorage.setItem('intro_shown', '1')

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = false
    return
  }

  opening.value = true
  closeTimer = window.setTimeout(() => {
    visible.value = false
  }, 1450)
}

onUnmounted(() => {
  if (closeTimer) window.clearTimeout(closeTimer)
})
</script>

<style scoped>
.intro-wrapper {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
}

.curtain {
  position: absolute;
  top: 0;
  bottom: 0;
  width: calc(50% + 1px);
  transition: transform 1.18s cubic-bezier(0.76, 0, 0.24, 1) 0.12s;
  will-change: transform;
}

.curtain-left {
  left: 0;
  background: linear-gradient(90deg, #081722 0%, #102B3B 22%, #0B2130 48%, #133345 76%, #102C3D 100%);
  box-shadow: inset -22px 0 32px rgba(3, 14, 23, 0.22);
}

.curtain-right {
  right: 0;
  background: linear-gradient(90deg, #102C3D 0%, #133345 24%, #0B2130 52%, #102B3B 78%, #081722 100%);
  box-shadow: inset 22px 0 32px rgba(3, 14, 23, 0.22);
}

.curtain-left::after,
.curtain-right::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, rgba(119, 218, 230, 0.38) 35%, rgba(119, 218, 230, 0.55) 65%, transparent);
}

.curtain-left::after { right: 0; }
.curtain-right::after { left: 0; }

.curtain-seam {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  width: 1px;
  height: min(48vh, 360px);
  transform: translate(-50%, -50%);
  background: linear-gradient(180deg, transparent, #72D3E0 50%, transparent);
  box-shadow: 0 0 18px rgba(114, 211, 224, 0.42);
  opacity: 0.75;
  transition: opacity 0.3s ease;
}

.intro-center {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  padding: 2rem;
  text-align: center;
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.intro-logo {
  width: 104px;
  height: 104px;
  filter: drop-shadow(0 8px 24px rgba(81, 177, 197, 0.2));
}

.intro-logo svg { width: 100%; height: 100%; }

.intro-title {
  margin: 0;
  color: #EAF5F8;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  font-weight: 750;
  letter-spacing: 0.08em;
  line-height: 1.25;
}

.intro-sub {
  margin: 0;
  color: #AFCAD5;
  font-size: clamp(0.88rem, 2vw, 1rem);
  line-height: 1.65;
  letter-spacing: 0.08em;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.5rem;
  padding: 0.82rem 1.5rem;
  border: 1px solid rgba(114, 211, 224, 0.52);
  border-radius: 8px;
  background: rgba(93, 194, 212, 0.07);
  color: #EAF5F8;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.enter-btn:hover,
.enter-btn:focus-visible {
  border-color: #79D8E4;
  background: rgba(93, 194, 212, 0.16);
}

.enter-btn:focus-visible {
  outline: 2px solid #79D8E4;
  outline-offset: 4px;
}

.intro-logo,
.intro-title,
.intro-sub,
.enter-btn {
  animation: intro-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.intro-title { animation-delay: 0.1s; }
.intro-sub { animation-delay: 0.2s; }
.enter-btn { animation-delay: 0.32s; }

@keyframes intro-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.opening .intro-center {
  opacity: 0;
  transform: translateY(-12px);
  pointer-events: none;
}

.opening .curtain-left { transform: translateX(-100%); }
.opening .curtain-right { transform: translateX(100%); }
.opening .curtain-seam { opacity: 0; }

@media (max-width: 480px) {
  .intro-logo { width: 82px; height: 82px; }
  .intro-center { gap: 0.85rem; padding: 1.5rem; }
  .enter-btn { margin-top: 1.15rem; }
}

@media (prefers-reduced-motion: reduce) {
  .curtain,
  .curtain-seam,
  .intro-center,
  .intro-logo,
  .intro-title,
  .intro-sub,
  .enter-btn {
    animation: none;
    transition: none;
  }
}
</style>
