import type { ProblemDetail, Toast } from '@extratoast/vue-web-commons'

import {
  BaseButton,
  decodeJwt,
  initFaro,
  useMutationState,
} from '@extratoast/vue-web-commons'
import '@extratoast/vue-web-commons/style.css'
import '@extratoast/vue-web-commons/theme.css'

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

export { BaseButton, mutation, mutationPending, payload, problem, toast }
