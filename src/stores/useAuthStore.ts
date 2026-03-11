import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthState {
  session: Session | null
  user: User | null
  googleAccessToken: string | null
  loading: boolean

  setSession: (session: Session | null) => void
  setGoogleAccessToken: (token: string | null) => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  googleAccessToken: null,
  loading: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      googleAccessToken: session?.provider_token ?? null,
    }),

  setGoogleAccessToken: (token) => set({ googleAccessToken: token }),

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar.events",
        redirectTo: window.location.origin,
      },
    })
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore network/session errors — clear local state regardless
    } finally {
      set({ session: null, user: null, googleAccessToken: null })
    }
  },

  initialize: async () => {
    const { data } = await supabase.auth.getSession()
    set({
      session: data.session,
      user: data.session?.user ?? null,
      googleAccessToken: data.session?.provider_token ?? null,
      loading: false,
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        googleAccessToken: session?.provider_token ?? null,
      })
    })
  },
}))
