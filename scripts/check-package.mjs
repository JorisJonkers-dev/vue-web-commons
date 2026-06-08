import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const requiredFiles = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/style.css',
  'dist/style.css.d.ts',
  'dist/theme.css',
  'dist/theme.css.d.ts',
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

const dryRun = execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' })
const files = JSON.parse(dryRun)[0]?.files?.map((file) => file.path) ?? []
for (const file of requiredFiles) {
  if (!files.includes(file)) {
    throw new Error(`Dry-run package is missing ${file}`)
  }
}
