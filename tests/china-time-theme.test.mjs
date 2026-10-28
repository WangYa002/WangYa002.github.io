import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'

const themeModule = await import('../docs/.vitepress/theme/chinaTimeTheme.mjs')

test('China time theme changes at 07:00 and 19:00 Beijing time', () => {
  assert.equal(typeof themeModule.getChinaTimeTheme, 'function')

  const cases = [
    ['2026-10-28T22:59:00.000Z', 'dark'],  // 06:59 CST
    ['2026-10-28T23:00:00.000Z', 'light'], // 07:00 CST
    ['2026-10-29T10:59:00.000Z', 'light'], // 18:59 CST
    ['2026-10-29T11:00:00.000Z', 'dark']   // 19:00 CST
  ]

  for (const [timestamp, expected] of cases) {
    assert.equal(themeModule.getChinaTimeTheme(new Date(timestamp)), expected, timestamp)
  }
})

test('bootstrap applies the China theme before the page renders', () => {
  assert.equal(typeof themeModule.createChinaThemeBootstrapScript, 'function')

  for (const [timestamp, expected] of [
    ['2026-10-28T23:00:00.000Z', 'light'],
    ['2026-10-29T11:00:00.000Z', 'dark']
  ]) {
    const storage = new Map([['vitepress-theme-appearance', expected === 'light' ? 'dark' : 'light']])
    let darkClass = expected !== 'dark'
    let browserThemeColor = ''
    const FixedDate = class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [timestamp]))
      }
    }

    runInNewContext(themeModule.createChinaThemeBootstrapScript(), {
      Date: FixedDate,
      Intl,
      localStorage: {
        setItem(key, value) { storage.set(key, value) }
      },
      document: {
        querySelector(selector) {
          assert.equal(selector, 'meta[name="theme-color"]')
          return { setAttribute(name, value) {
            assert.equal(name, 'content')
            browserThemeColor = value
          } }
        },
        documentElement: {
          classList: {
            toggle(name, enabled) {
              assert.equal(name, 'dark')
              darkClass = enabled
            }
          }
        }
      }
    })

    assert.equal(storage.get('vitepress-theme-appearance'), expected)
    assert.equal(darkClass, expected === 'dark')
    assert.equal(browserThemeColor, expected === 'dark' ? '#0B1824' : '#F3F8FA')
  }
})
