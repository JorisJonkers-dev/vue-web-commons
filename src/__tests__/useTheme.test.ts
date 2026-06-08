import { beforeEach, describe, expect, it } from 'vitest'
import { _resetThemeStateForTests, useTheme } from '../composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    _resetThemeStateForTests()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-mode')
    document.documentElement.className = ''
  })

  it('uses the default generic storage key and data-theme strategy', () => {
    const theme = useTheme()

    theme.setTheme('dark')

    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('supports a different storage key and attribute-only DOM strategy', () => {
    const target = document.createElement('div')
    const theme = useTheme({
      storageKey: 'website-theme',
      target,
      attribute: 'data-mode',
      className: null,
    })

    theme.setTheme('light')

    expect(localStorage.getItem('website-theme')).toBe('light')
    expect(target.getAttribute('data-mode')).toBe('light')
    expect(target.className).toBe('')
  })

  it('supports a second storage key and class-only DOM strategy', () => {
    const target = document.createElement('div')
    const theme = useTheme({
      storageKey: 'admin-theme',
      target,
      attribute: null,
      className: 'theme-dark',
    })

    theme.setTheme('dark')

    expect(localStorage.getItem('admin-theme')).toBe('dark')
    expect(target.hasAttribute('data-theme')).toBe(false)
    expect(target.classList.contains('theme-dark')).toBe(true)
  })

  it('ignores disallowed modes', () => {
    const theme = useTheme<'light' | 'dark'>({
      defaultMode: 'light',
      allowedModes: ['light', 'dark'],
    })

    theme.setTheme('dark')
    theme.setTheme('contrast' as 'light')

    expect(theme.mode.value).toBe('dark')
  })
})
