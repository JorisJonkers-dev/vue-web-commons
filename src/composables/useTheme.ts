import type { ComputedRef, Ref } from 'vue'
import { computed, ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeTarget = Element | (() => Element | null | undefined)

export interface ThemeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface UseThemeOptions<TMode extends string = ThemeMode> {
  storageKey?: string | null
  defaultMode?: TMode
  allowedModes?: readonly TMode[]
  storage?: ThemeStorage | null
  target?: ThemeTarget
  attribute?: string | null
  className?: string | null
  applyStyles?: boolean
  resolveMode?: (mode: TMode) => string
}

export interface ThemeApi<TMode extends string = ThemeMode> {
  mode: Ref<TMode>
  isDark: ComputedRef<boolean>
  resolvedMode: ComputedRef<string>
  setTheme: (mode: TMode) => void
  toggle: () => void
}

interface ThemeStore<TMode extends string> {
  mode: Ref<TMode>
  resolvedMode: ComputedRef<string>
  isDark: ComputedRef<boolean>
  setTheme: (mode: TMode) => void
  toggle: () => void
}

const stores = new Map<string, ThemeStore<string>>()

export function useTheme<TMode extends string = ThemeMode>(options: UseThemeOptions<TMode> = {}): ThemeApi<TMode> {
  const normalized = normalizeOptions(options)
  const key = storeKey(normalized)
  const existing = stores.get(key)
  if (existing) return existing as unknown as ThemeApi<TMode>

  const mode = ref(readInitialMode(normalized)) as Ref<TMode>
  const resolvedMode = computed(() => normalized.resolveMode(mode.value))
  const isDark = computed(() => resolvedMode.value === 'dark')

  function setTheme(nextMode: TMode): void {
    if (normalized.allowedModes.includes(nextMode)) {
      mode.value = nextMode
    }
  }

  function toggle(): void {
    setTheme((isDark.value ? 'light' : 'dark') as TMode)
  }

  applyTheme(normalized, mode.value, resolvedMode.value)

  watch(mode, (nextMode) => {
    persistMode(normalized, nextMode)
    applyTheme(normalized, nextMode, normalized.resolveMode(nextMode))
  }, { flush: 'sync' })

  registerSystemPreferenceListener(() => {
    if (mode.value === 'system') {
      applyTheme(normalized, mode.value, normalized.resolveMode(mode.value))
    }
  })

  const store = {
    mode,
    resolvedMode,
    isDark,
    setTheme,
    toggle,
  }
  stores.set(key, store as unknown as ThemeStore<string>)
  return store
}

export function _resetThemeStateForTests(): void {
  stores.clear()
}

function normalizeOptions<TMode extends string>(options: UseThemeOptions<TMode>): RequiredOptions<TMode> {
  const allowedModes = options.allowedModes ?? (['light', 'dark', 'system'] as unknown as readonly TMode[])
  return {
    storageKey: options.storageKey === undefined ? 'theme' : options.storageKey,
    defaultMode: options.defaultMode ?? ('system' as TMode),
    allowedModes,
    storage: options.storage === undefined ? browserStorage() : options.storage,
    target: options.target ?? defaultTarget,
    attribute: options.attribute === undefined ? 'data-theme' : options.attribute,
    className: options.className === undefined ? 'dark' : options.className,
    applyStyles: options.applyStyles ?? true,
    resolveMode: options.resolveMode ?? defaultResolveMode,
  }
}

interface RequiredOptions<TMode extends string> {
  storageKey: string | null
  defaultMode: TMode
  allowedModes: readonly TMode[]
  storage: ThemeStorage | null
  target: ThemeTarget
  attribute: string | null
  className: string | null
  applyStyles: boolean
  resolveMode: (mode: TMode) => string
}

function readInitialMode<TMode extends string>(options: RequiredOptions<TMode>): TMode {
  if (options.storageKey && options.storage) {
    const stored = options.storage.getItem(options.storageKey)
    if (stored && options.allowedModes.includes(stored as TMode)) {
      return stored as TMode
    }
  }
  return options.defaultMode
}

function persistMode<TMode extends string>(options: RequiredOptions<TMode>, mode: TMode): void {
  if (options.storageKey && options.storage) {
    options.storage.setItem(options.storageKey, mode)
  }
}

function applyTheme<TMode extends string>(options: RequiredOptions<TMode>, mode: TMode, resolved: string): void {
  if (!options.applyStyles) return
  const target = resolveTarget(options.target)
  if (!target) return

  if (options.attribute) {
    target.setAttribute(options.attribute, resolved)
  }
  if (options.className) {
    target.classList.toggle(options.className, resolved === 'dark')
  }
  target.setAttribute('data-theme-mode', mode)
}

function defaultResolveMode<TMode extends string>(mode: TMode): string {
  return mode === 'system' ? getSystemPreference() : mode
}

function getSystemPreference(): 'light' | 'dark' {
  if (!isBrowser() || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function registerSystemPreferenceListener(onChange: () => void): void {
  if (!isBrowser() || typeof window.matchMedia !== 'function') return
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onChange)
}

function resolveTarget(target: ThemeTarget): Element | null {
  return typeof target === 'function' ? target() ?? null : target
}

function defaultTarget(): Element | null {
  return isBrowser() ? document.documentElement : null
}

function browserStorage(): ThemeStorage | null {
  return isBrowser() ? window.localStorage : null
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function storeKey<TMode extends string>(options: RequiredOptions<TMode>): string {
  return [
    options.storageKey ?? '',
    options.defaultMode,
    options.allowedModes.join('|'),
    options.attribute ?? '',
    options.className ?? '',
    String(options.applyStyles),
  ].join(':')
}
