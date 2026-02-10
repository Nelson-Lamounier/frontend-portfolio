/**
 * Next.js Instrumentation Hook — OpenTelemetry + AWS X-Ray
 *
 * This file runs once when the Next.js server starts.
 * It initializes OpenTelemetry with:
 * - AWS X-Ray ID generator & propagator
 * - OTLP/gRPC exporter (sends to ADOT Collector sidecar on localhost:4317)
 * - Auto-instrumentation for @aws-sdk/* (DynamoDB, etc.)
 * - AWS resource detector (ECS task metadata)
 *
 * The SDK auto-patches @aws-sdk calls — no code changes needed in
 * dynamodb-articles.ts or article-service.ts.
 *
 * Environment Variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Collector endpoint (default: http://localhost:4317)
 * - OTEL_SERVICE_NAME: Service name in X-Ray (default: nextjs-portfolio)
 * - OTEL_SDK_DISABLED: Set to 'true' to disable tracing (default: false)
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only instrument on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Skip if explicitly disabled (e.g. local development)
    if (process.env.OTEL_SDK_DISABLED === 'true') {
      console.log('[OTel] Tracing disabled via OTEL_SDK_DISABLED=true')
      return
    }

    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node')
      const { getNodeAutoInstrumentations } = await import(
        '@opentelemetry/auto-instrumentations-node'
      )
      const { OTLPTraceExporter } = await import(
        '@opentelemetry/exporter-trace-otlp-grpc'
      )
      const { AWSXRayIdGenerator } = await import(
        '@opentelemetry/id-generator-aws-xray'
      )
      const { AWSXRayPropagator } = await import(
        '@opentelemetry/propagator-aws-xray'
      )
      const { awsEcsDetector } = await import(
        '@opentelemetry/resource-detector-aws'
      )

      const serviceName = process.env.OTEL_SERVICE_NAME || 'nextjs-portfolio'

      const sdk = new NodeSDK({
        // Service identity
        serviceName,

        // Send traces to ADOT Collector sidecar via OTLP/gRPC
        traceExporter: new OTLPTraceExporter({
          url:
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
            'http://localhost:4317',
        }),

        // AWS X-Ray–compatible trace/span IDs
        idGenerator: new AWSXRayIdGenerator(),

        // Propagate X-Ray trace context across service boundaries
        textMapPropagator: new AWSXRayPropagator(),

        // Auto-detect ECS task metadata (cluster, task ID, container)
        resourceDetectors: [awsEcsDetector],

        // Auto-instrument @aws-sdk/* (DynamoDB, S3, etc.)
        // Disable noisy instrumentations we don't need
        instrumentations: [
          getNodeAutoInstrumentations({
            // Enable AWS SDK instrumentation (captures DynamoDB queries)
            '@opentelemetry/instrumentation-aws-sdk': {
              suppressInternalInstrumentation: true,
            },
            // Enable HTTP instrumentation for Next.js requests
            '@opentelemetry/instrumentation-http': {
              enabled: true,
            },
            // Disable instrumentations that add noise
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
            '@opentelemetry/instrumentation-net': { enabled: false },
          }),
        ],
      })

      sdk.start()
      console.log(`[OTel] ✅ Tracing initialized (service: ${serviceName})`)

      // Graceful shutdown on process exit
      const shutdown = () => {
        sdk.shutdown().catch(console.error)
      }
      process.on('SIGTERM', shutdown)
      process.on('SIGINT', shutdown)
    } catch (error) {
      // Non-fatal — app continues without tracing
      console.warn('[OTel] ⚠️ Failed to initialize tracing:', error)
    }
  }
}
