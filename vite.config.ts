import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const external = [
  '@antfu/eslint-config',
  '@playwright/test',
  '@vitejs/plugin-vue',
  'vue',
  'vue-router',
  'pinia',
  '@grafana/faro-web-sdk',
  '@grafana/faro-web-tracing',
  'dependency-cruiser',
  'vite',
  'vitest',
  'vitest/config',
]

export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: 'src',
      exclude: ['src/**/*.test.ts', 'src/__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'api-runtime/index': resolve(__dirname, 'src/api-runtime/index.ts'),
        'config/eslint': resolve(__dirname, 'src/config/eslint.ts'),
        'config/index': resolve(__dirname, 'src/config/index.ts'),
        'nginx/index': resolve(__dirname, 'src/nginx/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: 'style',
    },
    rolldownOptions: {
      external,
      checks: {
        pluginTimings: false,
      },
    },
  },
})
