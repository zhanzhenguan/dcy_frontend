import { type AuthUser } from '@/stores/authStore'
import defaultUserAvatar from '@/assets/images/img_user_default.png'

export const DEFAULT_USER_AVATAR = defaultUserAvatar

export const resolveUserAvatarUrl = (url?: string | null) => {
  const trimmed = url?.trim()
  if (!trimmed) return DEFAULT_USER_AVATAR
  if (/^(null|undefined|none)$/i.test(trimmed)) return DEFAULT_USER_AVATAR
  return trimmed
}

/** 手机号展示：中间 4 位打星（如 138****5678） */
export const maskPhoneForDisplay = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}****${digits.slice(7)}`
  }
  if (digits.length > 7) {
    const keepEnd = 4
    const keepStart = Math.max(0, digits.length - keepEnd - 4)
    return `${digits.slice(0, keepStart)}****${digits.slice(digits.length - keepEnd)}`
  }
  return phone.trim()
}

export const getUserAccount = (user: Pick<AuthUser, 'email' | 'phone'>) => {
  const email = user.email?.trim() || ''
  if (email) return email
  const phone = user.phone?.trim() || ''
  if (phone) return maskPhoneForDisplay(phone)
  return ''
}

export const getUserDisplayName = (user: AuthUser) => {
  const nickname = user.nickname?.trim() || ''
  if (nickname) return nickname
  const account = getUserAccount(user)
  if (!account) return 'User'
  return account.includes('@') ? account.split('@')[0] : account
}

export const getUserInitials = (user: AuthUser) => {
  const name = getUserDisplayName(user)
  const parts = name.split(/\s+/).filter(Boolean)
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.slice(0, 2)

  return initials.toUpperCase()
}
