import { Building2, Landmark, MapPin, Play, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { revealDelay, ScrollReveal } from './ScrollReveal'

const narrativePoints = [
  {
    title: '关心指导',
    desc: '各级领导走进产业一线，了解企业发展与落地进展。',
    icon: Landmark,
  },
  {
    title: '产业落地',
    desc: '聚焦人工智能与实体经济结合，推动场景应用走向实战。',
    icon: Building2,
  },
  {
    title: '注入信心',
    desc: '以关心汇聚合力，为企业持续创新与服务升级注入动力。',
    icon: Sparkles,
  },
] as const

export const LeadershipSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayClick = () => {
    const video = videoRef.current
    if (!video) return
    void video
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false)
      })
  }

  return (
    <section
      id='leadership'
      className='leadership-section relative scroll-mt-24 py-16 sm:py-20 lg:py-24'
      aria-labelledby='leadership-heading'
    >

      <ScrollReveal className='relative z-[1] mx-auto max-w-7xl px-4 sm:px-6'>
        <header
          className='portal-reveal__item portal-reveal__item--fade leadership-section__header mx-auto mb-10 max-w-2xl text-center sm:mb-12'
          style={revealDelay(0)}
        >
          <h2
            id='leadership-heading'
            className='leadership-section__heading mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'
          >
            <span className='leadership-section__title-part'>
              领导
              <span className='leadership-section__gradient-text'>关怀</span>
            </span>
            <span className='leadership-section__divider' aria-hidden>
              ·
            </span>
            <span className='leadership-section__title-part'>
              省长
              <span className='leadership-section__gradient-text'>亲临</span>
            </span>
          </h2>
          <p className='mt-3 text-base leading-relaxed text-slate-500 sm:text-lg'>
            各级领导关心指导，为企业发展与产业落地注入信心与动力
          </p>
        </header>

        <div className='leadership-section__layout'>
          <aside
            className='portal-reveal__item portal-reveal__item--from-left leadership-section__story'
            style={revealDelay(1)}
          >
            <h3 className='leadership-section__story-title'>
              从关心到落地，把寄望写成产业答卷
            </h3>
            <p className='leadership-section__story-body'>
              省长亲临调研现场，关心企业发展与人工智能产业落地。以实干回应关心，持续把能力做进真实业务场景。
            </p>

            <p className='leadership-section__place'>
              <MapPin className='size-3.5' strokeWidth={2} aria-hidden />
              厦门 · 人工智能产业落地现场
            </p>

            <ul className='leadership-section__points'>
              {narrativePoints.map(({ title, desc, icon: Icon }, index) => (
                <li
                  key={title}
                  className='portal-reveal__item portal-reveal__item--fade'
                  style={revealDelay(2 + index, 0.08)}
                >
                  <article className='leadership-section__point'>
                    <span className='leadership-section__point-icon' aria-hidden>
                      <Icon className='size-4' strokeWidth={2} />
                    </span>
                    <div>
                      <h4 className='leadership-section__point-title'>{title}</h4>
                      <p className='leadership-section__point-desc'>{desc}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            <blockquote className='leadership-section__quote'>
              <p>
                以实干回应关心——把领导寄望转化为可落地的产业能力与持续服务。
              </p>
            </blockquote>
          </aside>

          <div
            className='portal-reveal__item portal-reveal__item--from-right leadership-section__media'
            style={revealDelay(1, 0.1)}
          >
            <div className='leadership-section__panel'>
              <div className='leadership-section__panel-head'>
                <p className='leadership-section__panel-label'>现场纪实</p>
                <span className='leadership-section__panel-badge'>Official Visit</span>
              </div>

              <div className='leadership-section__frame'>
                <video
                  ref={videoRef}
                  className='leadership-section__video'
                  src="https://daciyuan-public-cn.oss-cn-shenzhen.aliyuncs.com/pv.mp4"
                  muted
                  playsInline
                  controls={isPlaying}
                  preload='metadata'
                  aria-label='领导关怀介绍视频'
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                {!isPlaying ? (
                  <button
                    type='button'
                    className='leadership-section__play'
                    onClick={handlePlayClick}
                    aria-label='播放视频'
                  >
                    <span className='leadership-section__play-icon' aria-hidden>
                      <Play className='size-7' fill='currentColor' strokeWidth={0} />
                    </span>
                    <span className='leadership-section__play-label'>观看纪实片</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
