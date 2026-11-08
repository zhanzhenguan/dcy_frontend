export * from './apiError'

export * from './adminUserApi'
export * from './adminVideoApi'
export * from './assetLibraryApi'
export * from './authApi'
export * from './backgroundMusicApi'
export * from './checkoutApi'
export * from './creativeApi'
export * from './creativePresign'
export * from './couponApi'
export * from './creditApi'
export * from './creditRechargeApi'
export * from './dashboardApi'
export * from './deliveryPlatformApi'
export * from './digitalHumanApi'
export * from './industryApi'
export * from './inspirationApi'
export * from './marketingApi'
export * from './modelApi'
export * from './orderApi'
export * from './invoiceApi'
export * from './subscriptionApi'
export * from './systemSettingsApi'
export * from './tenantApi'
export * from './tenantModelRuleApi'
export * from './userProfileApi'
export * from './videoApi'
export * from './videoLanguageApi'

// 与 checkoutApi / authApi 存在同名导出，改为命名空间导出
export * as paymentApi from './paymentApi'
export * as adminPaymentApi from './adminPaymentApi'
export {
  type GlobalInvitationCode,
  listGlobalInvitationCodes,
  generateGlobalInvitationCodes,
  updateGlobalInvitationCodeEnabled,
  getGlobalInvitationCodeEnabled as getAdminGlobalInvitationCodeEnabled,
} from './globalInvitationCodeApi'
