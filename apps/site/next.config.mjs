import rehypePrism from 'rehype-prism-plus'
import nextMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/shared'],
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

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypePrism],
  },
})

export default withMDX(nextConfig)
