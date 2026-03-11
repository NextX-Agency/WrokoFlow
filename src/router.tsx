import { lazy, Suspense } from "react"
import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { useAuthStore } from "@/stores/useAuthStore"

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/pages/LoginPage"))
const BoardPage = lazy(() => import("@/pages/BoardPage"))
const ListPage = lazy(() => import("@/pages/ListPage"))
const CalendarPage = lazy(() => import("@/pages/CalendarPage"))
const TimelinePage = lazy(() => import("@/pages/TimelinePage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const TrainingPage = lazy(() => import("@/pages/TrainingPage"))
const AttendancePage = lazy(() => import("@/pages/AttendancePage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))
const AutomationPage = lazy(() => import("@/pages/AutomationPage"))
const InviteAcceptPage = lazy(() => import("@/pages/InviteAcceptPage"))

// Loading fallback
function PageLoader() {
  return <LoadingSkeleton variant="board" />
}

// Root route — just renders Outlet
const rootRoute = createRootRoute({
  component: Outlet,
})

// Login
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: function LoginRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    )
  },
})

// Invite accept (public — no auth required, page handles sign-in)
const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$code",
  component: function InviteRouteComponent() {
    const { code } = inviteRoute.useParams()
    return (
      <Suspense fallback={<PageLoader />}>
        <InviteAcceptPage code={code} />
      </Suspense>
    )
  },
})

// Authenticated layout wrapper
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: function AppLayoutRoute() {
    return <AppLayout />
  },
  beforeLoad: () => {
    const { session } = useAuthStore.getState()
    if (!session) {
      throw redirect({ to: "/login" })
    }
  },
})

// Dashboard (index)
const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/",
  component: function DashboardRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <DashboardPage />
      </Suspense>
    )
  },
})

// Board
const boardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/board",
  component: function BoardRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <BoardPage />
      </Suspense>
    )
  },
})

// List
const listRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/list",
  component: function ListRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <ListPage />
      </Suspense>
    )
  },
})

// Calendar
const calendarRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/calendar",
  component: function CalendarRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <CalendarPage />
      </Suspense>
    )
  },
})

// Timeline
const timelineRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/timeline",
  component: function TimelineRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <TimelinePage />
      </Suspense>
    )
  },
})

// Training
const trainingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/training",
  component: function TrainingRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <TrainingPage />
      </Suspense>
    )
  },
})

// Attendance
const attendanceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/attendance",
  component: function AttendanceRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <AttendancePage />
      </Suspense>
    )
  },
})

// Settings
const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: function SettingsRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <SettingsPage />
      </Suspense>
    )
  },
})

// Automations
const automationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/automations",
  component: function AutomationRouteComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <AutomationPage />
      </Suspense>
    )
  },
})

// Build route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  inviteRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    boardRoute,
    listRoute,
    calendarRoute,
    timelineRoute,
    trainingRoute,
    attendanceRoute,
    settingsRoute,
    automationRoute,
  ]),
])

// Create router
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
})

// Type declarations
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
