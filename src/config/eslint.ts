import antfu from '@antfu/eslint-config'

export type VueEslintConfigOptions = NonNullable<Parameters<typeof antfu>[0]>
export type VueEslintUserConfig = Parameters<typeof antfu>[1]

const machineAuthoredYamlGlobs = [
  '.github/**/*.y?(a)ml',
  '**/generated/**/*.y?(a)ml',
  '**/__generated__/**/*.y?(a)ml',
]

export function createVueEslintConfig(
  options: VueEslintConfigOptions = {},
  ...userConfigs: VueEslintUserConfig[]
): ReturnType<typeof antfu> {
  const { ignores, ...restOptions } = options
  const defaultIgnores = ['dist', 'node_modules', 'coverage', '.council']

  return antfu(
    {
      vue: true,
      typescript: true,
      formatters: false,
      ignores:
        typeof ignores === 'function'
          ? ignores(defaultIgnores)
          : [...defaultIgnores, ...(ignores ?? [])],
      ...restOptions,
    },
    {
      rules: {
        'style/brace-style': ['error', '1tbs'],
        'style/arrow-parens': ['error', 'always'],
        'style/quotes': ['error', 'single', { avoidEscape: true }],
        'style/quote-props': ['error', 'as-needed'],
        'style/indent': 'off',
        'style/operator-linebreak': 'off',
        'style/member-delimiter-style': [
          'error',
          { multiline: { delimiter: 'none' }, singleline: { delimiter: 'semi' } },
        ],
        'antfu/if-newline': 'off',
        'no-console': 'error',
        'ts/no-explicit-any': 'error',
        'ts/explicit-function-return-type': [
          'error',
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
          },
        ],
        'ts/consistent-type-assertions': 'off',
      },
    },
    {
      files: ['**/*.vue'],
      rules: {
        'vue/define-emits-declaration': 'error',
        'vue/define-props-declaration': 'error',
        'vue/no-required-prop-with-default': 'error',
        'vue/require-prop-types': 'error',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/html-closing-bracket-newline': 'off',
        'vue/html-indent': 'off',
        'vue/html-self-closing': [
          'error',
          {
            html: { void: 'any', normal: 'always', component: 'always' },
            svg: 'always',
            math: 'always',
          },
        ],
        'vue/max-len': [
          'error',
          {
            code: 120,
            template: 120,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreHTMLAttributeValues: true,
          },
        ],
      },
    },
    {
      files: ['**/*.test.ts', '**/*.spec.ts', 'test/**', 'scripts/**'],
      rules: {
        'ts/no-explicit-any': 'off',
        'ts/explicit-function-return-type': 'off',
      },
    },
    {
      name: 'vue-web-commons/yaml-machine-authored-style',
      files: machineAuthoredYamlGlobs,
      rules: {
        // Workflows and generated YAML are often emitted by tools or shared CI templates;
        // keep semantic YAML linting, but do not force hand-authored quote/plain-scalar style.
        'yaml/plain-scalar': 'off',
        'yaml/quotes': 'off',
      },
    },
    ...userConfigs,
  )
}

export default createVueEslintConfig
