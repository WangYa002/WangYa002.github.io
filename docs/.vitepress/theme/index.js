import DefaultTheme from 'vitepress/theme'
import DocLayout from './components/DocLayout.vue'
import HomeBlog from './components/HomeBlog.vue'
import PostListPage from './components/PostListPage.vue'
import ArchivePage from './components/ArchivePage.vue'
import TagCloudPage from './components/TagCloudPage.vue'
import TagDetailPage from './components/TagDetailPage.vue'
import './custom.css'

export default {
  ...DefaultTheme,
  Layout: DocLayout,
  enhanceApp({ app }) {
    // 注册全局组件，供 markdown 直接使用
    app.component('HomeBlog', HomeBlog)
    app.component('PostListPage', PostListPage)
    app.component('ArchivePage', ArchivePage)
    app.component('TagCloudPage', TagCloudPage)
    app.component('TagDetailPage', TagDetailPage)
  },
}
