import type { PluginOption, ProxyOptions, UserConfig as ViteUserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export type JsonObject = Record<string, unknown>

export interface VueViteConfigOptions {
  srcDir?: string
  alias?: Record<string, string>
  includeVuePlugin?: boolean
  plugins?: PluginOption[]
  server?: ViteUserConfig['server']
  build?: ViteUserConfig['build'] & {
    hashedAssetNames?: boolean
  }
  css?: ViteUserConfig['css']
  optimizeDeps?: ViteUserConfig['optimizeDeps']
  define?: ViteUserConfig['define']
  proxy?: Record<string, string | ProxyOptions>
}

export interface VueVitestConfigOptions {
  srcDir?: string
  alias?: Record<string, string>
  includeVuePlugin?: boolean
  plugins?: PluginOption[]
  environment?: 'jsdom' | 'happy-dom' | 'node' | 'edge-runtime'
  globals?: boolean
  setupFiles?: string[]
  include?: string[]
  exclude?: string[]
  css?: boolean
  clearMocks?: boolean
  restoreMocks?: boolean
  mockReset?: boolean
  coverage?: JsonObject
  server?: JsonObject
}

export interface VuePlaywrightConfigOptions {
  testDir?: string
  timeout?: number
  expectTimeout?: number
  fullyParallel?: boolean
  workers?: number
  retries?: number
  reporter?: string | unknown[]
  baseURL?: string
  trace?: string
  navigationTimeout?: number
  reducedMotion?: string
  webServer?: JsonObject
  projects?: JsonObject[]
}

export interface VueTsConfigOptions {
  target?: string
  lib?: string[]
  paths?: Record<string, string[]>
  include?: string[]
  exclude?: string[]
  compilerOptions?: JsonObject
}

export interface TsConfigJson {
  compilerOptions: JsonObject
  include: string[]
  exclude: string[]
}

export interface VueVitestConfig {
  plugins: PluginOption[]
  resolve: {
    alias: Record<string, string>
  }
  test: JsonObject
}

export function createVueViteConfig(options: VueViteConfigOptions = {}): ViteUserConfig {
  const alias = {
    '@': options.srcDir ?? './src',
    ...options.alias,
  }
  const plugins = [
    ...(options.includeVuePlugin === false ? [] : [vue()]),
    ...(options.plugins ?? []),
  ]
  const server = {
    ...options.server,
    ...(options.proxy ? { proxy: options.proxy } : {}),
  }
  const build = {
    modulePreload: { polyfill: false },
    ...options.build,
    ...(options.build?.hashedAssetNames
      ? {
          rollupOptions: {
            ...options.build.rollupOptions,
            output: {
              entryFileNames: 'assets/[hash].js',
              chunkFileNames: 'assets/[hash].js',
              assetFileNames: 'assets/[hash][extname]',
              ...asObject(options.build.rollupOptions?.output),
            },
          },
        }
      : {}),
  }
  delete (build as { hashedAssetNames?: boolean }).hashedAssetNames

  return {
    plugins,
    resolve: {
      alias,
    },
    server,
    build,
    ...(options.css ? { css: options.css } : {}),
    ...(options.optimizeDeps ? { optimizeDeps: options.optimizeDeps } : {}),
    ...(options.define ? { define: options.define } : {}),
  }
}

export function createVueVitestConfig(options: VueVitestConfigOptions = {}): VueVitestConfig {
  return {
    plugins: [...(options.includeVuePlugin === false ? [] : [vue()]), ...(options.plugins ?? [])],
    resolve: {
      alias: {
        '@': options.srcDir ?? './src',
        ...options.alias,
      },
    },
    test: {
      environment: options.environment ?? 'jsdom',
      globals: options.globals,
      setupFiles: options.setupFiles,
      include: options.include ?? ['src/**/*.test.ts'],
      exclude: options.exclude,
      css: options.css,
      clearMocks: options.clearMocks,
      restoreMocks: options.restoreMocks ?? true,
      mockReset: options.mockReset,
      server: options.server,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/*.d.ts', 'src/**/types/**', 'src/main.ts'],
        thresholds: {
          lines: 80,
        },
        ...options.coverage,
      },
    },
  }
}

export function createVuePlaywrightConfig(options: VuePlaywrightConfigOptions = {}): JsonObject {
  const use: JsonObject = {
    baseURL: options.baseURL ?? 'http://127.0.0.1:5173',
    trace: options.trace ?? 'on-first-retry',
    ...(options.navigationTimeout !== undefined
      ? { navigationTimeout: options.navigationTimeout }
      : {}),
    ...(options.reducedMotion !== undefined ? { reducedMotion: options.reducedMotion } : {}),
  }

  return {
    testDir: options.testDir ?? './e2e',
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options.expectTimeout !== undefined ? { expect: { timeout: options.expectTimeout } } : {}),
    fullyParallel: options.fullyParallel ?? true,
    ...(options.workers !== undefined ? { workers: options.workers } : {}),
    retries: options.retries ?? 1,
    reporter: options.reporter ?? 'html',
    use,
    projects: options.projects ?? [{ name: 'chromium', use: { browserName: 'chromium' } }],
    ...(options.webServer ? { webServer: options.webServer } : {}),
  }
}

export function createVueTsConfig(options: VueTsConfigOptions = {}): TsConfigJson {
  return {
    compilerOptions: {
      target: options.target ?? 'ES2022',
      jsx: 'preserve',
      lib: options.lib ?? ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      paths: {
        '@/*': ['./src/*'],
        ...options.paths,
      },
      resolveJsonModule: true,
      allowArbitraryExtensions: true,
      strict: true,
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitOverride: true,
      noFallthroughCasesInSwitch: true,
      esModuleInterop: true,
      isolatedModules: true,
      skipLibCheck: true,
      ...options.compilerOptions,
    },
    include: options.include ?? ['src/**/*.ts', 'src/**/*.vue', 'env.d.ts'],
    exclude: options.exclude ?? ['node_modules', 'dist'],
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {}
  return value as Record<string, unknown>
}
