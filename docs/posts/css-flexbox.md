---
title: CSS Flexbox 布局详解
date: 2026-04-05
tags:
  - CSS
  - 前端
description: 详解Flexbox布局的核心概念，包括容器属性和项目属性
---

# CSS Flexbox 布局详解

## 基本概念

Flexbox（弹性盒布局）是一种一维布局模型，非常适合处理页面中的对齐、分布和排序问题。

```
Flex Container (容器)
    ├── Flex Item (项目)
    ├── Flex Item (项目)
    └── Flex Item (项目)
```

## 容器属性

### display

```css
.container {
  display: flex;    /* 块级弹性容器 */
  display: inline-flex;  /* 行内弹性容器 */
}
```

### flex-direction（主轴方向）

```css
.container {
  flex-direction: row;           /* 默认：左到右 */
  flex-direction: row-reverse;    /* 右到左 */
  flex-direction: column;        /* 上到下 */
  flex-direction: column-reverse;/* 下到上 */
}
```

### justify-content（主轴对齐）

```css
.container {
  justify-content: flex-start;   /* 左对齐 */
  justify-content: flex-end;     /* 右对齐 */
  justify-content: center;       /* 居中 */
  justify-content: space-between;/* 两端对齐，间距相等 */
  justify-content: space-around;  /* 每个项目两侧间距相等 */
  justify-content: space-evenly; /* 间距完全相等 */
}
```

### align-items（交叉轴对齐）

```css
.container {
  align-items: stretch;     /* 默认：占满容器高度 */
  align-items: flex-start;  /* 交叉轴起点 */
  align-items: flex-end;    /* 交叉轴终点 */
  align-items: center;      /* 交叉轴居中 */
  align-items: baseline;    /* 基线对齐 */
}
```

### flex-wrap（换行）

```css
.container {
  flex-wrap: nowrap;    /* 默认：不换行 */
  flex-wrap: wrap;      /* 换行 */
  flex-wrap: wrap-reverse; /* 反向换行 */
}
```

## 项目属性

### order（排序）

```css
.item {
  order: 0;  /* 默认值，越小越靠前 */
}
.item:first-child {
  order: -1;  /* 排在最前面 */
}
```

### flex-grow（放大比例）

```css
.item {
  flex-grow: 0;  /* 默认：不放大 */
}
.item:nth-child(2) {
  flex-grow: 1;  /* 占据多余空间的1份 */
}
```

### flex-shrink（缩小比例）

```css
.item {
  flex-shrink: 1;  /* 默认：可缩小 */
}
.item:nth-child(2) {
  flex-shrink: 0;  /* 不可缩小 */
}
```

### flex-basis（项目大小）

```css
.item {
  flex-basis: auto;  /* 默认：自动 */
  flex-basis: 200px; /* 固定宽度 */
}
```

### flex（简写）

```css
.item {
  flex: 0 1 auto;  /* flex-grow shrink basis */
  flex: 1;        /* flex: 1 1 0% */
}
```

### align-self（单独对齐）

```css
.item:nth-child(2) {
  align-self: center;  /* 覆盖容器的 align-items */
}
```

## 实战示例

### 居中布局

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### 圣杯布局

```css
.holy-grail {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.header, .footer {
  flex: 0 0 60px;
}
.main {
  display: flex;
  flex: 1;
}
.sidebar {
  flex: 0 0 200px;
}
.content {
  flex: 1;
}
```

---

Flexbox 是现代 CSS 布局的重要组成部分，熟练掌握能大大提高开发效率！