import { describe, expect, it } from 'vitest'
import {
  createFeatureSlicedDependencyCruiserConfig,
  createFeatureSlicedDependencyCruiserForbiddenRules,
  createVueEslintConfig,
  createVuePlaywrightConfig,
  createVueTsConfig,
  createVueViteConfig,
  createVueVitestConfig,
} from '../config'

describe('vue config presets', () => {
  it('creates a Vite config with Vue defaults and caller overrides', () => {
    const config = createVueViteConfig({
      srcDir: './app',
      alias: { '~': './src/shared' },
      server: {
        port: 5174,
        host: true,
      },
      proxy: {
        '/api': { target: 'http://localhost:8080', changeOrigin: true },
      },
      build: {
        target: 'esnext',
        chunkSizeWarningLimit: 700,
        hashedAssetNames: true,
      },
    })

    expect(config.plugins).toHaveLength(1)
    expect(config.resolve?.alias).toMatchObject({ '@': './app', '~': './src/shared' })
    expect(config.server).toMatchObject({
      port: 5174,
      host: true,
      proxy: {
        '/api': { target: 'http://localhost:8080', changeOrigin: true },
      },
    })
    expect(config.build?.modulePreload).toEqual({ polyfill: false })
    expect(config.build?.rollupOptions?.output).toMatchObject({
      entryFileNames: 'assets/[hash].js',
      chunkFileNames: 'assets/[hash].js',
      assetFileNames: 'assets/[hash][extname]',
    })
  })

  it('creates a Vitest config with coverage, setup, and dependency inline options', () => {
    const config = createVueVitestConfig({
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.test.ts'],
      css: true,
      server: {
        deps: {
          inline: ['vuetify'],
        },
      },
      coverage: {
        reportsDirectory: './coverage/unit',
        reporter: ['text', 'json-summary'],
      },
    })

    expect(config.test).toMatchObject({
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.test.ts'],
      css: true,
      restoreMocks: true,
      server: { deps: { inline: ['vuetify'] } },
      coverage: {
        provider: 'v8',
        reportsDirectory: './coverage/unit',
        reporter: ['text', 'json-summary'],
      },
    })
  })

  it('creates structural Playwright config without importing Playwright', () => {
    const config = createVuePlaywrightConfig({
      testDir: './tests/e2e',
      baseURL: 'http://127.0.0.1:4173',
      retries: 0,
      workers: 4,
      reporter: 'list',
      webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
      },
      projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
        { name: 'mobile-chrome', use: { viewport: { width: 412, height: 915 } } },
      ],
    })

    expect(config).toMatchObject({
      testDir: './tests/e2e',
      fullyParallel: true,
      workers: 4,
      retries: 0,
      reporter: 'list',
      use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
      },
      webServer: {
        url: 'http://127.0.0.1:4173',
      },
    })
    expect(config.projects).toHaveLength(2)
  })

  it('creates strict Vue TypeScript config defaults with overrides', () => {
    const config = createVueTsConfig({
      target: 'ES2023',
      paths: {
        '@generated/*': ['./src/services/api/generated/*'],
      },
      include: ['src', 'tests'],
      compilerOptions: {
        types: ['vitest/globals'],
      },
    })

    expect(config.compilerOptions).toMatchObject({
      target: 'ES2023',
      moduleResolution: 'bundler',
      strict: true,
      exactOptionalPropertyTypes: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      paths: {
        '@/*': ['./src/*'],
        '@generated/*': ['./src/services/api/generated/*'],
      },
      types: ['vitest/globals'],
    })
    expect(config.include).toEqual(['src', 'tests'])
  })

  it('creates a zero-warning ESLint flat config preset', async () => {
    const config = await createVueEslintConfig({
      ignores: ['generated'],
    })

    expect(Array.isArray(config)).toBe(true)
    expect(config.some((item) => item.rules?.['no-console'] === 'error')).toBe(true)
    expect(config.some((item) => item.rules?.['no-console'] === 'warn')).toBe(false)
  })
})

describe('dependency-cruiser feature-sliced preset', () => {
  it('creates default architecture rules', () => {
    const config = createFeatureSlicedDependencyCruiserConfig()

    expect(config.options.tsConfig.fileName).toBe('./tsconfig.json')
    expect(config.forbidden.map((rule) => rule.name)).toEqual([
      'no-circular',
      'no-components-import-views',
      'api-calls-only-from-services',
      'stores-through-services',
      'no-cross-feature-deep-import',
      'generated-client-isolation',
      'shared-components-domain-agnostic',
      'shared-layer-does-not-import-features',
    ])
    expect(
      config.forbidden.find((rule) => rule.name === 'generated-client-isolation')?.to.path,
    ).toBe('^src/shared/services/api/generated/')
  })

  it('accepts multiple generated-client roots and service adapter paths', () => {
    const rules = createFeatureSlicedDependencyCruiserForbiddenRules({
      featuresPath: 'app/features',
      sharedPath: 'app/shared',
      serviceAdapterPaths: ['app/features/*/api', 'app/shared/api-adapters'],
      generatedClientPaths: ['app/generated/blueshell', 'app/generated/discord'],
      ruleSeverity: 'warn',
    })

    const generatedIsolation = rules.find((rule) => rule.name === 'generated-client-isolation')
    const apiAccess = rules.find((rule) => rule.name === 'api-calls-only-from-services')

    expect(generatedIsolation?.severity).toBe('warn')
    expect(generatedIsolation?.to.path).toBe(
      '(?:^app/generated/blueshell/|^app/generated/discord/)',
    )
    expect(generatedIsolation?.from.pathNot).toBe(
      '(?:^app/features/[^/]+/api/|^app/shared/api-adapters/)',
    )
    expect(apiAccess?.from.path).toBe('^app/features/[^/]+/(?!services/)')
  })
})
