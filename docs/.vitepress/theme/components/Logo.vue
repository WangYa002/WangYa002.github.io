<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" :class="$style.logo" @click="handleClick">
    <defs>
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#F5EDE3"/>
        <stop offset="70%" stop-color="#E8DCC7"/>
        <stop offset="100%" stop-color="#D4B895"/>
      </radialGradient>

      <linearGradient id="letterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C66B3D"/>
        <stop offset="50%" stop-color="#8B5E3C"/>
        <stop offset="100%" stop-color="#606C38"/>
      </linearGradient>

      <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#2D2A26" flood-opacity="0.12"/>
      </filter>
    </defs>

    <!-- 涟漪效果层 -->
    <circle :class="[$style.ripple, rippleActive && $style.rippleActive]" cx="100" cy="100" r="90" fill="none" stroke="#C66B3D" stroke-width="2" :style="{ '--delay': '0s' }"/>
    <circle :class="[$style.ripple, rippleActive && $style.rippleActive]" cx="100" cy="100" r="90" fill="none" stroke="#606C38" stroke-width="1.5" :style="{ '--delay': '0.15s' }"/>

    <!-- 背景 -->
    <circle :class="$style.bg" cx="100" cy="100" r="90" fill="url(#bgGrad)"/>

    <!-- 装饰环 -->
    <circle :class="[$style.ring, $style.ringOuter]" cx="100" cy="100" r="88" fill="none" stroke="#C66B3D" stroke-width="0.5" stroke-dasharray="8 4" opacity="0.4"/>
    <circle :class="[$style.ring, $style.ringInner]" cx="100" cy="100" r="78" fill="none" stroke="#606C38" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.35"/>
    <circle :class="$style.innerCircle" cx="100" cy="100" r="68" fill="none" stroke="#B08B6E" stroke-width="0.5" opacity="0.3"/>

    <!-- 字母 W -->
    <g :class="[$style.letter, bounceActive && $style.bounceActive]" filter="url(#innerShadow)">
      <path d="M60 95 L75 140 L90 105 L100 140 L110 105 L125 140 L140 95"
            fill="none"
            stroke="url(#letterGrad)"
            stroke-width="8"
            stroke-linecap="round"
            stroke-linejoin="round"/>
    </g>

    <!-- 底部装饰线 -->
    <line :class="$style.innerCircle" x1="65" y1="150" x2="135" y2="150" stroke="#606C38" stroke-width="2" stroke-linecap="round" opacity="0.5"/>

    <!-- 装饰点 -->
    <circle :class="[$style.dot, $style.dot1]" cx="30" cy="30" r="5" fill="#C66B3D" opacity="0.5"/>
    <circle :class="[$style.dot, $style.dot2]" cx="170" cy="30" r="4" fill="#606C38" opacity="0.4"/>
    <circle :class="[$style.dot, $style.dot3]" cx="30" cy="170" r="4" fill="#606C38" opacity="0.4"/>
    <circle :class="[$style.dot, $style.dot4]" cx="170" cy="170" r="5" fill="#C66B3D" opacity="0.5"/>
  </svg>
</template>

<script setup>
import { ref } from 'vue'

const bounceActive = ref(false)
const rippleActive = ref(false)

const handleClick = () => {
  // 字母弹跳
  bounceActive.value = false
  setTimeout(() => { bounceActive.value = true }, 10)
  setTimeout(() => { bounceActive.value = false }, 450)

  // 涟漪效果
  rippleActive.value = false
  setTimeout(() => { rippleActive.value = true }, 10)
  setTimeout(() => { rippleActive.value = false }, 800)
}
</script>

<style module>
.logo {
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.bg {
  transition: all 0.4s ease;
}

.logo:hover .bg {
  filter: brightness(1.05);
}

.innerCircle {
  transition: all 0.4s ease;
  transform-origin: center;
}

.logo:hover .innerCircle {
  transform: scale(1.02);
}

.letter {
  transition: all 0.3s ease;
  transform-origin: center;
}

.logo:hover .letter {
  transform: scale(1.05);
  filter: brightness(1.15);
}

.ring {
  transition: all 0.5s ease;
  transform-origin: center;
}

.logo:hover .ring {
  opacity: 0.6;
  transform: scale(1.05) rotate(15deg);
}

.dot {
  transition: all 0.3s ease;
}

.logo:hover .dot {
  transform: scale(1.3);
}

/* 旋转动画 */
.ringOuter {
  animation: ringRotate 20s linear infinite;
  transform-origin: center;
}

.ringInner {
  animation: ringRotateReverse 15s linear infinite;
  transform-origin: center;
}

@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ringRotateReverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

/* 装饰点脉动 */
.dot1 { animation: dotPulse 2s ease-in-out infinite; }
.dot2 { animation: dotPulse 2s ease-in-out infinite 0.5s; }
.dot3 { animation: dotPulse 2s ease-in-out infinite 1s; }
.dot4 { animation: dotPulse 2s ease-in-out infinite 1.5s; }

@keyframes dotPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 点击涟漪 */
.ripple {
  opacity: 0;
  transform: scale(0);
  transform-origin: center;
}

.rippleActive {
  animation: rippleEffect 0.6s ease-out forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes rippleEffect {
  0% { transform: scale(0); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}

/* 字母弹跳 */
.bounceActive {
  animation: letterBounce 0.4s ease-out;
}

@keyframes letterBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
</style>