<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import type { UseThemeOptions } from '../composables/useTheme'
import type { AppShellLayout, AppShellNavItem } from './appShellTypes'
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme'
import { appShellIcons } from './appShellIcons'

interface Props {
  navItems: AppShellNavItem[]
  brandMain?: string
  brandSuffix?: string
  brandTo?: string | object
  accountHref?: string
  showThemeToggle?: boolean
  showAccountLink?: boolean
  themeOptions?: UseThemeOptions
  layout?: AppShellLayout
  railStorageKey?: string | null
  newActionLabel?: string
  newActionTo?: string | object
}

const props = withDefaults(defineProps<Props>(), {
  brandMain: 'app',
  brandSuffix: '.dev',
  brandTo: '/',
  accountHref: '/account',
  showThemeToggle: true,
  showAccountLink: true,
  layout: 'topbar',
  railStorageKey: 'app_rail_collapsed',
  newActionLabel: 'New',
})

const AppShellIcon: FunctionalComponent<{ name: string }> = (iconProps, context) =>
  h('svg', {
    ...context.attrs,
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    innerHTML: iconMarkup(iconProps.name),
  })

const route = useRoute()
const { isDark, setTheme } = useTheme(props.themeOptions)

const activeBase = computed(() => `/${(route.path.split('/')[1] ?? '').toLowerCase()}`)
const themeIconName = computed(() => (isDark.value ? 'moon' : 'sun'))

function isActive(item: AppShellNavItem): boolean {
  if (item.active) return item.active(route.path)
  const to = typeof item.to === 'string' ? item.to : item.to.path
  if (activeBase.value === to) return true
  return item.children?.some((child) => isActive(child)) ?? false
}

// The default mode is `system`, so the resolved theme follows the
// browser's prefers-color-scheme until the user makes an explicit
// choice. The toggle then flips between explicit light/dark off the
// resolved value, so the first click always visibly changes the theme.
function toggleTheme(): void {
  setTheme(isDark.value ? 'light' : 'dark')
}

const themeToggleLabel = computed(() =>
  isDark.value ? 'Switch to light theme' : 'Switch to dark theme',
)

const railCollapsed = ref(readInitialRailCollapsed())
const railExpandedItems = ref<Record<string, boolean>>({})
const railWidth = computed(() =>
  railCollapsed.value ? 'var(--app-rail-width-collapsed)' : 'var(--app-rail-width-expanded)',
)

function toggleRailCollapsed(): void {
  railCollapsed.value = !railCollapsed.value
}

function readInitialRailCollapsed(): boolean {
  if (!props.railStorageKey) return false
  const storage = browserStorage()
  return storage?.getItem(props.railStorageKey) === 'true'
}

