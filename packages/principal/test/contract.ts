import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The pinned contract, vendored by scripts/pin-contract.sh. */
export const contractDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'contract')

export function contractText(path: string): string {
  return readFileSync(join(contractDir, path), 'utf8')
}

export function contractJson<T>(path: string): T {
  return JSON.parse(contractText(path)) as T
}

/** Every vector of a channel, by name. */
export function vectors<T>(channel: string): Array<[string, T]> {
  return readdirSync(join(contractDir, 'vectors', channel))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace(/\.json$/, ''), contractJson<T>(join('vectors', channel, f))])
}
