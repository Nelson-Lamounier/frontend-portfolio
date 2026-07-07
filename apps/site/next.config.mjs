import nextMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  // Standalone output for ECS container deployments
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nelsonlamounier.com',
      },
    ],
  },

  // Proxy Faro telemetry locally to bypass CORS
  async rewrites() {
    return [
      {
        source: '/log-proxy',
        destination: 'https://ops.nelsonlamounier.com/faro/collect',
      },
      // Proxy local admin app on port 3001 auth endpoints
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:3001/admin/api/auth/:path*',
      },
      // Proxy local admin app on port 3001
      {
        source: '/admin/:path*',
        destination: 'http://localhost:3001/admin/:path*',
      },
      // Article media by shot-list ID: files committed under public/ win
      // (Next checks the filesystem before afterFiles rewrites); anything
      // else streams from S3 via the public-api BFF — the pod holds no AWS
      // credentials.
      {
        source: '/images/articles/:file',
        destination: `${process.env.PUBLIC_API_URL || 'http://public-api.public-api:3001'}/api/articles/images/:file`,
      },
    ]
  },

  // instrumentationHook is built-in since Next.js 15.5 — no longer needed

  // Prevent Next.js from bundling gRPC native modules (used by OTLP exporter)
  serverExternalPackages: [
    '@opentelemetry/instrumentation',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-grpc',
    '@grpc/grpc-js',
    'prom-client',
  ],
}

// Next 16 / Turbopack requires MDX plugin options to be serializable, so remark
// and rehype plugins are referenced by module name (strings) rather than imported
// functions. See https://nextjs.org/docs/app/api-reference/config/next-config-js/mdx
const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [['remark-gfm']],
    rehypePlugins: [['rehype-prism-plus']],
  },
})

export default withMDX(nextConfig)
