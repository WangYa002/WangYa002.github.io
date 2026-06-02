<template>
  <div class="intro-wrapper" v-show="visible">
    <!-- Canvas for curtain-opening effect -->
    <canvas ref="canvasRef" class="effect-canvas" v-show="animating"></canvas>

    <!-- Solid dark overlay -->
    <div class="intro-overlay" v-show="!animating"></div>

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
import { ref, onUnmounted } from 'vue'

const visible = ref(false)
const exiting = ref(false)
const animating = ref(false)
const canvasRef = ref(null)
let animId = null

if (typeof window !== 'undefined' && !sessionStorage.getItem('intro_shown')) {
  visible.value = true
}

function handleEnter() {
  exiting.value = true
  sessionStorage.setItem('intro_shown', '1')
  setTimeout(startCurtainOpen, 500)
}

function startCurtainOpen() {
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

  animating.value = true
  const cx = w / 2
  const cy = h / 2

  // Particle types
  const WARM_COLORS = ['#C66B3D', '#B08B6E', '#D4B895', '#E8DCC7', '#606C38']

  // Curtain-edge particles: burst from center vertical seam
  const particles = []
  for (let i = 0; i < 350; i++) {
    const angle = (Math.random() - 0.5) * Math.PI * 1.8
    const speed = 180 + Math.random() * 520
    const rnd = Math.random()
    let shape, size, color

    if (rnd < 0.3) {
      // Glowing ember circle
      shape = 'circle'
      size = 2 + Math.random() * 5
      color = WARM_COLORS[Math.floor(Math.random() * 3)]
    } else if (rnd < 0.5) {
      // Diamond sparkle
      shape = 'diamond'
      size = 3 + Math.random() * 5
      color = '#E8DCC7'
    } else if (rnd < 0.7) {
      // Tiny trail dot
      shape = 'dot'
      size = 1 + Math.random() * 2
      color = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)]
    } else {
      // Fragment piece (curtain material breaking)
      shape = 'fragment'
      size = 5 + Math.random() * 12
      const rv = 31 + Math.floor(Math.random() * 18)
      const gv = 28 + Math.floor(Math.random() * 18)
      const bv = 24 + Math.floor(Math.random() * 12)
      color = `rgb(${rv},${gv},${bv})`
    }

    const side = Math.random() > 0.5 ? 1 : -1
    particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed * side * (0.4 + Math.abs(Math.cos(angle))),
      vy: (Math.random() - 0.5) * 300 - 60,
      size,
      shape,
      color,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 8,
      delay: Math.random() * 0.35,
      grav: 40 + Math.random() * 80,
      opacity: 1
    })
  }

  // Bright sparks (fast, small, glowing)
  const sparks = []
  for (let i = 0; i < 80; i++) {
    const angle = (Math.random() - 0.5) * Math.PI
    const speed = 300 + Math.random() * 500
    const side = Math.random() > 0.5 ? 1 : -1
    sparks.push({
      x: cx + (Math.random() - 0.5) * 30,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed * side,
      vy: Math.sin(angle) * speed * 0.3 - 50,
      size: 1 + Math.random() * 2,
      delay: 0.03 + Math.random() * 0.2,
      color: Math.random() > 0.4 ? '#C66B3D' : '#D4B895',
      grav: 30 + Math.random() * 50
    })
  }

  // Light rays
  const rays = []
  for (let i = 0; i < 14; i++) {
    rays.push({
      angle: (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.25,
      width: 0.015 + Math.random() * 0.035,
      length: 0.5 + Math.random() * 0.5,
      delay: 0.08 + Math.random() * 0.15
    })
  }

  // Seam sparkles (vertical line of twinkles)
  const seamSparkles = []
  for (let i = 0; i < 40; i++) {
    seamSparkles.push({
      y: Math.random() * h,
      size: 1.5 + Math.random() * 3,
      delay: Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 80,
      life: 0.4 + Math.random() * 0.4
    })
  }

  // Curtain edge dissolve: small particles emitted from curtain edges as they move
  const edgeParticles = []
  for (let i = 0; i < 60; i++) {
    edgeParticles.push({
      y: Math.random() * h,
      size: 2 + Math.random() * 4,
      delay: 0.1 + Math.random() * 0.5,
      side: Math.random() > 0.5 ? 1 : -1,
      speed: 20 + Math.random() * 60,
      color: Math.random() > 0.5 ? '#1F1C18' : '#2A2620',
      grav: 20 + Math.random() * 40,
      opacity: 0.6 + Math.random() * 0.4
    })
  }

  let startTime = null
  const CURTAIN_DURATION = 1.3

  function animate(ts) {
    if (!startTime) startTime = ts
    const t = (ts - startTime) / 1000

    ctx.clearRect(0, 0, w, h)
    let anyVisible = false

    // === CURTAIN HALVES ===
    const curtainT = Math.min(1, t / CURTAIN_DURATION)
    const eased = 1 - Math.pow(1 - curtainT, 3)

    if (eased < 0.99) {
      anyVisible = true
      const gap = eased * (w / 2 + 80)

      // Left curtain
      ctx.save()
      ctx.fillStyle = '#1F1C18'
      ctx.fillRect(-80 - (1 - eased) * 20, 0, w / 2 - gap + 80, h)
      // Soft gradient edge on right side of left curtain
      const edgeX1 = w / 2 - gap
      if (edgeX1 > 0) {
        const eg1 = ctx.createLinearGradient(edgeX1 - 50, 0, edgeX1, 0)
        eg1.addColorStop(0, 'rgba(31,28,24,0)')
        eg1.addColorStop(1, 'rgba(31,28,24,0.9)')
        ctx.fillStyle = eg1
        ctx.fillRect(edgeX1 - 50, 0, 50, h)
      }
      ctx.restore()

      // Right curtain
      ctx.save()
      ctx.fillStyle = '#1F1C18'
      ctx.fillRect(w / 2 + gap, 0, w, h)
      // Soft gradient edge on left side of right curtain
      const edgeX2 = w / 2 + gap
      if (edgeX2 < w) {
        const eg2 = ctx.createLinearGradient(edgeX2, 0, edgeX2 + 50, 0)
        eg2.addColorStop(0, 'rgba(31,28,24,0.9)')
        eg2.addColorStop(1, 'rgba(31,28,24,0)')
        ctx.fillStyle = eg2
        ctx.fillRect(edgeX2, 0, 50, h)
      }
      ctx.restore()
    }

    // === EDGE DISSOLVE PARTICLES ===
    for (const ep of edgeParticles) {
      if (t < ep.delay) continue
      const et = t - ep.delay
      const gap = (1 - Math.pow(1 - Math.min(1, (t) / CURTAIN_DURATION), 3)) * (w / 2 + 80)
      const ex = cx + ep.side * gap + ep.side * et * ep.speed
      const ey = ep.y + 0.5 * ep.grav * et * et
      const eOpacity = Math.max(0, ep.opacity - et * 1.5)

      if (eOpacity > 0.01) {
        ctx.save()
        ctx.globalAlpha = eOpacity
        ctx.fillStyle = ep.color
        ctx.beginPath()
        ctx.arc(ex, ey, ep.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // === CENTRAL FLASH ===
    if (t < 0.5) {
      const flashO = Math.max(0, 0.4 - t * 1.0)
      const flashR = Math.max(1, t * 600)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR)
      grad.addColorStop(0, `rgba(232,220,199,${flashO})`)
      grad.addColorStop(0.3, `rgba(198,107,61,${flashO * 0.6})`)
      grad.addColorStop(1, 'rgba(198,107,61,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }

    // === LIGHT RAYS ===
    if (t > 0.1 && t < 1.6) {
      const rayBase = t - 0.1
      const rayFadeIn = Math.min(1, rayBase * 3)
      const rayFadeOut = Math.max(0, 1 - Math.max(0, rayBase - 0.8) * 2.5)
      const rayOpacity = rayFadeIn * rayFadeOut * 0.25

      if (rayOpacity > 0.01) {
        for (const ray of rays) {
          if (rayBase < ray.delay) continue
          const rt = rayBase - ray.delay
          const rLen = Math.min(1, rt * 2.5) * ray.length * Math.max(w, h)
          const rWidth = ray.width * Math.max(w, h)

          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(ray.angle)
          ctx.globalAlpha = rayOpacity
          const rayGrad = ctx.createLinearGradient(0, 0, rLen, 0)
          rayGrad.addColorStop(0, 'rgba(212,184,149,0.7)')
          rayGrad.addColorStop(0.4, 'rgba(198,107,61,0.3)')
          rayGrad.addColorStop(1, 'rgba(198,107,61,0)')
          ctx.fillStyle = rayGrad
          ctx.beginPath()
          ctx.moveTo(0, -rWidth / 2)
          ctx.lineTo(rLen, -rWidth / 5)
          ctx.lineTo(rLen, rWidth / 5)
          ctx.lineTo(0, rWidth / 2)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      }
    }

    // === SHOCKWAVE RINGS ===
    if (t < 1.3) {
      const swR = t * 700
      const swO = Math.max(0, 0.45 - t * 0.4)
      ctx.beginPath()
      ctx.arc(cx, cy, swR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(198,107,61,${swO})`
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    if (t > 0.18 && t < 1.5) {
      const st2 = t - 0.18
      const swR2 = st2 * 550
      const swO2 = Math.max(0, 0.25 - st2 * 0.2)
      ctx.beginPath()
      ctx.arc(cx, cy, swR2, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(212,184,149,${swO2})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // === MAIN PARTICLES ===
    for (const p of particles) {
      if (t < p.delay) continue
      const pt = t - p.delay
      const px = p.x + p.vx * pt
      const py = p.y + p.vy * pt + 0.5 * p.grav * pt * pt
      const opacity = Math.max(0, 1 - pt * 1.3)

      if (opacity < 0.01) continue
      anyVisible = true

      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(p.rotation + p.rotSpeed * pt)
      ctx.globalAlpha = opacity
      ctx.fillStyle = p.color

      if (p.shape === 'circle') {
        ctx.shadowColor = p.color
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else if (p.shape === 'diamond') {
        ctx.shadowColor = '#E8DCC7'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.moveTo(0, -p.size)
        ctx.lineTo(p.size * 0.6, 0)
        ctx.lineTo(0, p.size)
        ctx.lineTo(-p.size * 0.6, 0)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
      } else if (p.shape === 'dot') {
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Fragment
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7)
      }
      ctx.restore()
    }

    // === SPARKS ===
    for (const s of sparks) {
      if (t < s.delay) continue
      const st = t - s.delay
      const sx = s.x + s.vx * st
      const sy = s.y + s.vy * st + 0.5 * s.grav * st * st
      const sOpacity = Math.max(0, 0.9 - st * 2.8)

      if (sOpacity > 0.01) {
        anyVisible = true
        ctx.globalAlpha = sOpacity
        ctx.fillStyle = s.color
        ctx.shadowColor = s.color
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // === SEAM SPARKLES ===
    if (t < 0.9) {
      for (const ss of seamSparkles) {
        if (t < ss.delay) continue
        const sst = t - ss.delay
        const ssOpacity = Math.max(0, (1 - sst / ss.life)) * 0.9
        const sx = cx + Math.sin(ss.y * 0.01 + t * 4) * (20 + sst * ss.drift)
        const sy = ss.y - sst * 30

        if (ssOpacity > 0.01) {
          ctx.globalAlpha = ssOpacity
          ctx.fillStyle = '#D4B895'
          ctx.shadowColor = '#C66B3D'
          ctx.shadowBlur = 8
          // Draw a 4-pointed star
          const s = ss.size
          ctx.beginPath()
          ctx.moveTo(sx, sy - s * 1.5)
          ctx.lineTo(sx + s * 0.4, sy)
          ctx.lineTo(sx, sy + s * 1.5)
          ctx.lineTo(sx - s * 0.4, sy)
          ctx.closePath()
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(sx - s * 1.5, sy)
          ctx.lineTo(sx, sy + s * 0.4)
          ctx.lineTo(sx + s * 1.5, sy)
          ctx.lineTo(sx, sy - s * 0.4)
          ctx.closePath()
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
    }

    ctx.globalAlpha = 1

    if (anyVisible && t < 3.5) {
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

.intro-overlay {
  position: absolute;
  inset: 0;
  background: #1F1C18;
}

.effect-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.intro-center {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 3rem 2rem;
  overflow: visible;
  transition: opacity 0.45s ease, transform 0.45s ease, filter 0.45s ease;
}
.intro-center.center-exit {
  opacity: 0;
  transform: scale(0.92);
  filter: blur(10px);
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
  animation: logoIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both,
             logoFloat 4s ease-in-out 0.8s infinite;
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
  gap: 0.12em;
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
  animation: charIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
}
.c1 { animation-delay: 0.3s; }
.c2 { animation-delay: 0.42s; }
.c3 { animation-delay: 0.54s; }
.c4 { animation-delay: 0.66s; }

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
  animation: fadeUp 0.45s ease 0.9s both;
}

/* Divider */
.divider-line {
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(198,107,61,0.5), transparent);
  animation: lineGrow 0.5s ease 1.1s both;
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
  margin-top: 0.4rem;
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
  animation: fadeUp 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.3s both;
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
  .intro-center { gap: 0.6rem; padding: 2rem 1.5rem; }
}
@media (max-width: 480px) {
  .intro-logo { width: 76px; height: 76px; }
  .title-char { font-size: 2rem; }
  .intro-sub { font-size: 0.75rem; letter-spacing: 0.3em; }
  .enter-btn { padding: 0.7rem 1.8rem; font-size: 0.9rem; letter-spacing: 0.2em; }
  .spotlight { width: 280px; height: 280px; }
  .intro-center { gap: 0.5rem; padding: 1.5rem 1rem; }
}
</style>
