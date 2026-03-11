import { useAuthStore } from "@/stores/useAuthStore"
import { Button } from "@/components/ui/button"
import { WrokoFlowLogo } from "@/components/shared/WrokoFlowLogo"

export default function LoginPage() {
  const { signInWithGoogle } = useAuthStore()

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#C97C5C] via-[#B07C4F] to-[#8B6340] relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute bottom-32 right-12 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-white/[0.03]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <WrokoFlowLogo size={44} />
            <span className="text-2xl font-bold tracking-tight">WrokoFlow</span>
          </div>
          
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Manage projects{" "}
              <span className="text-[#E8DCC8]">together</span>,{" "}
              effortlessly.
            </h1>
            <p className="text-white/80 text-lg leading-relaxed">
              Collaborate with your team in real-time. Track tasks, manage workflows, 
              and deliver projects with clarity and purpose.
            </p>
            
            <div className="flex items-center gap-6 mt-10">
              <div className="flex flex-col">
                <span className="text-3xl font-bold">100%</span>
                <span className="text-white/60 text-sm">Real-time sync</span>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="flex flex-col">
                <span className="text-3xl font-bold">Team</span>
                <span className="text-white/60 text-sm">Collaboration</span>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="flex flex-col">
                <span className="text-3xl font-bold">Secure</span>
                <span className="text-white/60 text-sm">Role-based access</span>
              </div>
            </div>
          </div>

          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} WrokoFlow. Built with purpose.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-[#FAF8F5] p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <WrokoFlowLogo size={40} />
            <span className="text-xl font-bold text-[#2D2A26]">WrokoFlow</span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-[#2D2A26]">Welcome back</h2>
            <p className="text-[#7A7267]">
              Sign in to your workspace to continue collaborating with your team.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={signInWithGoogle}
              className="w-full h-12 bg-white hover:bg-[#F5F3F0] text-[#2D2A26] border border-[#E4DDD2] shadow-sm rounded-xl font-medium transition-all hover:shadow-md active:scale-[0.99]"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4DDD2]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#FAF8F5] px-4 text-sm text-[#7A7267]">
                  Secure authentication
                </span>
              </div>
            </div>

            <div className="bg-[#F0EBE3] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8DCC8] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-[#B07C4F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#4A4540]">Enterprise-grade security</p>
                  <p className="text-xs text-[#7A7267] mt-1">
                    Your data is encrypted and protected with row-level security policies. 
                    We never store your Google password.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#7A7267] text-center mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
