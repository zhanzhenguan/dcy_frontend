import { useState } from 'react'
import {
  Send,
  History,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/business'
import { ThemeSwitch } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  mockPlatforms,
  mockPresetVideos,
  mockComplianceChecks,
  mockPublishHistory,
} from './data/mockPublData'
import {
  type PublishStep,
  type PlatformItem,
  type VideoPublishContent,
  type PublishHistoryRecord,
} from './types'

import { PublishStepper } from './components/PublishStepper'
import { StepSelectPlatform } from './components/StepSelePlat'
import { StepComplianceCheck } from './components/StepCompChec'
import { StepPublishingProgress } from './components/StepPublProg'
import { StepPublishComplete } from './components/StepPublComp'
import { VideoPickerModal } from './components/VidePickModa'
import { AccountManageModal } from './components/AccoManaModa'
import { PublishHistoryModal } from './components/PublHistModa'

export const PublishPage = () => {
  const [currentStep, setCurrentStep] = useState<PublishStep>(1)
  const [platforms, setPlatforms] = useState<PlatformItem[]>(mockPlatforms)
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([
    'tiktok',
    'instagram',
    'facebook',
  ])
  const [selectedVideo, setSelectedVideo] = useState<VideoPublishContent>(
    mockPresetVideos[0]
  )
  const [historyRecords] = useState<PublishHistoryRecord[]>(
    mockPublishHistory
  )

  // Modals state
  const [videoPickerOpen, setVideoPickerOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [targetAccountPlatform, setTargetAccountPlatform] =
    useState<PlatformItem | null>(null)

  // Platform selection handlers
  const handleTogglePlatform = (platformId: string) => {
    setSelectedPlatformIds((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleSelectAll = () => {
    const connectedIds = platforms.filter((p) => p.connected).map((p) => p.id)
    if (selectedPlatformIds.length === connectedIds.length) {
      setSelectedPlatformIds([])
    } else {
      setSelectedPlatformIds(connectedIds)
    }
  }

  // Account Connection Success handler
  const handleConnectSuccess = (platformId: string, handle: string) => {
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId
          ? {
              ...p,
              connected: true,
              accountHandle: handle.startsWith('@') ? handle : `@${handle}`,
              lastActiveTime: '刚刚',
            }
          : p
      )
    )
    if (!selectedPlatformIds.includes(platformId)) {
      setSelectedPlatformIds((prev) => [...prev, platformId])
    }
  }

  const handleOpenAccountModal = (platform?: PlatformItem | null) => {
    setTargetAccountPlatform(platform || null)
    setAccountModalOpen(true)
  }

  const selectedPlatforms = platforms.filter((p) =>
    selectedPlatformIds.includes(p.id)
  )

  const handleReset = () => {
    setCurrentStep(1)
  }

  return (
    <>
      {/* Top Application Header */}
      <Header fixed>
        <div className='flex min-w-0 items-center gap-2'>
          <Send className='text-primary size-5 shrink-0' />
          <span className='truncate font-bold text-foreground'>直连发布</span>
          <Badge
            variant='outline'
            className='hidden sm:inline-flex text-[10px] bg-primary/5 text-primary border-primary/20 font-normal'
          >
            无需 API 对接 · 模拟真人发布
          </Badge>
        </div>

        <div className='ml-auto flex items-center space-x-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setHistoryModalOpen(true)}
            className='gap-1.5 text-xs text-muted-foreground hover:text-foreground'
          >
            <History className='h-4 w-4' />
            发布历史
          </Button>

          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* Main Container */}
      <Main className='space-y-6 pb-16'>
        {/* Header Hero Section */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-black text-foreground tracking-tight'>
                直连发布
              </h1>
              <Badge className='bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-medium'>
                网页模拟自动化
              </Badge>
            </div>
            <p className='text-xs sm:text-sm text-muted-foreground'>
              模拟真实发布动作 · 无需 API 对接 · 设置登录状态即可发布
            </p>
          </div>
        </div>

        {/* Stepper Navigation */}
        <PublishStepper
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step < currentStep) {
              setCurrentStep(step)
            }
          }}
        />

        {/* Step Views */}
        <div className='mt-6'>
          {currentStep === 1 && (
            <StepSelectPlatform
              platforms={platforms}
              selectedPlatformIds={selectedPlatformIds}
              onTogglePlatform={handleTogglePlatform}
              onSelectAll={handleSelectAll}
              selectedVideo={selectedVideo}
              onOpenVideoPicker={() => setVideoPickerOpen(true)}
              onOpenAccountModal={handleOpenAccountModal}
              onNext={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StepComplianceCheck
              selectedPlatforms={selectedPlatforms}
              selectedVideo={selectedVideo}
              complianceChecks={mockComplianceChecks}
              onBack={() => setCurrentStep(1)}
              onStartPublish={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && (
            <StepPublishingProgress
              selectedPlatforms={selectedPlatforms}
              selectedVideo={selectedVideo}
              onComplete={() => setCurrentStep(4)}
            />
          )}

          {currentStep === 4 && (
            <StepPublishComplete
              selectedPlatforms={selectedPlatforms}
              selectedVideo={selectedVideo}
              onReset={handleReset}
              onOpenHistory={() => setHistoryModalOpen(true)}
            />
          )}
        </div>
      </Main>

      {/* Interactive Dialog Modals */}
      <VideoPickerModal
        open={videoPickerOpen}
        onOpenChange={setVideoPickerOpen}
        videos={mockPresetVideos}
        selectedVideoId={selectedVideo.id}
        onSelectVideo={setSelectedVideo}
      />

      <AccountManageModal
        open={accountModalOpen}
        onOpenChange={setAccountModalOpen}
        platform={targetAccountPlatform}
        onConnectSuccess={handleConnectSuccess}
      />

      <PublishHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        records={historyRecords}
      />
    </>
  )
}
