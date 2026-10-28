const APPEARANCE_KEY = 'vitepress-theme-appearance'
const LIGHT_THEME_COLOR = '#F3F8FA'
const DARK_THEME_COLOR = '#0B1824'

export function getChinaTimeTheme(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hourCycle: 'h23'
  }).format(date))

  return hour >= 19 || hour < 7 ? 'dark' : 'light'
}

export function createChinaThemeBootstrapScript() {
  return `;(() => {
    const theme = (${getChinaTimeTheme.toString()})()
    localStorage.setItem(${JSON.stringify(APPEARANCE_KEY)}, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', theme === 'dark' ? ${JSON.stringify(DARK_THEME_COLOR)} : ${JSON.stringify(LIGHT_THEME_COLOR)}
    )
  })()`
}
