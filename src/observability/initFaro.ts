export interface InitFaroOptions {
  appName?: string | undefined
  appVersion?: string | undefined
  environment?: string | undefined
  otlpUrl?: string | null | undefined
}

let initialised = false

export async function initFaro(options: InitFaroOptions = {}): Promise<void> {
  if (initialised) return
  if (typeof window === 'undefined') return
  if (!options.otlpUrl) return

  try {
    const [sdk, tracing] = await Promise.all([import('@grafana/faro-web-sdk'), import('@grafana/faro-web-tracing')])
    const { initializeFaro, getWebInstrumentations } = sdk
    const { TracingInstrumentation } = tracing

    initializeFaro({
      url: options.otlpUrl,
      app: {
        name: options.appName ?? 'vue-app',
        version: options.appVersion ?? 'latest',
        environment: options.environment ?? 'production',
      },
      instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
      sessionTracking: { enabled: true },
    })
    initialised = true
  } catch (err) {
    console.warn('[observability] failed to initialize Faro:', err)
  }
}

export function resetFaroForTests(): void {
  initialised = false
}
