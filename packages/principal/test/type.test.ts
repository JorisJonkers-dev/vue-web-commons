import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { generate } from '../scripts/generate'
import { contractJson } from './contract'

const generated = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'principal.gen.ts')

describe('the Principal type', () => {
  // PRINCIPAL_UPDATE=true npm test -w @jorisjonkers-dev/principal
  it('is what the pinned schema generates', () => {
    const want = generate(contractJson('principal.schema.json'))
    if (process.env.PRINCIPAL_UPDATE === 'true') writeFileSync(generated, want)

    expect(readFileSync(generated, 'utf8')).toBe(want)
  })

  it('is not generated for a shape the generator does not know', () => {
    expect(() =>
      generate({ title: 'T', type: 'object', properties: { n: { type: 'number' } } }),
    ).toThrow('no TypeScript type for n')
  })
})
