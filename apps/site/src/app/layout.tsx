/**
 * Root Application Layout
 *
 * Minimal shell providing the HTML document structure, global CSS import,
 * theme providers, and cookie consent banner.
 *
 * Public pages get their Header/Footer from `(site)/layout.tsx`.
 * This root layout intentionally contains NO visual chrome.
 */

import { type Metadata } from 'next'

import { Providers } from '@/app/providers'
import { CookieConsent } from '@/components/analytics'
import { SITE_URL } from '@/lib/site-config'

import '@/styles/tailwind.css'

export const metadata: Metadata = {
  // Base for resolving all relative metadata URLs (OpenGraph images, canonical,
  // alternates). Without this, Next emits a build warning and relative URLs
  // resolve against localhost.
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s - Nelson Lamounier',
    default:
      'Expert Cloud infrastructure builder & AWS problem solver. Explore deep-dive DevOps tutorials and engineering projects. Build better cloud systems today.',
  },
  description:
    "I'm Nelson, an AWS Certified DevOps Engineer Professional based in Dublin. I architect secure, cost-optimised multi-environment infrastructures using AWS CDK and containerisation. Beyond the build, I'm a passionate educator—breaking down complex AWS concepts into digestible tutorials (and yes, memorable study songs).",
  alternates: {
    // Relative — resolved against metadataBase (was `${NEXT_PUBLIC_SITE_URL}/feed.xml`,
    // which emitted `undefined/feed.xml` when the env var was unset).
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
}

/**
 * Root layout — HTML document shell with providers.
 * Contains NO visual chrome (Header, Footer, Sidebar).
 *
 * @param props - Layout props with children
 * @returns Root HTML document
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex h-full bg-zinc-50 dark:bg-black">
        <CookieConsent />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
