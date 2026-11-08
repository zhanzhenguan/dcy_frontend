import {
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react'
import { extractCreativeFileKey } from '@/services/api/creativeApi'
import { requestCreativeUrlPresign } from '@/services/api/creativePresign'
import { cn } from '@/utils/utils'

type SignedCreativeImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'onError'
> & {
  src: string
  /** 已知 file_key 时优先用于换签 */
  fileKey?: string
  /** 换签成功后回调，便于同步到业务 state */
  onUrlChange?: (nextUrl: string, previousUrl: string) => void
}

/**
 * 签名图：加载失败时批量调用 /creative/assets/presign 换签并替换 src。
 */
export const SignedCreativeImage = ({
  src,
  fileKey,
  onUrlChange,
  className,
  ...props
}: SignedCreativeImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(src)
  const retryingRef = useRef(false)
  const failedKeysRef = useRef(new Set<string>())

  useEffect(() => {
    setCurrentSrc(src)
    retryingRef.current = false
  }, [src])

  const handleError = async (_event: SyntheticEvent<HTMLImageElement>) => {
    const previous = currentSrc || src
    const key = extractCreativeFileKey(fileKey || previous)
    const dedupe = key || previous
    if (!previous || retryingRef.current || failedKeysRef.current.has(dedupe)) {
      return
    }

    retryingRef.current = true
    failedKeysRef.current.add(dedupe)
    try {
      const next = await requestCreativeUrlPresign(previous, fileKey || key)
      if (!next || next === previous) return
      setCurrentSrc(next)
      onUrlChange?.(next, previous)
      failedKeysRef.current.delete(dedupe)
    } catch {
      // 保留 broken 状态，避免死循环
    } finally {
      retryingRef.current = false
    }
  }

  return (
    <img
      {...props}
      src={currentSrc}
      className={cn(className)}
      onError={(event) => {
        void handleError(event)
      }}
    />
  )
}
