import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database.types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, shopName: string, ownerName?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // 현재 세션 가져오기
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        set({ user: session.user, session })
        await get().fetchProfile()
      }

      // 인증 상태 변경 리스너
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ user: session?.user ?? null, session })

        if (session) {
          await get().fetchProfile()
        } else {
          set({ profile: null })
        }
      })
    } finally {
      set({ isLoading: false, isInitialized: true })
    }
  },

  signUp: async (email, password, shopName, ownerName) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            shop_name: shopName,
            owner_name: ownerName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        set({ user: data.user, session: data.session })
        // 프로필은 트리거에 의해 자동 생성됨
        await get().fetchProfile()
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      set({ user: data.user, session: data.session })
      await get().fetchProfile()

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    try {
      await supabase.auth.signOut()
      set({ user: null, session: null, profile: null })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchProfile: async () => {
    const { user } = get()
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        // 프로필이 없으면 기본값 설정
        set({ profile: null })
        return
      }

      set({ profile: data })
    } catch (err) {
      console.error('Profile fetch exception:', err)
      set({ profile: null })
    }
  },

  updateProfile: async (profileData) => {
    const { user } = get()
    if (!user) return { error: new Error('Not authenticated') }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)

      if (error) throw error

      await get().fetchProfile()
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}))
