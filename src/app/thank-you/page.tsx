import { type Metadata } from 'next'

import { SimpleLayout } from '@/components/SimpleLayout'

export const metadata: Metadata = {
  title: 'Check your inbox',
  description: 'Thanks for subscribing — please verify your email.',
}

export default function ThankYou() {
  return (
    <SimpleLayout
      title="Check your inbox."
      intro="We've sent you a verification email. Please click the link to confirm your subscription — the link expires in 48 hours. Once verified, you'll hear from me whenever I publish a new article or have something interesting to share. You can unsubscribe at any time, no hard feelings."
    />
  )
}
