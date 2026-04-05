// docs/.vitepress/config.mjs
export default {
  // 博客标题
  title: "汪洋恣意-信一的博客",
  description: "个人技术博客",

  // GitHub Pages 必须配置为 /
  base: "/",

  // 主题配置（简约导航栏）
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "关于", link: "/about" }
    ]
  }
}