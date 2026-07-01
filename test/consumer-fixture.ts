import type { ProblemDetail, Toast } from '@jorisjonkers-dev/vue-web-commons'

import {
  BaseButton,
  decodeJwt,
  initFaro,
  useMutationState,
} from '@jorisjonkers-dev/vue-web-commons'
import {
  createApiFetch,
  createHeyApiRuntimeConfig,
} from '@jorisjonkers-dev/vue-web-commons/api-runtime'
import {
  createFeatureSlicedDependencyCruiserConfig,
  createVueTsConfig,
  vueEslintConfig,
} from '@jorisjonkers-dev/vue-web-commons/config'
import createVueEslintConfig from '@jorisjonkers-dev/vue-web-commons/eslint'
import { createUnprivilegedSpaNginxConfig } from '@jorisjonkers-dev/vue-web-commons/nginx'
import '@jorisjonkers-dev/vue-web-commons/style.css'
import '@jorisjonkers-dev/vue-web-commons/theme.css'

const mutation = useMutationState()
const mutationPending = mutation.pending.value

const toast: Toast = {
  id: 1,
  kind: 'success',
  title: 'Saved',
  durationMs: 5_000,
}

const problem: ProblemDetail = {
  type: 'about:blank',
  title: 'Fixture',
  status: 200,
}

const payload = decodeJwt('eyJhbGciOiJub25lIn0.eyJzdWIiOiJmaXh0dXJlIn0.')
void initFaro({})
const apiFetch = createApiFetch({ baseUrl: '/api' })
const heyApiConfig = createHeyApiRuntimeConfig({ throwOnError: false }, { baseUrl: '/api' })
const dependencyCruiserConfig = createFeatureSlicedDependencyCruiserConfig({
  generatedClientPaths: ['src/generated/client'],
})
const eslintConfig = createVueEslintConfig()
const eslintConfigFromBarrel = vueEslintConfig()
const tsConfig = createVueTsConfig()
const nginxConfig = createUnprivilegedSpaNginxConfig({ healthz: true })

export {
  apiFetch,
  BaseButton,
  dependencyCruiserConfig,
  eslintConfig,
  eslintConfigFromBarrel,
  heyApiConfig,
  mutation,
  mutationPending,
  nginxConfig,
  payload,
  problem,
  toast,
  tsConfig,
}
