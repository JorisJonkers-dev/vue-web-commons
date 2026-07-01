import type { AppShellNavItem } from '../components/appShellTypes'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppShell from '../components/AppShell.vue'

const navItems: AppShellNavItem[] = [
  { label: 'Alpha', to: '/alpha', testid: 'nav-alpha' },
  { label: 'Beta', to: '/beta', testid: 'nav-beta' },
]

const railNavItems: AppShellNavItem[] = [
  {
    label: 'Alpha',
    to: '/alpha',
    testid: 'nav-alpha',
    icon: 'folder',
    children: [
      { label: 'Alpha Child', to: '/alpha/child', testid: 'nav-alpha-child', icon: 'terminal' },
    ],
  },
  { label: 'Beta', to: '/beta', testid: 'nav-beta', icon: 'chat' },
]

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/alpha', component: { template: '<div />' } },
      { path: '/alpha/child', component: { template: '<div />' } },
      { path: '/beta', component: { template: '<div />' } },
      { path: '/new', component: { template: '<div />' } },
      { path: '/account', component: { template: '<div />' } },
    ],
  })
}

describe('appShell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    document.body.style.overflow = ''
  })

  it('renders the desktop nav links with testids', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
    })
    expect(wrapper.find('[data-testid="nav-alpha"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-beta"]').exists()).toBe(true)
  })

  it('renders the brand with the supplied middle segment', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'assistant', brandSuffix: '.dev' },
      global: { plugins: [makeRouter()] },
    })
    const link = wrapper.find('[data-testid="app-home-link"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('assistant')
    expect(link.text()).toContain('.dev')
  })

  it('hamburger trigger opens the slide-in drawer (Teleported to body)', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })
    expect(document.body.querySelector('[data-testid="nav-drawer"]')).toBeNull()
    await wrapper.find('[data-testid="nav-menu-trigger"]').trigger('click')
    expect(document.body.querySelector('[data-testid="nav-drawer"]')).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
  })

  it('backdrop click closes the drawer', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })
    await wrapper.find('[data-testid="nav-menu-trigger"]').trigger('click')
    const backdrop = document.body.querySelector<HTMLElement>(
      '[data-testid="nav-drawer-backdrop"]',
    )!
    expect(backdrop).not.toBeNull()
    backdrop.click()
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('[data-testid="nav-drawer"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })

  it('escape closes the drawer', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })
    await wrapper.find('[data-testid="nav-menu-trigger"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('[data-testid="nav-drawer"]')).toBeNull()
    wrapper.unmount()
  })

  it('drawer lists every nav item with a drawer-prefixed testid', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })
    await wrapper.find('[data-testid="nav-menu-trigger"]').trigger('click')
    expect(document.body.querySelector('[data-testid="drawer-nav-alpha"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="drawer-nav-beta"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('renders the slot content under the nav', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      slots: { default: '<p data-testid="slot-content">payload</p>' },
      global: { plugins: [makeRouter()] },
    })
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
  })

  it('omits the theme toggle when showThemeToggle is false', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo', showThemeToggle: false },
      global: { plugins: [makeRouter()] },
    })
    expect(wrapper.find('[data-testid="nav-theme-toggle"]').exists()).toBe(false)
  })

  it('renders the theme toggle as an icon (no text label)', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
    })
    const toggle = wrapper.find('[data-testid="nav-theme-toggle"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.find('svg').exists()).toBe(true)
    expect(toggle.text().trim()).toBe('')
  })

  it('toggling the theme persists an explicit light/dark mode', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
    })
    await wrapper.find('[data-testid="nav-theme-toggle"]').trigger('click')
    expect(['light', 'dark']).toContain(localStorage.getItem('theme'))
  })

  it('passes injected theme options to the theme toggle', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const wrapper = mount(AppShell, {
      props: {
        navItems,
        brandMain: 'demo',
        themeOptions: {
          storageKey: 'app-shell-theme',
          target,
          attribute: 'data-app-theme',
          className: 'is-dark',
        },
      },
      global: { plugins: [makeRouter()] },
    })

    await wrapper.find('[data-testid="nav-theme-toggle"]').trigger('click')

    expect(localStorage.getItem('app-shell-theme')).toBeTruthy()
    expect(target.getAttribute('data-app-theme')).toBeTruthy()
    wrapper.unmount()
    target.remove()
  })

  it('renders the account link by default', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [makeRouter()] },
    })
    expect(wrapper.find('[data-testid="nav-account"]').exists()).toBe(true)
  })

  it('omits the account link when showAccountLink is false', () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo', showAccountLink: false },
      global: { plugins: [makeRouter()] },
    })
    expect(wrapper.find('[data-testid="nav-account"]').exists()).toBe(false)
  })

  it('marks the active nav item via class', async () => {
    const router = makeRouter()
    await router.push('/alpha')
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      global: { plugins: [router] },
    })
    const alpha = wrapper.find('[data-testid="nav-alpha"]')
    expect(alpha.classes().join(' ')).toContain('text-[var(--color-terminal-green)]')
  })

  it('extras slot renders both in the desktop right cluster and in the drawer', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems, brandMain: 'demo' },
      slots: { extras: '<span data-testid="extras-slot">EX</span>' },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })
    expect(wrapper.find('[data-testid="extras-slot"]').exists()).toBe(true)
    await wrapper.find('[data-testid="nav-menu-trigger"]').trigger('click')
    expect(
      document.body.querySelectorAll('[data-testid="extras-slot"]').length,
    ).toBeGreaterThanOrEqual(1)
    wrapper.unmount()
  })
})

