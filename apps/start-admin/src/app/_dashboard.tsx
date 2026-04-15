import { createFileRoute, Outlet, redirect, useMatches } from '@tanstack/react-router'
import AppLayout from '../components/layouts/AppLayout'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({
        to: '/login',
        search: {
          callbackUrl: location.href,
        },
      })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const matches = useMatches()
  const disableMainWrapper = matches.some((match) => (match.staticData as any)?.disableMainWrapper)

  return (
    <AppLayout disableMainWrapper={disableMainWrapper}>
      <Outlet />
    </AppLayout>
  )
}

