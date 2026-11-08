import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Camera, Loader2, LockKeyhole, Mail, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { uploadCreativeAsset } from '@/services/api/creativeApi'
import {
  findProfileLocaleOption,
  PROFILE_LOCALE_OPTIONS,
} from '@/utils/profileLocaleOptions'
import { maskPhoneForDisplay } from '@/utils/user'
import { getUserProfile, updateUserProfile } from '@/services/api/userProfileApi'
import { Button } from '@/components/ui/button'
import { DatePicker, UserAvatar } from '@/components/common'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChangePhoneDialog } from '@/pages/account/profile/components/ChangePhoneDialog'

const GENDER_OPTIONS = [
  { value: '0', label: '未设置' },
  { value: '1', label: '男' },
  { value: '2', label: '女' },
  { value: '3', label: '其他' },
] as const

const editProfileSchema = z.object({
  account: z.string().trim().email('请输入有效的邮箱账号').or(z.literal('')),
  new_password: z
    .string()
    .refine(
      (value) => value === '' || (value.length >= 8 && value.length <= 72),
      '密码长度必须为 8 至 72 个字符'
    )
    .refine(
      (value) => value === '' || (/[A-Za-z]/.test(value) && /\d/.test(value)),
      '密码必须同时包含字母和数字'
    ),
  nickname: z
    .string()
    .trim()
    .min(1, '请输入昵称')
    .min(2, '昵称至少需要 2 个字符')
    .max(30, '昵称最多 30 个字符'),
  gender: z.enum(['0', '1', '2', '3']),
  birth_date: z.date().optional(),
  locale: z.string(),
})

type EditProfileValues = z.infer<typeof editProfileSchema>

