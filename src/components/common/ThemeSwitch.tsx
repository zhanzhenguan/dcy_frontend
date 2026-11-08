import { useEffect } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useTheme } from '@/context/ThemeProvider'
import { MessageNotificationBell } from '@/components/common/MessageNotificationBell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu'

type ThemeSwitchProps = {
  /** 主题按钮左侧是否展示消息铃铛，默认开启 */
  showMessageBell?: boolean
}

export const ThemeSwitch = ({ showMessageBell = true }: ThemeSwitchProps) => {
  const { resolvedTheme, theme, setTheme } = useTheme()

  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#151915' : '#f8f3fa'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [resolvedTheme])

  return (
    <>
      {showMessageBell ? <MessageNotificationBell /> : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='scale-95 rounded-full'>
            <Sun className='size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
            <Moon className='absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
            <span className='sr-only'>Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => setTheme('light')}>
            浅色{' '}
            <Check
              size={14}
              className={cn('ms-auto', theme !== 'light' && 'hidden')}
            />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            深色
            <Check
              size={14}
              className={cn('ms-auto', theme !== 'dark' && 'hidden')}
            />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            自动
            <Check
              size={14}
              className={cn('ms-auto', theme !== 'system' && 'hidden')}
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
