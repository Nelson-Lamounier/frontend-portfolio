import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DashboardPage } from '../components/layouts/DashboardPage'
import MonthView from '../features/calendars/components/MonthView'
import WeekView from '../features/calendars/components/WeekView'
import DayView from '../features/calendars/components/DayView'
import YearView from '../features/calendars/components/YearView'

const calendarSearchSchema = z.object({
  view: z.enum(['day', 'week', 'month', 'year']).catch('month'),
})

export const Route = createFileRoute('/_dashboard/calendar')({
  validateSearch: calendarSearchSchema,
  component: CalendarPage,
})

function CalendarPage() {
  const { view } = Route.useSearch()

  return (
    <DashboardPage
      title="Calendar"
      description="View and manage events across different periods."
    >
      {view === 'month' && <MonthView />}
      {view === 'week' && <WeekView />}
      {view === 'day' && <DayView />}
      {view === 'year' && <YearView />}
    </DashboardPage>
  )
}
