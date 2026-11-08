import { cn } from '@/utils/utils'
import './portalAiAmbient.scss'

type PortalAiAmbientProps = {
  className?: string
  /** Soft HUD corner brackets (legacy / dense canvases) */
  showFrame?: boolean
  /**
   * `hero` — minimal animated light field for the home banner
   * `default` — denser canvas for auth / shared surfaces
   */
  variant?: 'default' | 'hero'
}

/**
 * Shared indigo AI canvas.
 * Decorative only — respect prefers-reduced-motion in CSS.
 */
export const PortalAiAmbient = ({
  className,
  showFrame = false,
  variant = 'default',
}: PortalAiAmbientProps) => {
  const isHero = variant === 'hero'

  return (
    <div
      className={cn(
        'portal-ai-ambient',
        isHero && 'portal-ai-ambient--hero',
        className,
      )}
      aria-hidden
    >
      <div className='portal-ai-ambient__glow portal-ai-ambient__glow--tl' />
      <div className='portal-ai-ambient__glow portal-ai-ambient__glow--br' />
      {isHero ? (
        <>
          <div className='portal-ai-ambient__glow portal-ai-ambient__glow--mid' />
          <div className='portal-ai-ambient__shimmer' />
          <div className='portal-ai-ambient__particles portal-ai-ambient__particles--hero'>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </>
      ) : (
        <div className='portal-ai-ambient__core' />
      )}

      {!isHero ? <div className='portal-ai-ambient__mesh' /> : null}
      {!isHero ? (
        <>
          <div className='portal-ai-ambient__orbit portal-ai-ambient__orbit--lg' />
          <div className='portal-ai-ambient__orbit portal-ai-ambient__orbit--sm' />
          <div className='portal-ai-ambient__scan' />
        </>
      ) : null}

      {!isHero ? (
        <svg
          className='portal-ai-ambient__net'
          viewBox='0 0 1200 800'
          preserveAspectRatio='xMidYMid slice'
        >
          <defs>
            <linearGradient id='portalAiNetStroke' x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#5865f2' stopOpacity='0.15' />
              <stop offset='50%' stopColor='#a78bfa' stopOpacity='0.55' />
              <stop offset='100%' stopColor='#8e5aff' stopOpacity='0.15' />
            </linearGradient>
            <radialGradient id='portalAiHub' cx='50%' cy='50%' r='50%'>
              <stop offset='0%' stopColor='#c4b5fd' stopOpacity='0.9' />
              <stop offset='100%' stopColor='#5865f2' stopOpacity='0.2' />
            </radialGradient>
          </defs>

          <g className='portal-ai-ambient__net-lines'>
            <path d='M120 180 L280 240 L420 160 L560 220 L700 150' />
            <path d='M760 130 L900 190 L1040 120 L1120 200' />
            <path d='M160 540 L300 600 L460 520 L620 580 L760 500' />
            <path d='M820 560 L960 620 L1100 540' />
            <path d='M280 240 L420 400 L560 220' />
            <path d='M420 400 L620 580' />
            <path d='M700 150 L620 580' />
            <path d='M420 400 L900 190' />
          </g>

          <g className='portal-ai-ambient__signals'>
            <circle r='3' fill='#93c5fd'>
              <animateMotion
                dur='7.5s'
                repeatCount='indefinite'
                path='M120 180 L280 240 L420 160 L560 220 L700 150'
              />
            </circle>
            <circle r='2.5' fill='#c4b5fd'>
              <animateMotion
                dur='9s'
                repeatCount='indefinite'
                begin='-2.5s'
                path='M160 540 L300 600 L460 520 L620 580 L760 500'
              />
            </circle>
            <circle r='2.8' fill='#a5b4fc'>
              <animateMotion
                dur='8s'
                repeatCount='indefinite'
                begin='-4s'
                path='M420 400 L900 190'
              />
            </circle>
            <circle r='2.2' fill='#ddd6fe'>
              <animateMotion
                dur='10s'
                repeatCount='indefinite'
                begin='-1s'
                path='M760 130 L900 190 L1040 120 L1120 200'
              />
            </circle>
          </g>

          <g className='portal-ai-ambient__net-nodes'>
            <circle
              className='portal-ai-ambient__node portal-ai-ambient__node--hub'
              cx='420'
              cy='400'
              r='5.5'
            />
            <circle className='portal-ai-ambient__node' cx='120' cy='180' r='2.5' />
            <circle className='portal-ai-ambient__node' cx='280' cy='240' r='3.2' />
            <circle className='portal-ai-ambient__node' cx='420' cy='160' r='2' />
            <circle className='portal-ai-ambient__node' cx='560' cy='220' r='3' />
            <circle className='portal-ai-ambient__node' cx='700' cy='150' r='2.5' />
            <circle className='portal-ai-ambient__node' cx='900' cy='190' r='3.5' />
            <circle className='portal-ai-ambient__node' cx='1040' cy='120' r='2' />
            <circle className='portal-ai-ambient__node' cx='160' cy='540' r='2.5' />
            <circle className='portal-ai-ambient__node' cx='460' cy='520' r='2.8' />
            <circle className='portal-ai-ambient__node' cx='620' cy='580' r='3.2' />
            <circle className='portal-ai-ambient__node' cx='960' cy='620' r='2.5' />
            <circle className='portal-ai-ambient__node' cx='1100' cy='540' r='2' />
          </g>

          <circle className='portal-ai-ambient__hub-ring' cx='420' cy='400' r='14' />
          <circle
            className='portal-ai-ambient__hub-ring portal-ai-ambient__hub-ring--late'
            cx='420'
            cy='400'
            r='22'
          />
        </svg>
      ) : null}

      {!isHero ? (
        <div className='portal-ai-ambient__particles'>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {showFrame && !isHero ? (
        <div className='portal-ai-ambient__frame'>
          <i className='portal-ai-ambient__bracket portal-ai-ambient__bracket--tl' />
          <i className='portal-ai-ambient__bracket portal-ai-ambient__bracket--tr' />
          <i className='portal-ai-ambient__bracket portal-ai-ambient__bracket--bl' />
          <i className='portal-ai-ambient__bracket portal-ai-ambient__bracket--br' />
        </div>
      ) : null}
    </div>
  )
}
