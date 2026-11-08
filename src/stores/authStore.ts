import { create } from 'zustand'
import type { Tenant } from '@/services/api/tenantApi'
import { resetUnauthorizedNotice } from '@/utils/authSessionGuard'

const AUTH_STORAGE_KEY = 'video-pipeline-auth'

function publicEmail(email: string) {
  return email.toLowerCase().endsWith('@users.invalid') ? '' : email
}

function sanitizeSession(session: AuthSession): AuthSession {
  return {
    ...session,
    user: {
      ...session.user,
      email: publicEmail(session.user.email ?? ''),
      phone: session.user.phone ?? '',
    },
  }
}

export interface AuthUser {
  id: string
  email: string
  phone: string
  nickname: string
  avatar_url: string
  email_verified: boolean
  subscription_plan: string
  role: 'user' | 'admin'
  is_super_admin: boolean
}

export interface AuthSession {
  token_type: string
  access_token: string
  access_token_expire_at: number
  refresh_token: string
  refresh_token_expire_at: number
  user: AuthUser
  credit_balance: number
  tenant: Tenant
}

interface AuthState {
  auth: {
    session: AuthSession | null
    user: AuthUser | null
    accessToken: string
    setSession: (session: AuthSession) => void
    switchTenant: (data: {
      token_type: string
      access_token: string
      access_token_expire_at: number
      tenant: Tenant
      credit_balance: number
    }) => void
    setCreditBalance: (creditBalance: number) => void
    updateTenant: (tenant: Tenant) => void
    updateProfile: (patch: {
      nickname: string
      avatar_url: string
      email?: string
      phone?: string
    }) => void
    reset: () => void
  }
}

function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  try {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!rawSession) return null

    const session = JSON.parse(rawSession) as AuthSession
    if (
      !session.access_token ||
      !session.refresh_token ||
      !session.user?.id ||
      session.refresh_token_expire_at <= Math.floor(Date.now() / 1000)
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    const sanitizedSession = sanitizeSession(session)
    if (sanitizedSession.user.email !== session.user.email) {
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(sanitizedSession)
      )
    }
    return sanitizedSession
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

const initialSession = loadSession()

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    session: initialSession,
    user: initialSession?.user ?? null,
    accessToken: initialSession?.access_token ?? '',
    setSession: (session) => {
      session = sanitizeSession(session)
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
      resetUnauthorizedNotice()
      set((state) => ({
        ...state,
        auth: {
          ...state.auth,
          session,
          user: session.user,
          accessToken: session.access_token,
        },
      }))
    },
    switchTenant: (data) => {
      set((state) => {
        if (!state.auth.session) return state
        const session = {
          ...state.auth.session,
          token_type: data.token_type,
          access_token: data.access_token,
          access_token_expire_at: data.access_token_expire_at,
          credit_balance: data.credit_balance,
          tenant: data.tenant,
        }
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
        return {
          ...state,
          auth: { ...state.auth, session, accessToken: session.access_token },
        }
      })
    },
    setCreditBalance: (creditBalance) => {
      set((state) => {
        if (!state.auth.session) return state
        const session = {
          ...state.auth.session,
          credit_balance: creditBalance,
        }
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
        return {
          ...state,
          auth: { ...state.auth, session },
        }
      })
    },
    updateTenant: (tenant) => {
      set((state) => {
        if (!state.auth.session) return state
        const planName = tenant.plan_level_name?.trim() || ''
        const user = state.auth.session.user
          ? {
              ...state.auth.session.user,
              // 与租户套餐字段保持同步，避免工作台仍读登录时的旧 subscription_plan
              subscription_plan: planName || state.auth.session.user.subscription_plan,
            }
          : state.auth.session.user
        const session = {
          ...state.auth.session,
          tenant,
          ...(user ? { user } : {}),
        }
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
        return {
          ...state,
          auth: {
            ...state.auth,
            session,
            ...(user ? { user } : {}),
          },
        }
      })
    },
    updateProfile: (patch: {
      nickname: string
      avatar_url: string
      email?: string
      phone?: string
    }) => {
      set((state) => {
        if (!state.auth.session || !state.auth.user) return state
        const user = {
          ...state.auth.user,
          ...patch,
        }
        const session = {
          ...state.auth.session,
          user,
        }
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
        return {
          ...state,
          auth: { ...state.auth, session, user },
        }
      })
    },
    reset: () => {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      set((state) => ({
        ...state,
        auth: {
          ...state.auth,
          session: null,
          user: null,
          accessToken: '',
        },
      }))
    },
  },
}))

export function hasActiveSession() {
  const { auth } = useAuthStore.getState()
  const expiresAt = auth.session?.refresh_token_expire_at ?? 0
  const isActive = Boolean(auth.session && expiresAt > Date.now() / 1000)

  if (!isActive && auth.session) auth.reset()
  return isActive
}
