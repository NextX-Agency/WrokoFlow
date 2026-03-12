import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuthStore } from "@/stores/useAuthStore"
import { WrokoFlowLogo } from "@/components/shared/WrokoFlowLogo"
import { Button } from "@/components/ui/button"
import { Sparkles, Zap, Users, ArrowRight, Brain, BarChart3 } from "lucide-react"

export default function LandingPage() {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true })
    }
  }, [session, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <WrokoFlowLogo size={48} />
          <p className="text-sm text-[#A09890]">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) return null // Redirect is happening

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <WrokoFlowLogo size={36} />
          <span className="text-lg font-bold text-[#2D2A26]">WrokoFlow</span>
        </div>
        <Button
          onClick={() => navigate({ to: "/login" })}
          variant="outline"
          className="rounded-xl border-[#E4DDD2] text-[#4A4540] hover:bg-[#F0EBE3]"
        >
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#B07C4F]/10 text-[#B07C4F] px-4 py-1.5 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Native Project Management
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#2D2A26] leading-tight tracking-tight">
            The workflow tool that{" "}
            <span className="text-[#B07C4F]">actually works</span>
            <br />
            — with AI, not against it.
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-[#7A7267] max-w-lg mx-auto leading-relaxed">
            Bring your own AI key — let it create tasks, build schedules, fix problems, 
            and automate your entire workflow. No more manual grunt work.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="h-12 px-8 bg-[#B07C4F] hover:bg-[#9A6A40] text-white rounded-xl text-base font-semibold shadow-lg shadow-[#B07C4F]/20 transition-all hover:shadow-xl hover:shadow-[#B07C4F]/30 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-[#A09890]">Free — bring your own API key</p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mt-20 px-4">
          <FeatureCard
            icon={Brain}
            title="AI That Acts"
            description="Natural language commands that create tasks, build schedules, and fix overdue items automatically."
          />
          <FeatureCard
            icon={Zap}
            title="Smart Automations"
            description="AI-generated workflow rules — no manual setup. Your project runs itself."
          />
          <FeatureCard
            icon={BarChart3}
            title="Data Dump → Tasks"
            description="Paste raw text, spreadsheets, or bullet lists — AI converts them into organized tasks instantly."
          />
        </div>

        {/* Social proof / differentiator */}
        <div className="mt-16 mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#A09890]">
            <Users className="w-4 h-4" />
            Works with Gemini, OpenAI, Groq & OpenRouter — all free tiers supported
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-[#E4DDD2]">
        <p className="text-sm text-[#A09890]">
          Built by <span className="text-[#7A7267] font-medium">Leonardo Ranoesendjojo</span> · NextX Agencies
        </p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-[#E4DDD2] shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-[#B07C4F]/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#B07C4F]" />
      </div>
      <h3 className="font-semibold text-[#2D2A26] mb-2">{title}</h3>
      <p className="text-sm text-[#7A7267] leading-relaxed">{description}</p>
    </div>
  )
}
