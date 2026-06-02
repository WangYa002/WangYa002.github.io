<template>
  <div class="intro-wrapper" v-show="visible">
    <!-- Canvas for particle scatter -->
    <canvas ref="canvasRef" class="scatter-canvas" v-show="scattering"></canvas>

    <!-- Solid dark overlay -->
    <div class="intro-overlay" v-show="!scattering"></div>

    <!-- Center content -->
    <div class="intro-center" :class="{ 'center-exit': exiting }">
      <div class="spotlight"></div>

      <!-- Logo -->
      <div class="intro-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
          <defs>
            <radialGradient id="cbg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stop-color="#F5EDE3"/>
              <stop offset="70%" stop-color="#E8DCC7"/>
              <stop offset="100%" stop-color="#D4B895"/>
            </radialGradient>
            <linearGradient id="cletter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#C66B3D"/>
              <stop offset="50%" stop-color="#8B5E3C"/>
              <stop offset="100%" stop-color="#606C38"/>
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#cbg)"/>
          <circle cx="100" cy="100" r="88" fill="none" stroke="#C66B3D" stroke-width="0.5" stroke-dasharray="8 4" opacity="0.4"/>
          <circle cx="100" cy="100" r="78" fill="none" stroke="#606C38" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.35"/>
          <path d="M60 95 L75 140 L90 105 L100 140 L110 105 L125 140 L140 95"
                fill="none" stroke="url(#cletter)" stroke-width="8"
                stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="30" cy="30" r="5" fill="#C66B3D" opacity="0.5"/>
          <circle cx="170" cy="30" r="4" fill="#606C38" opacity="0.4"/>
          <circle cx="30" cy="170" r="4" fill="#606C38" opacity="0.4"/>
          <circle cx="170" cy="170" r="5" fill="#C66B3D" opacity="0.5"/>
        </svg>
      </div>

      <!-- Title -->
      <h1 class="intro-title">
        <span class="title-char c1">汪</span>
        <span class="title-char c2">洋</span>
        <span class="title-char c3">恣</span>
        <span class="title-char c4">意</span>
      </h1>

      <p class="intro-sub">信一的技术博客</p>
      <div class="divider-line"></div>

      <button class="enter-btn" @click="handleEnter">
        <span class="btn-text">WELCOME</span>
        <span class="btn-icon">⟩</span>
        <span class="btn-glow"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue'

const visible = ref(false)
const exiting = ref(false)
const scattering = ref(false)
const canvasRef = ref(null)
let animId = null

if (typeof window !== 'undefined' && !sessionStorage.getItem('intro_shown')) {
  visible.value = true
}

function handleEnter() {
  exiting.value = true
  sessionStorage.setItem('intro_shown', '1')
  setTimeout(startScatter, 600)
}

