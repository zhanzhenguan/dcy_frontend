/** 邀请加入相关错误文案判定（前后端约定文案）。 */

export function isJoinApprovalPendingMessage(message: string) {
  return /等待企业审核|已提交加入申请/.test(message)
}

/** 已是该企业活跃成员（不含「待审核」「邮箱已注册」等）。 */
export function isAlreadyEnterpriseMemberMessage(message: string) {
  if (isJoinApprovalPendingMessage(message)) return false
  // 勿用宽泛的「已加入」：会误伤「已提交加入申请」
  return /你已加入过该企业|已经加入该企业|已是该企业成员|已经是该企业成员|已经是成员|重复加入该企业|已经是该企业/.test(
    message
  )
}
