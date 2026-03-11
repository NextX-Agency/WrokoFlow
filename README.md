# WrokoFlow

**Simpler and more automated than Asana.** A modern project management app built to be reusable across any project — with Kanban boards, automation, Google Calendar sync, training tracking, and more.

## Features

- **Kanban Board** — Drag-and-drop task management with customizable lists
- **Multiple Views** — Board, List, Calendar, Timeline (Gantt), and Dashboard
- **Automation Engine** — Create rules to auto-assign tasks, update statuses, detect overdue items
- **Google Calendar Sync** — Sync training sessions to your Google Calendar
- **Training & Attendance** — Track team training sessions and attendance
- **Export** — CSV and Print-ready PDF exports for tasks, trainings, and attendance
- **Real-time Collaboration** — Powered by Supabase Realtime subscriptions
- **File Attachments** — Upload and manage task attachments via Supabase Storage
- **Activity Log** — Full audit trail of all task and project changes
- **Confetti Celebrations** — Fun micro-interactions when completing tasks
- **Mobile Responsive** — Touch-friendly bottom nav, safe-area support
- **Dark Mode Ready** — Theme preference stored per project

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Routing | TanStack Router |
| Data | TanStack Query + Supabase |
| State | Zustand |
| Drag & Drop | dnd-kit |
| Charts | Recharts |
| Calendar | react-big-calendar |
| Timeline | gantt-task-react |

## Getting Started

### Prerequisites

- Node.js 22.12+ (or 20.19+)
- pnpm
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone <repo-url> wrokoflow
cd wrokoflow
pnpm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Run Database Migrations

Apply the SQL migrations in order from `supabase/migrations/`:

1. `001_schema.sql` — Core tables (projects, members, lists, tasks, comments, attachments, activity_log)
2. `002_storage.sql` — Storage bucket and policies
3. `003_triggers.sql` — Automatic timestamps, position ordering, activity logging triggers
4. `004_training.sql` — Training sessions and attendance tracking
5. `005_automation_rules.sql` — Automation rules, logs, and project settings

### 4. Configure Google OAuth (optional)

1. Create a Google Cloud project and enable the Calendar API
2. Configure OAuth consent screen with `calendar.events` scope
3. Add your domain to authorized origins/redirects
4. Set `VITE_GOOGLE_CLIENT_ID` in `.env`
5. Configure Google as an auth provider in your Supabase dashboard

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### 6. Build for Production

```bash
pnpm build
```

Output goes to `dist/`. The build uses Rollup manual chunks to split vendor bundles (recharts, supabase, calendar, router, dnd-kit, date-fns, react-query) for optimal caching.

## Deployment

### Vercel (recommended)

The project includes a `vercel.json` with SPA rewrites configured. Just connect your repo to Vercel and set the environment variables.

### Other Platforms

Any static hosting that supports SPA routing will work. Point the server to `dist/index.html` for all routes.

## Project Structure

```
src/
├── components/
│   ├── board/          # Kanban board components (TaskCard, BoardColumn)
│   ├── layout/         # AppLayout, Sidebar, MobileNav, Header
│   ├── shared/         # Reusable components (TaskDetailPanel, EmptyState, etc.)
│   └── ui/             # shadcn/ui primitives
├── hooks/              # React Query hooks (useTasks, useLists, useMembers, etc.)
├── lib/                # Utilities (supabase client, export, automation engine, confetti)
├── pages/              # Route page components (lazy-loaded)
├── stores/             # Zustand stores (auth, UI)
├── types/              # TypeScript type definitions
└── router.tsx          # TanStack Router configuration
supabase/
└── migrations/         # SQL migration files
```

## License

MIT
