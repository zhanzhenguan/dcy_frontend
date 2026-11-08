import { useEffect, useRef, useState } from 'react'
import { Eye, Pause, Play, Sparkles, TrendingUp, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type InspirationItem } from '../types'

interface InspirationCardProps {
  item: InspirationItem
  onReplicate: (item: InspirationItem) => void
  isPlaying: boolean
  onPlayChange: (playing: boolean) => void
}

export const InspirationCard = ({
  item,
  onReplicate,
  isPlaying,
  onPlayChange,
}: InspirationCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      void videoRef.current.play().catch(() => {
        onPlayChange(false)
      })
    } else {
      videoRef.current.pause()
    }
  }, [isPlaying, onPlayChange])

  // Platform badge styling helper
  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'TikTok':
        return 'bg-zinc-900/85 text-white border-zinc-700'
      case 'Instagram':
        return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent'
      case 'Amazon':
        return 'bg-amber-600/90 text-white border-amber-500/50'
      case 'Facebook':
        return 'bg-blue-600/90 text-white border-blue-500/50'
      case 'YouTube':
        return 'bg-red-600/90 text-white border-red-500/50'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const togglePlay = () => {
    onPlayChange(!isPlaying)
  }

  return (
    <Card
      className='group border-border/60 bg-card/60 hover:border-primary/40 hover:shadow-primary/5 relative flex flex-col gap-0 overflow-hidden py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Container & Play Button Overlay */}
      <div
        className='relative aspect-video w-full cursor-pointer overflow-hidden bg-black'
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={item.videoUrl || item.coverImage}
          className='h-full w-full object-cover'
          playsInline
          loop
          preload='metadata'
          onEnded={() => onPlayChange(false)}
        />

        {/* Dark Vignette Overlay when paused or hovered */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 transition-opacity ${
            isPlaying && !isHovered ? 'opacity-0' : 'opacity-70'
          }`}
        />

        {/* Top Left: Platform Badge */}
        <div className='absolute top-3 left-3 z-10'>
          <Badge
            variant='outline'
            className={`px-2.5 py-0.5 text-xs font-medium backdrop-blur-md ${getPlatformBadge(
              item.platform
            )}`}
          >
            {item.platform}
          </Badge>
        </div>

        {/* Center: Play / Pause Button Icon */}
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
            isPlaying && !isHovered
              ? 'pointer-events-none opacity-0'
              : 'opacity-100'
          }`}
        >
          <div
            className={`bg-background/90 text-primary flex h-12 w-12 items-center justify-center rounded-full shadow-xl backdrop-blur-md transition-all duration-300 ${
              isHovered
                ? 'bg-primary text-primary-foreground scale-110'
                : 'scale-90 opacity-90'
            }`}
          >
            {isPlaying ? (
              <Pause className='h-5 w-5 fill-current' />
            ) : (
              <Play className='ml-0.5 h-5 w-5 fill-current' />
            )}
          </div>
        </div>

        {/* Bottom Right: Brand Logo / Code Badge */}
        <div className='absolute right-3 bottom-3 z-10'>
          <div
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold shadow-md ${
              item.brandBgColor || 'bg-primary text-primary-foreground'
            }`}
          >
            {item.brandCode}
          </div>
        </div>
      </div>

      {/* Card Content Info */}
      <CardContent className='flex flex-1 flex-col justify-between space-y-3 p-4'>
        {/* Brand & Industry */}
        <div className='text-muted-foreground flex items-center justify-between text-xs'>
          <span className='text-foreground max-w-[60%] truncate text-sm font-semibold'>
            {item.brand}
          </span>
          <span className='bg-muted rounded-md px-2 py-0.5 text-[11px] font-medium'>
            {item.industry}
          </span>
        </div>

        {/* Title */}
        <h3 className='text-primary/95 line-clamp-2 text-sm leading-snug font-semibold italic'>
          {item.title}
        </h3>

        {/* Strategy description */}
        <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
          {item.creativeStrategy}
        </p>

        {/* Script Tags */}
        <div className='flex flex-wrap gap-1.5 pt-1'>
          {item.tags.map((tag) => (
            <span
              key={tag}
              className='bg-secondary/80 text-secondary-foreground rounded-md px-2 py-0.5 text-[10px] font-medium'
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Metrics Grid */}
        <div className='bg-muted/40 border-border/30 grid grid-cols-3 gap-2 rounded-lg border p-2.5 text-center text-xs'>
          <div>
            <div className='text-muted-foreground flex items-center justify-center gap-1 text-[10px]'>
              <Eye className='h-3 w-3' />
              播放
            </div>
            <div className='text-foreground mt-0.5 font-bold'>
              {item.metrics.views}
            </div>
          </div>
          <div className='border-border/40 border-x'>
            <div className='text-muted-foreground flex items-center justify-center gap-1 text-[10px]'>
              <TrendingUp className='h-3 w-3 text-emerald-500' />
              CTR
            </div>
            <div className='mt-0.5 font-bold text-emerald-600 dark:text-emerald-400'>
              {item.metrics.ctr}
            </div>
          </div>
          <div>
            <div className='text-muted-foreground flex items-center justify-center gap-1 text-[10px]'>
              <Clock className='h-3 w-3' />
              时长
            </div>
            <div className='text-foreground mt-0.5 font-bold'>
              {item.metrics.duration}
            </div>
          </div>
        </div>

        {/* Action Button: One-click Replicate */}
        <Button
          className='w-full gap-2 font-medium shadow-sm transition-all hover:shadow-md'
          variant='default'
          onClick={() => onReplicate(item)}
        >
          <Sparkles className='h-4 w-4' />
          一键复刻
        </Button>
      </CardContent>
    </Card>
  )
}
