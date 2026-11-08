import type { VideoLanguage } from '@/services/api/videoLanguageApi'

const DEFAULT_LANGUAGE_CODE = 'en'

/** 根据用户 locale 为新视频选择目录中存在的语言，无法匹配时使用英语。 */
export function resolveDefaultVideoLanguage(
  locale: string | undefined,
  languages: VideoLanguage[]
) {
  const languageCode = locale?.trim().split('-', 1)[0]?.toLowerCase()
  if (
    languageCode &&
    languages.some((language) => language.code === languageCode)
  ) {
    return languageCode
  }
  return languages.some((language) => language.code === DEFAULT_LANGUAGE_CODE)
    ? DEFAULT_LANGUAGE_CODE
    : ''
}