export const ProfileSettingsForm = () => {
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.auth.session)
  const updateProfile = useAuthStore((state) => state.auth.updateProfile)
  const queryClient = useQueryClient()
  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(session?.user.avatar_url ?? '')
  const [changePhoneOpen, setChangePhoneOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      account: '',
      new_password: '',
      nickname: session?.user.nickname ?? '',
      gender: '0',
      birth_date: undefined,
      locale: 'zh-CN',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    const profile = profileQuery.data
    if (!profile && !session?.user) return
    const selectedLocale = findProfileLocaleOption(profile?.locale ?? '')
    setAvatarUrl(session?.user.avatar_url ?? '')
    form.reset({
      account: profile?.account_set ? profile.email : '',
      new_password: '',
      nickname: profile?.nickname ?? session?.user.nickname ?? '',
      gender: String(profile?.gender ?? 0) as EditProfileValues['gender'],
      birth_date: profile?.birth_date
        ? new Date(`${profile.birth_date}T00:00:00`)
        : undefined,
      locale: selectedLocale?.locale ?? 'zh-CN',
    })
  }, [
    profileQuery.data,
    session?.user,
    session?.user.nickname,
    session?.user.avatar_url,
    form,
  ])

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      toast.error('仅支持 PNG、JPG、GIF 或 WebP 格式的图片')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB')
      return
    }

    setIsUploading(true)
    try {
      const asset = await uploadCreativeAsset(file)
      setAvatarUrl(asset.url)
      toast.success('头像上传成功')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '头像上传失败，请稍后重试'
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (values: EditProfileValues) => {
    setIsSubmitting(true)
    try {
      const locale = findProfileLocaleOption(values.locale)
      if (!locale) throw new Error('请选择有效的地区和默认语言')
      const profile = await updateUserProfile({
        ...(profileQuery.data?.phone_verified
          ? {
              ...(!profileQuery.data.account_change_allowed_at
                ? { account: values.account }
                : {}),
              ...(!profileQuery.data.password_set
                ? { new_password: values.new_password }
                : {}),
            }
          : {}),
        nickname: values.nickname,
        avatar_url: avatarUrl || undefined,
        gender: Number(values.gender),
        birth_date: values.birth_date
          ? format(values.birth_date, 'yyyy-MM-dd')
          : undefined,
        locale: locale.locale,
        country_code: locale.countryCode,
      })
      queryClient.setQueryData(['user-profile'], profile)
      updateProfile({
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        email: profile.email,
      })
      toast.success('个人资料已更新')
      void navigate({ to: '/profile' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '更新个人资料失败，请稍后重试'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className='mx-auto max-w-xl space-y-6'
        >
          <FormItem>
            <FormLabel>头像</FormLabel>
            <div className='flex items-center gap-4'>
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='group relative shrink-0 cursor-pointer rounded-xl'
                aria-label='点击上传头像'
              >
                <UserAvatar
                  src={avatarUrl}
                  alt='头像预览'
                  className='size-20 rounded-xl'
                  imageClassName='rounded-xl'
                  fallbackClassName='rounded-xl'
                />
                <span className='absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100'>
                  {isUploading ? (
                    <Loader2 className='size-6 animate-spin' />
                  ) : (
                    <Camera className='size-6' />
                  )}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/png,image/jpeg,image/gif,image/webp'
                className='hidden'
                onChange={handleFileChange}
              />
              <div className='space-y-1'>
                <p className='text-sm font-medium'>点击上传头像</p>
                <p className='text-muted-foreground text-[11px]'>
                  支持 PNG、JPG、GIF、WebP 图片，不超过 10MB
                </p>
              </div>
            </div>
          </FormItem>

          <FormItem>
            <FormLabel className='flex items-center gap-1.5'>
              <Smartphone className='size-3.5' />
              手机号
            </FormLabel>
            <div className='flex items-center gap-2'>
              <Input
                readOnly
                value={
                  profileQuery.data?.phone
                    ? maskPhoneForDisplay(profileQuery.data.phone)
                    : '未绑定'
                }
                className='bg-muted/40'
              />
              <Button
                type='button'
                variant='outline'
                className='shrink-0'
                onClick={() => setChangePhoneOpen(true)}
              >
                {profileQuery.data?.phone ? '更换手机' : '绑定手机'}
              </Button>
            </div>
          </FormItem>

          {profileQuery.data?.phone_verified && (
            <div className='space-y-4 border-t pt-4'>
              <FormField
                control={form.control}
                name='account'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <Mail className='size-3.5' />
                      登录账号
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='请输入邮箱账号'
                        disabled={Boolean(
                          profileQuery.data.account_change_allowed_at
                        )}
                        {...field}
                      />
                    </FormControl>
                    {profileQuery.data.account_change_allowed_at && (
                      <p className='text-muted-foreground text-[11px]'>
                        {new Date(
                          profileQuery.data.account_change_allowed_at
                        ).toLocaleString('zh-CN')}{' '}
                        后可再次修改
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!profileQuery.data.password_set && (
                <FormField
                  control={form.control}
                  name='new_password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <LockKeyhole className='size-3.5' />
                        登录密码
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          autoComplete='new-password'
                          placeholder='请输入登录密码'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          <FormField
            control={form.control}
            name='nickname'
            render={({ field }) => (
              <FormItem>
                <FormLabel>昵称 *</FormLabel>
                <FormControl>
                  <Input
                    required
                    autoComplete='nickname'
                    placeholder='请输入昵称'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='gender'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>性别</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='请选择性别' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='birth_date'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>出生日期</FormLabel>
                  <DatePicker
                    selected={field.value}
                    onSelect={field.onChange}
                    placeholder='选择日期'
                    className='w-full'
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='locale'
            render={({ field }) => (
              <FormItem>
                <FormLabel>地区和默认语言</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='请选择地区和默认语言' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROFILE_LOCALE_OPTIONS.map((option) => (
                      <SelectItem key={option.locale} value={option.locale}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex flex-wrap justify-end gap-2 border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => void navigate({ to: '/profile' })}
            >
              取消
            </Button>
            <Button type='submit' disabled={isSubmitting} className='gap-1.5'>
              {isSubmitting && <Loader2 className='size-3.5 animate-spin' />}
              保存修改
            </Button>
          </div>
        </form>
      </Form>

      <ChangePhoneDialog
        open={changePhoneOpen}
        onOpenChange={setChangePhoneOpen}
        currentPhone={profileQuery.data?.phone}
      />
    </>
  )
}
