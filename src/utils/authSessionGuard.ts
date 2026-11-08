/**
 * 退出登录 / 会话失效时的并发防护：
 * - 主动退出期间忽略「Session expired」类提示
 * - 多个请求同时 401/403 时只提示一次
 */

let signingOut = false
let unauthorizedNoticeTaken = false

export const beginSignOut = () => {
  signingOut = true
  // 主动退出时后续并发 401 不再弹 Session expired
  unauthorizedNoticeTaken = true
}

export const endSignOut = () => {
  signingOut = false
}

export const isSigningOut = () => {
  return signingOut
}

/** 返回 true 表示本次应展示未授权提示并执行跳转 */
export const takeUnauthorizedNotice = (): boolean => {
  if (signingOut) return false
  if (unauthorizedNoticeTaken) return false
  unauthorizedNoticeTaken = true
  return true
}

/** 重新登录成功后重置，允许下次会话失效再提示 */
export const resetUnauthorizedNotice = () => {
  signingOut = false
  unauthorizedNoticeTaken = false
}
