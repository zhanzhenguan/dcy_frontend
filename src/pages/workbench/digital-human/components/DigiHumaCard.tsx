import { Flame, Lock, Star, Globe2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { type AvatarItem } from '../types'

interface DigitalHumanCardProps {
  avatar: AvatarItem
  onUse: (avatar: AvatarItem) => void
  onPreview: (avatar: AvatarItem) => void
}

export const DigitalHumanCard = ({
  avatar,
  onUse,
  onPreview,
}: DigitalHumanCardProps) => {
  const getGenderSymbol = () => {
    if (avatar.gender === 'female') return '♀'
    if (avatar.gender === 'male') return '♂'
    return '🐾'
  }
  const locked = avatar.accessible === false
  const hasImage = Boolean(avatar.avatarUrl)

  return (
    <Card className='group border-border/60 hover:border-primary/50 bg-card relative flex flex-col gap-0 overflow-hidden py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl'>
      {/* Cover / Avatar Visual Area */}
      <div
        onClick={() => onPreview(avatar)}
        className='bg-muted relative flex h-44 w-full cursor-pointer items-center justify-center overflow-hidden sm:h-52'
      >
        {hasImage ? (
          <img
            src={avatar.avatarUrl}
            alt={avatar.name}
            className='absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105'
          />
        ) : (
          <>
            {/* Gradient Background Representation */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${avatar.gradientBg} opacity-90 transition-transform duration-500 group-hover:scale-105`}
            />

            {/* Decorative Grid Pattern */}
            <div className='absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:16px_16px]' />

            {/* Center Avatar Circle / Avatar Mock Symbol */}
            <div className='relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/15 text-2xl font-extrabold text-white shadow-2xl backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-white/50 sm:h-20 sm:w-20'>
              {avatar.avatarInitial}
            </div>
          </>
        )}

        {/* Overlay Action on Hover */}
        {/* <div className='absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center z-20 backdrop-blur-[2px]'>
          <Button
            size='sm'
            variant='secondary'
            className='gap-1.5 shadow-lg font-medium rounded-full bg-white/90 text-foreground hover:bg-white'
            onClick={(e) => {
              e.stopPropagation()
              onPreview(avatar)
            }}
          >
            <Video className='h-4 w-4 text-primary' />
            预览试听
          </Button> */}
        {/* </div> */}

        {/* Top-Left Badge: Hot or New */}
        <div className='absolute top-3 left-3 z-20 flex gap-1.5'>
          {avatar.isHot && (
            <Badge className='gap-1 rounded-full border-0 bg-rose-500/90 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-md hover:bg-rose-600'>
              <Flame className='h-3 w-3 fill-current' />
              热门
            </Badge>
          )}
          {avatar.isNew && (
            <Badge className='rounded-full border-0 bg-emerald-500/90 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm hover:bg-emerald-600'>
              NEW
            </Badge>
          )}
        </div>

        {/* Top-Right Badge: PRO */}
        {avatar.isPro && (
          <div className='absolute top-3 right-3 z-20'>
            <Badge className='rounded-md border-0 bg-amber-500/90 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm hover:bg-amber-600'>
              PRO
            </Badge>
          </div>
        )}

        {/* Subscription Gate Overlay */}
        {locked && (
          <div className='bg-background/70 absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm'>
            <div className='bg-card/90 text-card-foreground ring-border flex flex-col items-center gap-2 rounded-lg px-4 py-3 shadow-md ring-1'>
              <Lock className='size-5 text-amber-500' />
              <div className='text-xs font-medium'>
                需订阅{avatar.requiredPlanName || '对应套餐'}
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Right Badge: Gender Icon */}
        <div className='absolute right-3 bottom-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xs font-bold text-white shadow-md backdrop-blur-md'>
          {getGenderSymbol()}
        </div>
      </div>

      {/* Card Info Area */}
      <CardContent className='flex-1 space-y-2 p-3 sm:p-4'>
        {/* Name and Region/Age */}
        <div className='flex items-start justify-between gap-2'>
          <div>
            <h3 className='text-foreground group-hover:text-primary text-base font-bold transition-colors'>
              {avatar.name}
            </h3>
            <p className='text-muted-foreground mt-0.5 text-[11px] font-medium'>
              {avatar.region} · {avatar.ageGroup}
            </p>
          </div>
          <div className='flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-500'>
            <Star className='h-3 w-3 fill-current' />
            {avatar.rating}
          </div>
        </div>

        {/* Style Badges */}
        <div className='flex flex-wrap gap-1'>
          {avatar.styles.map((style) => (
            <span
              key={style}
              className='bg-muted text-muted-foreground inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium'
            >
              {style}
            </span>
          ))}
        </div>

        {/* Supported Languages Tag */}
        <div className='text-muted-foreground border-border/40 flex items-center gap-1.5 border-t pt-1 text-[11px]'>
          <Globe2 className='text-primary/70 h-3 w-3 shrink-0' />
          <div className='flex flex-wrap items-center gap-1 overflow-hidden'>
            {avatar.languages.map((lang) => (
              <span
                key={lang}
                className='bg-primary/5 text-primary inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium'
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Action Footer */}
      <CardFooter className='p-3 pt-0 sm:p-4 sm:pt-0'>
        <Button
          onClick={() => onUse(avatar)}
          className='group-hover:bg-primary w-full font-semibold shadow-sm transition-all group-hover:shadow-md'
        >
          {locked ? '升级套餐后使用' : '使用此数字人'}
        </Button>
      </CardFooter>
    </Card>
  )
}
