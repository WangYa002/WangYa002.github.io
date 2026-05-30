import DefaultTheme from 'vitepress/theme'
import DocLayout from './components/DocLayout.vue'
import './custom.css'

export default {
  ...DefaultTheme,
  Layout: DocLayout
}