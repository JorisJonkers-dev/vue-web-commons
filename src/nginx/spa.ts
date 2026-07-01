export interface SpaNginxOptions {
  listenPort?: number
  serverName?: string
  root?: string
  indexPath?: string
  fallbackPath?: string
  assetPrefix?: string
  assetMaxAgeSeconds?: number
  staticMaxAgeSeconds?: number
  staticExtensions?: string[]
  healthz?:
    | boolean
    | {
        path?: string
        body?: string
      }
  gzip?:
    | boolean
    | {
        static?: boolean
        minLength?: number
        compLevel?: number
        proxied?: string
        types?: string[]
      }
}

const defaultGzipTypes = [
  'text/plain',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/wasm',
  'image/svg+xml',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
]

const defaultStaticExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'ico', 'txt', 'xml']

export function createSpaNginxConfig(options: SpaNginxOptions = {}): string {
  const listenPort = options.listenPort ?? 80
  const serverName = options.serverName ?? '_'
  const root = options.root ?? '/usr/share/nginx/html'
  const indexPath = normalizeLocationPath(options.indexPath ?? '/index.html')
  const fallbackPath = normalizeLocationPath(options.fallbackPath ?? '/index.html')
  const assetPrefix = normalizeLocationPath(options.assetPrefix ?? '/assets/')
  const assetMaxAgeSeconds = options.assetMaxAgeSeconds ?? 31_536_000
  const staticMaxAgeSeconds = options.staticMaxAgeSeconds ?? 2_592_000
  const staticExtensions = options.staticExtensions ?? defaultStaticExtensions

  return `${[
    'server {',
    indent(`listen ${listenPort};`),
    indent(`server_name ${serverName};`),
    indent(`root ${root};`),
    indent('index index.html;'),
    '',
    renderGzip(options.gzip ?? true),
    '',
    indent(`location ^~ ${assetPrefix} {`),
    indent('try_files $uri =404;', 2),
    indent('access_log off;', 2),
    indent(
      `add_header Cache-Control "public, max-age=${assetMaxAgeSeconds}, immutable" always;`,
      2,
    ),
    indent('}'),
    '',
    indent(`location ~* \\.(${staticExtensions.map(escapeNginxRegex).join('|')})$ {`),
    indent('try_files $uri =404;', 2),
    indent(`add_header Cache-Control "public, max-age=${staticMaxAgeSeconds}" always;`, 2),
    indent('}'),
    '',
    renderHealthz(options.healthz),
    '',
    indent(`location = ${indexPath} {`),
    indent(`try_files ${indexPath} =404;`, 2),
    indent('add_header Cache-Control "no-cache, no-store, must-revalidate" always;', 2),
    indent('add_header Pragma "no-cache" always;', 2),
    indent('add_header Expires "0" always;', 2),
    indent('}'),
    '',
    indent('location / {'),
    indent('add_header Cache-Control "no-cache" always;', 2),
    indent(`try_files $uri $uri/ ${fallbackPath};`, 2),
    indent('}'),
    '}',
  ]
    .filter((line) => line !== null)
    .join('\n')}\n`
}

export function createPrivilegedSpaNginxConfig(options: SpaNginxOptions = {}): string {
  return createSpaNginxConfig({
    listenPort: 80,
    ...options,
  })
}

export function createUnprivilegedSpaNginxConfig(options: SpaNginxOptions = {}): string {
  return createSpaNginxConfig({
    listenPort: 8080,
    ...options,
  })
}

function renderGzip(gzip: SpaNginxOptions['gzip']): string {
  if (gzip === false) return indent('gzip off;')
  const options = typeof gzip === 'object' ? gzip : {}
  const gzipTypes = options.types ?? defaultGzipTypes
  return [
    indent('gzip on;'),
    ...((options.static ?? true) ? [indent('gzip_static on;')] : []),
    indent('gzip_vary on;'),
    indent(`gzip_min_length ${options.minLength ?? 256};`),
    indent(`gzip_comp_level ${options.compLevel ?? 6};`),
    indent(`gzip_proxied ${options.proxied ?? 'any'};`),
    indent('gzip_types'),
    ...gzipTypes.map((type) => indent(type, 2)),
    indent(';'),
  ].join('\n')
}

function renderHealthz(healthz: SpaNginxOptions['healthz']): string | null {
  if (!healthz) return null
  const path = normalizeLocationPath(
    typeof healthz === 'object' ? (healthz.path ?? '/healthz') : '/healthz',
  )
  const body = typeof healthz === 'object' ? (healthz.body ?? 'ok') : 'ok'
  return [
    indent(`location = ${path} {`),
    indent(`return 200 "${escapeNginxString(body)}";`, 2),
    indent('add_header Content-Type text/plain;', 2),
    indent('}'),
  ].join('\n')
}

function normalizeLocationPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function indent(value: string, level = 1): string {
  return `${'  '.repeat(level)}${value}`
}

function escapeNginxRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeNginxString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
