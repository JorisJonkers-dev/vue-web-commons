import { RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'
import { journeySteps, playwrightStepsConfig } from '../config/playwrightSteps'

RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } })

/** A test body of n awaited actions. */
function actions(n: number): string {
  return Array.from({ length: n }, (_, i) => `  await page.click('#b${i}')`).join('\n')
}

describe('a Playwright journey names its stages', () => {
  tester.run('journey-steps', journeySteps, {
    valid: [
      {
        name: 'a short test needs no steps',
        code: `test('a short one', async ({ page }) => {\n${actions(8)}\n})`,
      },
      {
        name: 'a long journey with test.step passes',
        code: `test('a long one', async ({ page }) => {\n  await test.step('first stage', async () => {\n${actions(6)}\n  })\n  await test.step('second stage', async () => {\n${actions(6)}\n  })\n})`,
      },
      {
        name: 'the limit can be raised',
        code: `test('a long one', async ({ page }) => {\n${actions(12)}\n})`,
        options: [{ max: 12 }],
      },
      {
        name: 'a call that is not a test is not read',
        code: `describe('a group', async () => {\n${actions(20)}\n})`,
      },
      {
        name: 'a test with no function body is not read',
        code: "test('a fixture-only test', helper)",
      },
    ],
    invalid: [
      {
        name: 'a long journey without steps is refused',
        code: `test('a long one', async ({ page }) => {\n${actions(9)}\n})`,
        errors: [
          {
            message:
              "This journey takes 9 awaited actions without naming a stage: wrap each stage in test.step('…') (more than 8).",
          },
        ],
      },
      {
        name: 'test.only is read as a test',
        code: `test.only('a long one', async ({ page }) => {\n${actions(9)}\n})`,
        errors: 1,
      },
    ],
  })
})

describe('the flat config for Playwright specs', () => {
  it('turns the rule on for e2e specs at the default limit', () => {
    const config = playwrightStepsConfig()
    expect(config.files).toEqual(['**/e2e/**/*.spec.ts', '**/tests/e2e/**/*.ts'])
    expect(config.rules).toEqual({ 'jorisjonkers-testing/journey-steps': ['error', { max: 8 }] })
  })

  it('takes the files and the limit a repository wants', () => {
    const config = playwrightStepsConfig({ files: ['e2e/*.ts'], max: 5 })
    expect(config.files).toEqual(['e2e/*.ts'])
    expect(config.rules).toEqual({ 'jorisjonkers-testing/journey-steps': ['error', { max: 5 }] })
  })
})