function startScatter() {
  const cvs = canvasRef.value
  if (!cvs) { visible.value = false; return }

  const dpr = window.devicePixelRatio || 1
  const w = window.innerWidth
  const h = window.innerHeight
  cvs.width = w * dpr
  cvs.height = h * dpr
  cvs.style.width = w + 'px'
  cvs.style.height = h + 'px'
  const ctx = cvs.getContext('2d')
  ctx.scale(dpr, dpr)

  scattering.value = true

  const TILE = 26
  const cols = Math.ceil(w / TILE)
  const rows = Math.ceil(h / TILE)
  const cx = w / 2
  const cy = h / 2
  const maxDist = Math.sqrt(cx * cx + cy * cy)

  const tiles = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * TILE
      const y = r * TILE
      const px = x + TILE / 2
      const py = y + TILE / 2
      const dx = px - cx
      const dy = py - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      const norm = dist / maxDist

      const rv = 31 + Math.floor(Math.random() * 14)
      const gv = 28 + Math.floor(Math.random() * 14)
      const bv = 24 + Math.floor(Math.random() * 10)

      // ~5% of tiles get brand-color tint
      const isAccent = Math.random() < 0.05
      const color = isAccent
        ? `rgb(${56 + Math.floor(Math.random() * 10)},${40 + Math.floor(Math.random() * 8)},${30 + Math.floor(Math.random() * 6)})`
        : `rgb(${rv},${gv},${bv})`

      tiles.push({
        x, y, size: TILE,
        vx: Math.cos(angle + (Math.random() - 0.5) * 0.5) * (200 + Math.random() * 280),
        vy: Math.sin(angle + (Math.random() - 0.5) * 0.5) * (200 + Math.random() * 280) - 80,
        rotSpeed: (Math.random() - 0.5) * 8,
        delay: norm * 0.4 + Math.random() * 0.12,
        color,
        grav: 140 + Math.random() * 100,
        isAccent
      })
    }
  }

  // Bright spark particles
  const sparks = []
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 250 + Math.random() * 450
    sparks.push({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 80,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      size: 1.5 + Math.random() * 2.5,
      delay: 0.06 + Math.random() * 0.22,
      color: Math.random() > 0.4 ? '#C66B3D' : '#D4B895',
      grav: 80 + Math.random() * 60
    })
  }

  let startTime = null

  function animate(ts) {
    if (!startTime) startTime = ts
    const t = (ts - startTime) / 1000

    ctx.clearRect(0, 0, w, h)
    let anyVisible = false

    // Tiles
    for (const p of tiles) {
      if (t < p.delay) {
        ctx.globalAlpha = 0.95
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
        anyVisible = true
        continue
      }
      const pt = t - p.delay
      const px = p.x + p.vx * pt
      const py = p.y + p.vy * pt + 0.5 * p.grav * pt * pt
      const rot = p.rotSpeed * pt
      const opacity = Math.max(0, 1 - pt * 1.4)

      if (opacity > 0.01) {
        anyVisible = true
        ctx.save()
        ctx.translate(px + p.size / 2, py + p.size / 2)
        ctx.rotate(rot)
        ctx.globalAlpha = opacity
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        if (p.isAccent) {
          ctx.fillStyle = 'rgba(198,107,61,0.15)'
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        }
        ctx.restore()
      }
    }

    // Sparks
    for (const s of sparks) {
      if (t < s.delay) continue
      const st = t - s.delay
      const sx = s.x + s.vx * st
      const sy = s.y + s.vy * st + 0.5 * s.grav * st * st
      const sOpacity = Math.max(0, 0.9 - st * 2.5)

      if (sOpacity > 0.01) {
        ctx.globalAlpha = sOpacity
        ctx.fillStyle = s.color
        ctx.shadowColor = s.color
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // Shockwave ring 1
    if (t < 1.2) {
      const swR = t * 750
      const swO = Math.max(0, 0.4 - t * 0.4)
      ctx.beginPath()
      ctx.arc(cx, cy, swR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(198,107,61,${swO})`
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // Shockwave ring 2 (delayed)
    if (t > 0.15 && t < 1.35) {
      const st2 = t - 0.15
      const swR2 = st2 * 650
      const swO2 = Math.max(0, 0.25 - st2 * 0.22)
      ctx.beginPath()
      ctx.arc(cx, cy, swR2, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(212,184,149,${swO2})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Central flash (brief bright pulse)
    if (t < 0.3) {
      const flashO = Math.max(0, 0.25 - t * 0.9)
      const flashR = t * 400
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR)
      grad.addColorStop(0, `rgba(212,184,149,${flashO})`)
      grad.addColorStop(1, 'rgba(212,184,149,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }

    ctx.globalAlpha = 1

    if (anyVisible && t < 3) {
      animId = requestAnimationFrame(animate)
    } else {
      visible.value = false
    }
  }

  animId = requestAnimationFrame(animate)
}

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
})
</script>

<style scoped>
.intro-wrapper {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* Overlay background */
.intro-overlay {
  position: absolute;
  inset: 0;
  background: #1F1C18;
}

/* Canvas */
.scatter-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* Center content */
.intro-center {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.5rem 1.5rem;
  overflow: visible;
  transition: opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease;
}
.intro-center.center-exit {
  opacity: 0;
  transform: scale(0.9);
  filter: blur(8px);
  pointer-events: none;
}

/* Spotlight */
.spotlight {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198,107,61,0.1) 0%, rgba(198,107,61,0.03) 40%, transparent 65%);
  pointer-events: none;
  animation: spotPulse 3s ease-in-out infinite;
}
@keyframes spotPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.6; }
}

/* Logo */
.intro-logo {
  width: 110px;
  height: 110px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 40px rgba(198,107,61,0.4));
  animation: logoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both,
             logoFloat 4s ease-in-out 1s infinite;
}
.intro-logo svg { width: 100%; height: 100%; }

@keyframes logoIn {
  from { opacity: 0; transform: scale(0.4); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* Title */
.intro-title {
  display: flex;
  gap: 0.1em;
  margin: 0;
  line-height: 1.4;
}
.title-char {
  display: inline-block;
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #C66B3D, #D4B895 50%, #606C38);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: charIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
}
.c1 { animation-delay: 0.5s; }
.c2 { animation-delay: 0.75s; }
.c3 { animation-delay: 1.0s; }
.c4 { animation-delay: 1.25s; }

@keyframes charIn {
  0%   { opacity: 0; transform: translateY(30px) scale(0.3); filter: blur(6px); }
  50%  { opacity: 1; filter: blur(0); }
  75%  { transform: translateY(-4px) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

/* Subtitle */
.intro-sub {
  font-size: 0.95rem;
  color: #8B8279;
  letter-spacing: 0.5em;
  margin: 0;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeUp 0.5s ease 1.7s both;
}

/* Divider */
.divider-line {
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(198,107,61,0.5), transparent);
  animation: lineGrow 0.6s ease 2s both;
}

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lineGrow {
  to { width: 100px; }
}

/* Button */
.enter-btn {
  position: relative;
  margin-top: 0.3rem;
  padding: 0.9rem 2.8rem;
  background: transparent;
  border: 2px solid rgba(198,107,61,0.4);
  border-radius: 50px;
  color: #D4B895;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.35em;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeUp 0.6s cubic-bezier(0.34,1.56,0.64,1) 2.3s both;
  transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}
.enter-btn:hover {
  border-color: #C66B3D;
  color: #fff;
  background: linear-gradient(135deg, rgba(198,107,61,0.2), rgba(96,108,56,0.15));
  box-shadow: 0 10px 40px rgba(198,107,61,0.35);
}
.enter-btn:active { transform: scale(0.96); }

.btn-text { position: relative; z-index: 1; }
.btn-icon { position: relative; z-index: 1; font-size: 1.4rem; font-weight: 300; transition: transform 0.3s ease; }
.enter-btn:hover .btn-icon { transform: translateX(6px); }

.btn-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(198,107,61,0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}
.enter-btn:hover .btn-glow { transform: translateX(100%); }

/* Responsive */
@media (max-width: 768px) {
  .intro-logo { width: 90px; height: 90px; }
  .title-char { font-size: 2.4rem; }
  .intro-sub { font-size: 0.85rem; }
  .enter-btn { padding: 0.8rem 2.2rem; font-size: 1rem; }
  .spotlight { width: 350px; height: 350px; }
  .intro-center { gap: 0.5rem; padding: 1rem; }
}
@media (max-width: 480px) {
  .intro-logo { width: 76px; height: 76px; }
  .title-char { font-size: 2rem; }
  .intro-sub { font-size: 0.75rem; letter-spacing: 0.3em; }
  .enter-btn { padding: 0.7rem 1.8rem; font-size: 0.9rem; letter-spacing: 0.2em; }
  .spotlight { width: 280px; height: 280px; }
  .intro-center { gap: 0.4rem; padding: 0.75rem; }
}
</style>
