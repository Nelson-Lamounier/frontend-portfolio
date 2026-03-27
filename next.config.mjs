import rehypePrism from 'rehype-prism-plus'
import nextMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'

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
