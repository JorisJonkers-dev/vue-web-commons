# Quickstart: Round 3 Vue Infrastructure Commons

## Config Presets

```ts
import { createVueViteConfig } from '@jorisjonkers-dev/vue-web-commons/config'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig(createVueViteConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
}))
```

```js
// .dependency-cruiser.cjs
const { createFeatureSlicedDependencyCruiserConfig } = require('@jorisjonkers-dev/vue-web-commons/config')

module.exports = createFeatureSlicedDependencyCruiserConfig({
  generatedClientPaths: ['src/shared/services/api/generated', 'src/services/api/generated'],
})
```

## API Runtime

```ts
import { createApiFetch } from '@jorisjonkers-dev/vue-web-commons/api-runtime'

const apiFetch = createApiFetch({
  baseUrl: '/api',
  credentials: 'include',
  bearerToken: () => sessionStorage.getItem('access_token'),
  csrf: {
    bootstrapPath: '/csrf',
    headerName: 'X-XSRF-TOKEN',
  },
})
```

## Nginx Template

```ts
import { createUnprivilegedSpaNginxConfig } from '@jorisjonkers-dev/vue-web-commons/nginx'

const nginxConf = createUnprivilegedSpaNginxConfig({
  listenPort: 8080,
  healthz: true,
})
```

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run package:check
npm run fixture:check
```