function persistRailCollapsed(value: boolean): void {
  if (!props.railStorageKey) return
  const storage = browserStorage()
  storage?.setItem(props.railStorageKey, value ? 'true' : 'false')
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function navIconName(item: AppShellNavItem): string {
  return item.icon ?? 'terminal'
}

function itemKey(prefix: string, item: AppShellNavItem): string {
  return `${prefix}-${item.testid ?? item.label}`
}

function itemTestId(item: AppShellNavItem): string {
  return item.testid ?? item.label.toLowerCase()
}

function drawerTestId(item: AppShellNavItem): string {
  return `drawer-${item.testid ?? item.label.toLowerCase()}`
}

function hasChildren(item: AppShellNavItem): boolean {
  return (item.children?.length ?? 0) > 0
}

function childItems(item: AppShellNavItem): AppShellNavItem[] {
  return item.children ?? []
}

function isRailItemExpanded(item: AppShellNavItem): boolean {
  return railExpandedItems.value[itemKey('rail', item)] ?? false
}

function toggleRailItem(item: AppShellNavItem): void {
  const key = itemKey('rail', item)
  railExpandedItems.value = {
    ...railExpandedItems.value,
    [key]: !railExpandedItems.value[key],
  }
}

function iconMarkup(name: string): string {
  return appShellIcons[name] ?? appShellIcons.terminal ?? ''
}

watch(
  railCollapsed,
  (collapsed) => {
    persistRailCollapsed(collapsed)
  },
  { flush: 'sync' },
)

// Drawer state — full-height slide-in panel on `< lg` (anything
// narrower than 1024 px). The desktop layout shows the inline nav
// + right cluster only at lg+ so the 5+ portfolio items and the
// extras cluster never get squished into a too-narrow header on
// laptops or tablet portrait. Below lg, every action collapses
// behind the hamburger.
const drawerOpen = ref(false)

function openDrawer(): void {
  drawerOpen.value = true
}

function closeDrawer(): void {
  drawerOpen.value = false
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') drawerOpen.value = false
}

watch(drawerOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

watch(
  () => route.path,
  () => {
    drawerOpen.value = false
  },
)

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <div
    v-if="layout === 'topbar'"
    class="min-h-screen bg-[var(--color-surface-dark)] text-[var(--color-text-primary)]"
  >
    <nav
      class="fixed top-0 z-40 w-full border-b border-[var(--color-surface-border)]/50 bg-[var(--color-surface-dark)]/90 backdrop-blur-md"
      data-testid="app-nav"
    >
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <RouterLink
          :to="brandTo"
          class="font-mono text-sm font-bold tracking-tight text-[var(--color-terminal-green)]"
          data-testid="app-home-link"
        >
          <span class="text-[var(--color-text-muted)]">~/</span>{{ brandMain
          }}<span class="text-[var(--color-accent-light)]">{{ brandSuffix }}</span>
        </RouterLink>

        <div
          class="hidden items-center gap-5 font-mono text-xs tracking-tight lg:flex"
          data-testid="app-nav-desktop"
        >
          <RouterLink
            v-for="item in navItems"
            :key="`desk-${item.testid ?? item.label}`"
            :to="item.to"
            :data-testid="item.testid"
            class="transition-colors"
            :class="[
              isActive(item)
                ? 'text-[var(--color-terminal-green)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ]"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <div class="hidden items-center gap-4 lg:flex" data-testid="app-nav-right">
          <button
            v-if="showThemeToggle"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-terminal-amber)]"
            :title="themeToggleLabel"
            :aria-label="themeToggleLabel"
            data-testid="nav-theme-toggle"
            @click="toggleTheme"
          >
            <AppShellIcon v-if="isDark" name="moon" class="h-4 w-4" />
            <AppShellIcon v-else name="sun" class="h-4 w-4" />
          </button>
          <slot name="extras" :compact="true" />
          <a
            v-if="showAccountLink"
            :href="accountHref"
            class="font-mono text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-terminal-green)]"
            data-testid="nav-account"
          >
            Account
          </a>
        </div>

        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)] lg:hidden"
          aria-label="Open menu"
          :aria-expanded="drawerOpen"
          data-testid="nav-menu-trigger"
          @click="openDrawer"
        >
          <AppShellIcon name="menu" class="h-5 w-5" />
        </button>
      </div>
    </nav>

    <Teleport to="body">
      <Transition name="drawer">
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-50 lg:hidden"
          data-testid="nav-drawer-root"
          aria-modal="true"
          role="dialog"
        >
          <div
            class="absolute inset-0 bg-black/70 backdrop-blur-sm"
            data-testid="nav-drawer-backdrop"
            @click="closeDrawer"
          />
          <aside
            class="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-[var(--color-surface-card)] shadow-2xl"
            data-testid="nav-drawer"
          >
            <header
              class="flex h-14 items-center justify-between border-b border-[var(--color-surface-border)] px-5"
            >
              <span
                class="font-mono text-sm font-bold tracking-tight text-[var(--color-terminal-green)]"
              >
                <span class="text-[var(--color-text-muted)]">~/</span>{{ brandMain
                }}<span class="text-[var(--color-accent-light)]">{{ brandSuffix }}</span>
              </span>
              <button
                type="button"
                class="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
                aria-label="Close menu"
                data-testid="nav-drawer-close"
                @click="closeDrawer"
              >
                <AppShellIcon name="close" class="h-5 w-5" />
              </button>
            </header>

            <nav class="flex-1 overflow-y-auto px-3 py-4" data-testid="nav-drawer-list">
              <RouterLink
                v-for="item in navItems"
                :key="`drawer-${item.testid ?? item.label}`"
                :to="item.to"
                :data-testid="drawerTestId(item)"
                class="flex items-center rounded-md px-4 py-3 font-mono text-sm transition-colors"
                :class="[
                  isActive(item)
                    ? 'bg-[var(--color-surface-elevated)] text-[var(--color-terminal-green)]'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]',
                ]"
              >
                {{ item.label }}
              </RouterLink>

              <div
                v-if="$slots.extras"
                class="mt-4 border-t border-[var(--color-surface-border)] pt-4"
              >
                <slot name="extras" :compact="false" />
              </div>

              <div
                class="mt-4 border-t border-[var(--color-surface-border)] pt-4"
                style="padding-bottom: env(safe-area-inset-bottom)"
              >
                <button
                  v-if="showThemeToggle"
                  type="button"
                  class="flex w-full items-center justify-between rounded-md px-4 py-3 text-left font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-amber)]"
                  data-testid="drawer-theme"
                  @click="toggleTheme"
                >
                  <span>{{ themeToggleLabel }}</span>
                  <AppShellIcon :name="themeIconName" class="h-4 w-4" />
                </button>
                <a
                  v-if="showAccountLink"
                  :href="accountHref"
                  class="flex w-full items-center rounded-md px-4 py-3 font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
                  data-testid="drawer-account"
                  @click="closeDrawer"
                >
                  Account
                </a>
              </div>
            </nav>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <main class="pt-14">
      <slot />
    </main>
  </div>

  <div
    v-else
    class="min-h-screen bg-[var(--color-surface-dark)] text-[var(--color-text-primary)]"
    :style="{ '--rail-w': railWidth }"
  >
    <nav
      class="fixed top-0 z-40 w-full border-b border-[var(--color-surface-border)]/50 bg-[var(--color-surface-dark)]/90 backdrop-blur-md lg:hidden"
      data-testid="app-nav"
    >
      <!-- The drawer slides in from the left, so the trigger sits on the left to match. -->
      <div class="flex h-[var(--app-nav-height)] items-center justify-between px-4">
        <button
          type="button"
          class="-ml-1.5 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
          aria-label="Open menu"
          :aria-expanded="drawerOpen"
          data-testid="nav-menu-trigger"
          @click="openDrawer"
        >
          <AppShellIcon name="menu" class="h-5 w-5" />
        </button>

        <RouterLink
          :to="brandTo"
          class="font-mono text-sm font-bold tracking-tight text-[var(--color-terminal-green)]"
          data-testid="app-home-link"
        >
          <span class="text-[var(--color-text-muted)]">~/</span>{{ brandMain
          }}<span class="text-[var(--color-accent-light)]">{{ brandSuffix }}</span>
        </RouterLink>
      </div>
    </nav>

    <aside
      class="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col border-r border-[var(--color-surface-border)]/50 bg-[var(--color-surface-dark)]/95 px-2 transition-[width] duration-200 lg:flex"
      data-testid="app-rail"
      style="
        padding-top: calc(env(safe-area-inset-top) + 0.75rem);
        padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem);
      "
    >
      <div class="flex h-11 items-center gap-2 px-1">
        <button
          type="button"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
          :aria-label="railCollapsed ? 'Expand navigation rail' : 'Collapse navigation rail'"
          :aria-expanded="!railCollapsed"
          data-testid="rail-toggle"
          @click="toggleRailCollapsed"
        >
          <AppShellIcon name="menu" class="h-5 w-5" />
        </button>

        <RouterLink
          v-show="!railCollapsed"
          :to="brandTo"
          class="min-w-0 truncate font-mono text-sm font-bold tracking-tight text-[var(--color-terminal-green)]"
          data-testid="rail-home-link"
        >
          <span class="text-[var(--color-text-muted)]">~/</span>{{ brandMain
          }}<span class="text-[var(--color-accent-light)]">{{ brandSuffix }}</span>
        </RouterLink>
      </div>

      <div
        v-if="$slots['new-action'] || newActionTo"
        class="mt-3 px-1"
        data-testid="rail-new-action"
      >
        <slot name="new-action" :collapsed="railCollapsed">
          <RouterLink
            v-if="newActionTo"
            :to="newActionTo"
            class="flex h-11 items-center gap-3 rounded-md bg-[var(--color-terminal-green)]/15 px-3 font-mono text-sm font-semibold text-[var(--color-terminal-green)] transition-colors hover:bg-[var(--color-terminal-green)]/20"
            :class="railCollapsed ? 'justify-center' : 'justify-start'"
          >
            <AppShellIcon name="plus" class="h-6 w-6 shrink-0" />
            <span v-show="!railCollapsed" class="truncate">{{ newActionLabel }}</span>
          </RouterLink>
        </slot>
      </div>

      <nav class="mt-4 space-y-1 overflow-y-auto px-1" data-testid="app-rail-list">
        <div v-for="item in navItems" :key="itemKey('rail', item)">
          <div class="flex items-center gap-1">
            <RouterLink
              :to="item.to"
              :data-testid="item.testid"
              class="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-3 font-mono text-sm transition-colors"
              :class="[
                isActive(item)
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-terminal-green)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]',
                railCollapsed ? 'justify-center' : 'justify-start',
              ]"
              :title="item.label"
            >
              <AppShellIcon :name="navIconName(item)" class="h-6 w-6 shrink-0" />
              <span
                v-show="!railCollapsed"
                class="truncate"
                :data-testid="`rail-label-${itemTestId(item)}`"
              >
                {{ item.label }}
              </span>
            </RouterLink>

            <button
              v-if="hasChildren(item) && !railCollapsed"
              type="button"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
              :aria-label="`${isRailItemExpanded(item) ? 'Collapse' : 'Expand'} ${item.label}`"
              :aria-expanded="isRailItemExpanded(item)"
              :data-testid="`rail-disclosure-${itemTestId(item)}`"
              @click="toggleRailItem(item)"
            >
              <AppShellIcon
                name="plus"
                class="h-4 w-4 transition-transform"
                :class="{ 'rotate-45': isRailItemExpanded(item) }"
              />
            </button>
          </div>

          <div
            v-if="hasChildren(item) && !railCollapsed && isRailItemExpanded(item)"
            class="mt-1 space-y-1 pl-6"
          >
            <RouterLink
              v-for="child in childItems(item)"
              :key="itemKey('rail-child', child)"
              :to="child.to"
              :data-testid="child.testid"
              class="flex h-11 items-center gap-3 rounded-md px-3 font-mono text-sm transition-colors"
              :class="[
                isActive(child)
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-terminal-green)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]',
              ]"
              :title="child.label"
            >
              <AppShellIcon :name="navIconName(child)" class="h-6 w-6 shrink-0" />
              <span class="truncate">{{ child.label }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <div
        v-if="$slots.extras && !railCollapsed"
        class="mt-4 border-t border-[var(--color-surface-border)] px-1 pt-4"
      >
        <slot name="extras" :compact="railCollapsed" />
      </div>

      <div class="mt-auto space-y-2 px-1" data-testid="app-rail-footer">
        <button
          v-if="showThemeToggle"
          type="button"
          class="flex h-11 w-full items-center gap-3 rounded-md px-3 font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-amber)]"
          :class="railCollapsed ? 'justify-center' : 'justify-start'"
          :title="themeToggleLabel"
          :aria-label="themeToggleLabel"
          data-testid="nav-theme-toggle"
          @click="toggleTheme"
        >
          <AppShellIcon :name="themeIconName" class="h-6 w-6 shrink-0" />
          <span v-show="!railCollapsed" class="truncate">{{ themeToggleLabel }}</span>
        </button>
        <a
          v-if="showAccountLink"
          :href="accountHref"
          class="flex h-11 w-full items-center gap-3 rounded-md px-3 font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
          :class="railCollapsed ? 'justify-center' : 'justify-start'"
          data-testid="nav-account"
        >
          <AppShellIcon name="user" class="h-6 w-6 shrink-0" />
          <span v-show="!railCollapsed" class="truncate">Account</span>
        </a>
      </div>
    </aside>

    <Teleport to="body">
      <Transition name="drawer-left">
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-50 lg:hidden"
          data-testid="nav-drawer-root"
          aria-modal="true"
          role="dialog"
        >
          <div
            class="absolute inset-0 bg-black/70 backdrop-blur-sm"
            data-testid="nav-drawer-backdrop"
            @click="closeDrawer"
          />
          <aside
            class="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-[var(--color-surface-card)] shadow-2xl"
            data-testid="nav-drawer"
          >
            <header
              class="flex h-14 items-center justify-between border-b border-[var(--color-surface-border)] px-5"
            >
              <span
                class="font-mono text-sm font-bold tracking-tight text-[var(--color-terminal-green)]"
              >
                <span class="text-[var(--color-text-muted)]">~/</span>{{ brandMain
                }}<span class="text-[var(--color-accent-light)]">{{ brandSuffix }}</span>
              </span>
              <button
                type="button"
                class="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
                aria-label="Close menu"
                data-testid="nav-drawer-close"
                @click="closeDrawer"
              >
                <AppShellIcon name="close" class="h-5 w-5" />
              </button>
            </header>

            <nav class="flex-1 overflow-y-auto px-3 py-4" data-testid="nav-drawer-list">
              <template v-for="item in navItems" :key="itemKey('drawer', item)">
                <RouterLink
                  :to="item.to"
                  :data-testid="drawerTestId(item)"
                  class="flex items-center gap-3 rounded-md px-4 py-3 font-mono text-sm transition-colors"
                  :class="[
                    isActive(item)
                      ? 'bg-[var(--color-surface-elevated)] text-[var(--color-terminal-green)]'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]',
                  ]"
                >
                  <AppShellIcon :name="navIconName(item)" class="h-5 w-5 shrink-0" />
                  <span>{{ item.label }}</span>
                </RouterLink>

                <RouterLink
                  v-for="child in childItems(item)"
                  :key="itemKey('drawer-child', child)"
                  :to="child.to"
                  :data-testid="drawerTestId(child)"
                  class="ml-6 flex items-center gap-3 rounded-md px-4 py-3 font-mono text-sm transition-colors"
                  :class="[
                    isActive(child)
                      ? 'bg-[var(--color-surface-elevated)] text-[var(--color-terminal-green)]'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]',
                  ]"
                >
                  <AppShellIcon :name="navIconName(child)" class="h-5 w-5 shrink-0" />
                  <span>{{ child.label }}</span>
                </RouterLink>
              </template>

              <div
                v-if="$slots.extras"
                class="mt-4 border-t border-[var(--color-surface-border)] pt-4"
              >
                <slot name="extras" :compact="false" />
              </div>

              <div
                class="mt-4 border-t border-[var(--color-surface-border)] pt-4"
                style="padding-bottom: env(safe-area-inset-bottom)"
              >
                <button
                  v-if="showThemeToggle"
                  type="button"
                  class="flex w-full items-center justify-between rounded-md px-4 py-3 text-left font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-amber)]"
                  data-testid="drawer-theme"
                  @click="toggleTheme"
                >
                  <span>{{ themeToggleLabel }}</span>
                  <AppShellIcon :name="themeIconName" class="h-4 w-4" />
                </button>
                <a
                  v-if="showAccountLink"
                  :href="accountHref"
                  class="flex w-full items-center rounded-md px-4 py-3 font-mono text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-terminal-green)]"
                  data-testid="drawer-account"
                  @click="closeDrawer"
                >
                  Account
                </a>
              </div>
            </nav>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <main class="pt-14 transition-[margin] duration-200 lg:ml-[var(--rail-w)] lg:pt-0">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active,
.drawer-left-enter-active,
.drawer-left-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active aside,
.drawer-leave-active aside,
.drawer-left-enter-active aside,
.drawer-left-leave-active aside {
  transition: transform 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to,
.drawer-left-enter-from,
.drawer-left-leave-to {
  opacity: 0;
}
.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(100%);
}
.drawer-left-enter-from aside,
.drawer-left-leave-to aside {
  transform: translateX(-100%);
}
</style>
