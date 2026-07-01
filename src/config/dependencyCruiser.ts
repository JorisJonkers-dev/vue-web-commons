export type DependencyCruiserRuleSeverity = 'error' | 'warn' | 'info' | 'ignore'

export interface DependencyCruiserPathMatcher {
  path?: string
  pathNot?: string
  circular?: boolean
}

export interface DependencyCruiserForbiddenRule {
  name: string
  severity: DependencyCruiserRuleSeverity
  comment?: string
  from: DependencyCruiserPathMatcher
  to: DependencyCruiserPathMatcher
}

export interface DependencyCruiserConfig {
  forbidden: DependencyCruiserForbiddenRule[]
  options: {
    doNotFollow: { path: string }
    tsPreCompilationDeps: boolean
    tsConfig: { fileName: string }
    enhancedResolveOptions: {
      exportsFields: string[]
      conditionNames: string[]
    }
    reporterOptions: {
      dot: {
        collapsePattern: string
      }
    }
  }
}

export interface FeatureSlicedDependencyCruiserOptions {
  featuresPath?: string
  sharedPath?: string
  sharedComponentsPath?: string
  serviceAdapterPaths?: string[]
  generatedClientPaths?: string[]
  tsConfigFileName?: string
  ruleSeverity?: DependencyCruiserRuleSeverity
}

interface RequiredFeatureSlicedOptions {
  featuresPath: string
  sharedPath: string
  sharedComponentsPath: string
  serviceAdapterPaths: string[]
  generatedClientPaths: string[]
  tsConfigFileName: string
  ruleSeverity: DependencyCruiserRuleSeverity
}

export function createFeatureSlicedDependencyCruiserConfig(
  options: FeatureSlicedDependencyCruiserOptions = {},
): DependencyCruiserConfig {
  return {
    forbidden: createFeatureSlicedDependencyCruiserForbiddenRules(options),
    options: {
      doNotFollow: {
        path: 'node_modules',
      },
      tsPreCompilationDeps: true,
      tsConfig: {
        fileName: options.tsConfigFileName ?? './tsconfig.json',
      },
      enhancedResolveOptions: {
        exportsFields: ['exports'],
        conditionNames: ['import', 'require', 'node', 'default'],
      },
      reporterOptions: {
        dot: {
          collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
        },
      },
    },
  }
}

export function createFeatureSlicedDependencyCruiserForbiddenRules(
  options: FeatureSlicedDependencyCruiserOptions = {},
): DependencyCruiserForbiddenRule[] {
  const config = normalizeOptions(options)
  const featuresPath = pathPrefixPattern(config.featuresPath)
  const sharedPath = pathPrefixPattern(config.sharedPath)
  const sharedComponentsPath = pathPrefixPattern(config.sharedComponentsPath)
  const generatedClientPath = alternatives(config.generatedClientPaths.map(pathPrefixPattern))
  const serviceAdapterPath = alternatives(config.serviceAdapterPaths.map(pathPrefixPattern))

  return [
    {
      name: 'no-circular',
      severity: config.ruleSeverity,
      comment: 'No circular imports allowed',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-components-import-views',
      severity: config.ruleSeverity,
      comment: 'Feature components must not import from feature views',
      from: {
        path: `${featuresPath}[^/]+/components/`,
      },
      to: {
        path: `${featuresPath}[^/]+/views/`,
      },
    },
    {
      name: 'api-calls-only-from-services',
      severity: config.ruleSeverity,
      comment: 'API runtime and generated clients should be reached through service adapters',
      from: {
        path: `${featuresPath}[^/]+/(?!services/)`,
        pathNot: serviceAdapterPath,
      },
      to: {
        path: generatedClientPath,
      },
    },
    {
      name: 'stores-through-services',
      severity: config.ruleSeverity,
      comment: 'Stores must not directly call generated API clients',
      from: {
        path: `${featuresPath}[^/]+/stores/`,
      },
      to: {
        path: generatedClientPath,
      },
    },
    {
      name: 'no-cross-feature-deep-import',
      severity: config.ruleSeverity,
      comment: 'Features must use barrel exports for cross-feature access',
      from: {
        path: `${featuresPath}([^/]+)/`,
      },
      to: {
        path: `${featuresPath}(?!$1/)[^/]+/(?!index\\.ts$)`,
      },
    },
    {
      name: 'generated-client-isolation',
      severity: config.ruleSeverity,
      comment: 'Only service adapters may import generated API clients',
      from: {
        pathNot: serviceAdapterPath,
      },
      to: {
        path: generatedClientPath,
      },
    },
    {
      name: 'shared-components-domain-agnostic',
      severity: config.ruleSeverity,
      comment: 'Shared components must not import from features',
      from: {
        path: sharedComponentsPath,
      },
      to: {
        path: featuresPath,
      },
    },
    {
      name: 'shared-layer-does-not-import-features',
      severity: config.ruleSeverity,
      comment: 'Shared code must stay domain-agnostic',
      from: {
        path: sharedPath,
      },
      to: {
        path: featuresPath,
      },
    },
  ]
}

function normalizeOptions(
  options: FeatureSlicedDependencyCruiserOptions,
): RequiredFeatureSlicedOptions {
  const sharedPath = options.sharedPath ?? 'src/shared'
  return {
    featuresPath: options.featuresPath ?? 'src/features',
    sharedPath,
    sharedComponentsPath: options.sharedComponentsPath ?? `${sharedPath}/components`,
    serviceAdapterPaths: options.serviceAdapterPaths ?? [
      'src/features/*/services',
      'src/shared/services',
    ],
    generatedClientPaths: options.generatedClientPaths ?? ['src/shared/services/api/generated'],
    tsConfigFileName: options.tsConfigFileName ?? './tsconfig.json',
    ruleSeverity: options.ruleSeverity ?? 'error',
  }
}

function pathPrefixPattern(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const escaped = normalized.split('*').map(escapeRegExp).join('[^/]+')
  return `^${escaped}/`
}

function alternatives(patterns: string[]): string {
  if (patterns.length === 1) return patterns[0]!
  return `(?:${patterns.join('|')})`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
}