describe('rail layout', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    document.body.style.overflow = ''
  })

  it('renders the rail aside with nav items and icons', () => {
    const wrapper = mount(AppShell, {
      props: { navItems: railNavItems, brandMain: 'demo', layout: 'rail', newActionTo: '/new' },
      global: { plugins: [makeRouter()] },
    })

    expect(wrapper.find('[data-testid="app-rail"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rail-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rail-new-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-alpha"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-alpha"] svg').exists()).toBe(true)
  })

  it('toggles the collapsed rail state and persists it', async () => {
    const wrapper = mount(AppShell, {
      props: {
        navItems: railNavItems,
        brandMain: 'demo',
        layout: 'rail',
        railStorageKey: 'rail-test',
      },
      global: { plugins: [makeRouter()] },
    })

    const toggle = wrapper.find('[data-testid="rail-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('true')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(localStorage.getItem('rail-test')).toBe('true')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(localStorage.getItem('rail-test')).toBe('false')
  })

  it('renders child nav items when a parent is expanded', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems: railNavItems, brandMain: 'demo', layout: 'rail' },
      global: { plugins: [makeRouter()] },
    })

    expect(wrapper.find('[data-testid="nav-alpha-child"]').exists()).toBe(false)

    await wrapper.find('[data-testid="rail-disclosure-nav-alpha"]').trigger('click')

    const child = wrapper.find('[data-testid="nav-alpha-child"]')
    expect(child.exists()).toBe(true)
    expect(child.text()).toContain('Alpha Child')
  })

  it('opens and closes the left mobile drawer', async () => {
    const wrapper = mount(AppShell, {
      props: { navItems: railNavItems, brandMain: 'demo', layout: 'rail' },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    expect(document.body.querySelector('[data-testid="nav-drawer"]')).toBeNull()

    await wrapper.find('[data-testid="nav-menu-trigger"]').trigger('click')

    expect(document.body.querySelector('[data-testid="nav-drawer"]')).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')

    const backdrop = document.body.querySelector<HTMLElement>(
      '[data-testid="nav-drawer-backdrop"]',
    )!
    backdrop.click()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('[data-testid="nav-drawer"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })
})
