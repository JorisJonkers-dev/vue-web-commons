import { cpSync, existsSync, rmSync } from 'node:fs'

if (existsSync('dist/src')) {
  cpSync('dist/src', 'dist', { recursive: true })
  rmSync('dist/src', { recursive: true, force: true })
}
