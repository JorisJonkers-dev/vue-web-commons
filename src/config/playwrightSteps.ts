import type { ESLint, Linter, Rule } from 'eslint'

/**
 * A Playwright journey longer than a few actions names each stage with test.step, so a failure says
 * which stage broke (workspace docs/testing-standards.md, section 4).
 */

const DEFAULT_MAX = 8

type Node = Rule.Node & { type: string }

/** Whether a call is test(...) or test.only(...), the calls that declare a Playwright test. */
function declaresTest(callee: Rule.Node['parent'] | Node): boolean {
  if (callee?.type === 'Identifier') return callee.name === 'test'
  return (
    callee?.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'test' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'only'
  )
}

/** The function body of a Playwright test declaration, or undefined for any other call. */
function testBody(
  node: Rule.Node & { type: 'CallExpression' },
): (Rule.Node & { body: { type: 'BlockStatement'; body: Rule.Node[] } }) | undefined {
  const body = node.arguments[1]
  const isTest = declaresTest(node.callee as Node) && body !== undefined && 'body' in body
  return isTest && body.body.type === 'BlockStatement' ? (body as never) : undefined
}

export const journeySteps: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require test.step in a Playwright test with many awaited actions.' },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const max: number = (context.options[0] as { max?: number } | undefined)?.max ?? DEFAULT_MAX
    return {
      CallExpression(node) {
        const body = testBody(node)
        if (!body) return
        const awaited = body.body.body.filter(
          (s) => s.type === 'ExpressionStatement' && s.expression.type === 'AwaitExpression',
        ).length
        if (awaited <= max || context.sourceCode.getText(body).includes('test.step(')) return
        context.report({
          node,
          message: `This journey takes ${awaited} awaited actions without naming a stage: wrap each stage in test.step('…') (more than ${max}).`,
        })
      },
    }
  },
}

/** The plugin holding the estate's testing rules. */
export const testingPlugin: ESLint.Plugin = { rules: { 'journey-steps': journeySteps } }

/** A flat config block turning journey-steps on for a repository's Playwright specs. */
export function playwrightStepsConfig(
  options: { files?: string[]; max?: number } = {},
): Linter.Config {
  return {
    files: options.files ?? ['**/e2e/**/*.spec.ts', '**/tests/e2e/**/*.ts'],
    plugins: { 'jorisjonkers-testing': testingPlugin },
    rules: { 'jorisjonkers-testing/journey-steps': ['error', { max: options.max ?? DEFAULT_MAX }] },
  }
}
