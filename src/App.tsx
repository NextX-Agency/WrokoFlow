import { useEffect, useState } from "react"
import { RouterProvider } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/queryClient"
import { router } from "@/router"
import { useAuthStore } from "@/stores/useAuthStore"

function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
      .catch((err) => {
        console.error("Auth initialization failed:", err)
        setError(err?.message || "Failed to initialize authentication")
      })
      .finally(() => setReady(true))
  }, [initialize])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <div className="flex flex-col items-center gap-4">
          <div className="text-red-600">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-red-900">Initialization Error</p>
          <p className="text-sm text-red-700 max-w-md text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600" />
          <p className="text-sm text-gray-400">Loading WrokoFlow...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
