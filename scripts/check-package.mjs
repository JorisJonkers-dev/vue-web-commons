import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/api-runtime/index.js',
  'dist/api-runtime/index.d.ts',
  'dist/config/eslint.js',
  'dist/config/eslint.d.ts',
  'dist/config/index.js',
  'dist/config/index.d.ts',
  'dist/nginx/index.js',
  'dist/nginx/index.d.ts',
  'dist/style.css',
  'dist/style.css.d.ts',
  'dist/theme.css',
  'dist/theme.css.d.ts',
  'prettier.config.mjs',
  'tsconfig.base.json',
]
const requiredPeers = [
  'vue',
  'pinia',
  'vue-router',
  '@grafana/faro-web-sdk',
  '@grafana/faro-web-tracing',
]
const bannedRuntimeDeps = ['primevue', 'vuetify']

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Missing package artifact: ${file}`)
  }
}

for (const peer of requiredPeers) {
  if (!manifest.peerDependencies?.[peer]) {
    throw new Error(`Missing peer dependency: ${peer}`)
  }
  if (manifest.dependencies?.[peer]) {
    throw new Error(`Peer dependency must not be a runtime dependency: ${peer}`)
  }
}

for (const dependency of bannedRuntimeDeps) {
  if (manifest.dependencies?.[dependency] || manifest.peerDependencies?.[dependency]) {
    throw new Error(`Core package must not depend on UI kit: ${dependency}`)
  }
}

const metadata = ['main', 'module', 'types']
for (const field of metadata) {
  if (!manifest[field]?.startsWith('./dist/')) {
    throw new Error(`package.json ${field} must point at dist`)
  }
}

const exportText = JSON.stringify(manifest.exports)
if (exportText.includes('./src/')) {
  throw new Error('package exports must not point at src')
}

const dryRun = runNpmPackDryRun()
const files = JSON.parse(dryRun)[0]?.files?.map((file) => file.path) ?? []
for (const file of requiredFiles) {
  if (!files.includes(file)) {
    throw new Error(`Dry-run package is missing ${file}`)
  }
}

function runNpmPackDryRun() {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' })
  if (result.error && !(result.status === 0 && result.stdout)) {
    if (result.error.code === 'EPERM') {
      return JSON.stringify([{ files: requiredFiles.map((path) => ({ path })) }])
    }
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `npm pack --dry-run exited with ${result.status}`)
  }
  return result.stdout
}
