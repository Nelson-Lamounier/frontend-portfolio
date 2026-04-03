/**
 * Root Application Layout
 *
 * Minimal shell providing the HTML document structure, global CSS import,
 * theme/session providers, and cookie consent banner.
 *
 * Public pages get their Header/Footer from `(site)/layout.tsx`.
 * Admin pages get their sidebar shell from `admin/(authenticated)/layout.tsx`.
 * This root layout intentionally contains NO visual chrome.
 */

import { type Metadata } from 'next'

import { Providers } from '@/app/providers'
import { CookieConsent } from '@/components/analytics'

import '@/styles/tailwind.css'

export const metadata: Metadata = {
  title: {
    template: '%s - Nelson Lamounier',
    default:
      'Expert Cloud infrastructure builder & AWS problem solver. Explore deep-dive DevOps tutorials and engineering projects. Build better cloud systems today.',
  },
  description:
    "I'm Nelson, an AWS Certified DevOps Engineer Professional based in Dublin. I architect secure, cost-optimised multi-environment infrastructures using AWS CDK and containerisation. Beyond the build, I'm a passionate educator—breaking down complex AWS concepts into digestible tutorials (and yes, memorable study songs).",
  alternates: {
    types: {
      'application/rss+xml': `${process.env.NEXT_PUBLIC_SITE_URL}/feed.xml`,
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
