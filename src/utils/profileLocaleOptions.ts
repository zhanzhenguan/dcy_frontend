export type ProfileLocaleOption = {
  locale: string
  countryCode: string
  label: string
}

// 个人资料中可选的地区与默认语言。locale 使用 BCP 47 语言-地区标识。
export const PROFILE_LOCALE_OPTIONS: ProfileLocaleOption[] = [
  { locale: 'zh-CN', countryCode: 'CN', label: '中国大陆 - 简体中文' },
  { locale: 'zh-TW', countryCode: 'TW', label: '中国台湾 - 繁体中文' },
  { locale: 'en-US', countryCode: 'US', label: '美国 - English' },
  { locale: 'en-GB', countryCode: 'GB', label: '英国 - English' },
  { locale: 'en-CA', countryCode: 'CA', label: '加拿大 - English' },
  { locale: 'en-AU', countryCode: 'AU', label: '澳大利亚 - English' },
  { locale: 'ja-JP', countryCode: 'JP', label: '日本 - 日本語' },
  { locale: 'ko-KR', countryCode: 'KR', label: '韩国 - 한국어' },
  { locale: 'de-DE', countryCode: 'DE', label: '德国 - Deutsch' },
  { locale: 'fr-FR', countryCode: 'FR', label: '法国 - Français' },
  { locale: 'es-ES', countryCode: 'ES', label: '西班牙 - Español' },
  { locale: 'it-IT', countryCode: 'IT', label: '意大利 - Italiano' },
  { locale: 'pt-BR', countryCode: 'BR', label: '巴西 - Português' },
  { locale: 'ru-RU', countryCode: 'RU', label: '俄罗斯 - Русский' },
  { locale: 'ar-SA', countryCode: 'SA', label: '沙特阿拉伯 - العربية' },
  { locale: 'th-TH', countryCode: 'TH', label: '泰国 - ไทย' },
  { locale: 'vi-VN', countryCode: 'VN', label: '越南 - Tiếng Việt' },
  {
    locale: 'id-ID',
    countryCode: 'ID',
    label: '印度尼西亚 - Bahasa Indonesia',
  },
]

export const findProfileLocaleOption = (locale: string) => {
  return PROFILE_LOCALE_OPTIONS.find((option) => option.locale === locale)
}
