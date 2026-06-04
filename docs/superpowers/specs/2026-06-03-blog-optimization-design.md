# Blog Optimization Design

VitePress blog progressive optimization covering performance, SEO, DX, and UX.

## 1. Performance Optimization

### 1.1 Vite Build Optimization
- Enable `cleanUrls: true` in config.mjs
- Add `rollupOptions.output.manualChunks` to split vue/vitepress framework code from app code
- Ensure `build.cssCodeSplit: true`

### 1.2 Image Optimization
- Compress `docs/public/logo.png`, `docs/public/logo2.png`, root `index.png` (1.7MB)
- Convert hero images to WebP where supported

### 1.3 Font Optimization
- custom.css references `JetBrains Mono`/`Fira Code` without @font-face — these only work if user has them installed
- Option A: Add @fontsource packages as self-hosted fonts
- Option B: Remove specific font names, rely on system monospace stack
- Chosen: Option B (remove dependency, use system stack: `'Consolas, 'Courier New', monospace'`)

### 1.4 Preload & Cache
- Add `<link rel="preload">` for critical CSS in head config
- GitHub Pages CDN handles caching — no extra config needed

### 1.5 Animation Performance
- Add `will-change: transform` and `transform: translateZ(0)` for hardware acceleration on animated elements
- Add `@media (prefers-reduced-motion: reduce)` to disable persistent float animations
- IntroAnimation.vue: add JS check for `prefers-reduced-motion`

## 2. SEO Optimization

### 2.1 Open Graph & Twitter Cards
- Global OG tags in config.mjs head: `og:site_name`, `og:type`, `og:locale`, `twitter:card`, `twitter:creator`
- Per-page OG tags via `transformHead` hook reading markdown frontmatter

### 2.2 JSON-LD Structured Data
- `transformHead` hook injects `BlogPosting` JSON-LD for article pages
- Homepage gets `WebSite` type JSON-LD
- Fields: headline, datePublished, author, description, url

### 2.3 Meta Improvements
- Add `og:url` (canonical URL) per page
- Add `<link rel="canonical">` per page to avoid duplicate content

### 2.4 Sitemap & RSS Automation
- Rewrite feed.cjs/sitemap.cjs to auto-scan docs/posts/ directory
- Parse markdown frontmatter with gray-matter for title/date/description/tags
- No more hardcoded article lists

## 3. Developer Experience (DX) Optimization

### 3.1 RSS/Sitemap Auto-Scan
- Use gray-matter npm package to parse frontmatter from .md files
- Auto-discover: docs/posts/**/*.md, docs/tags/**/*.md, docs/archive/**/*.md
- Add gray-matter as devDependency

### 3.2 cleanUrls
- Enable `cleanUrls: true` in config.mjs
- URLs become /posts/vue3-composition-api instead of /posts/vue3-composition-api.html
- GitHub Actions deploy already supports this

### 3.3 Custom 404 Page
- Create docs/404.md with blog-consistent styling
- VitePress natively supports this

### 3.4 Sidebar Auto-Generation
- Create utility script that scans posts/ directory and generates sidebar config
- Group by frontmatter category, sort by date
- Import generated sidebar in config.mjs

## 4. User Experience (UX) Optimization

### 4.1 prefers-reduced-motion
- CSS: `@media (prefers-reduced-motion: reduce)` disables all float/keyframe animations
- IntroAnimation.vue: check `window.matchMedia('(prefers-reduced-motion: reduce)')` before playing

### 4.2 Mobile Experience
- .blog-stats: stack vertically on small screens
- tag-grid: ensure 2-column readability on narrow viewports
- Article content: reduce padding on mobile

### 4.3 Accessibility (a11y)
- Add `aria-hidden="true"` to decorative emoji icons
- Add meaningful `aria-label` to navigation links and card anchors
- Verify color contrast meets WCAG AA in both light and dark modes

### 4.4 Dark Mode Consistency
- Audit custom.css dark mode variables for full coverage
- Ensure GiscusComment.vue theme switches with VitePress dark mode

### 4.5 Page Transitions
- Add ViewTransition API support for smoother page switches (Chrome 111+)
- Graceful degradation for unsupported browsers

## Implementation Priority

1. Performance (highest impact, lowest risk)
2. SEO (search visibility)
3. DX (maintenance burden reduction)
4. UX (polish)

## Files Modified

- `docs/.vitepress/config.mjs` — cleanUrls, head tags, vite config, transformHead
- `docs/.vitepress/theme/custom.css` — animation, a11y, mobile, dark mode fixes
- `docs/.vitepress/plugins/feed.cjs` — auto-scan rewrite
- `docs/.vitepress/plugins/sitemap.cjs` — auto-scan rewrite
- `docs/.vitepress/theme/components/IntroAnimation.vue` — reduced-motion support
- `docs/.vitepress/theme/components/GiscusComment.vue` — dark mode sync
- `docs/404.md` — new file
- `package.json` — add gray-matter devDependency

## Risks

- cleanUrls: true requires server-side redirect support — GitHub Pages handles this via 404.html fallback (VitePress auto-generates)
- Auto-scan: must handle markdown files without frontmatter gracefully
- ViewTransition API: progressive enhancement, no risk
