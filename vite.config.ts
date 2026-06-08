import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const external = [
  'vue',
  'vue-router',
  'pinia',
  '@grafana/faro-web-sdk',
  '@grafana/faro-web-tracing',
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
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      external,
    },
  },
})
