import { requestCreativeUrlPresign } from '@/services/api/creativePresign'
import type { VideoGenerationTask } from '@/services/api/videoApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CreativeMediaPreview,
  type CreativeMediaPreviewTarget,
} from '../../CreativeMediaPreview'
import { DigitalHumanPicker, type DigitalHuman } from '../../DigiHumaPick'
import { GenerationTaskList } from './GenerationTaskList'

type StudioDialogsProps = {
  materialUploadInputRef: React.RefObject<HTMLInputElement | null>
  onMaterialUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  materialPreview: CreativeMediaPreviewTarget | null
  onCloseMaterialPreview: () => void
  onReplaceCreativeUrl: (next: string, previous: string) => void
  resultVideoUrl: string | null
  onResultVideoOpenChange: (open: boolean) => void
  onResultVideoUrlChange: (url: string) => void
  activeTasks: VideoGenerationTask[]
  onSetActiveTasks: React.Dispatch<
    React.SetStateAction<VideoGenerationTask[]>
  >
  humanPickerOpen: boolean
  onHumanPickerOpenChange: (open: boolean) => void
  digitalHumans: DigitalHuman[]
  digitalHumansLoading: boolean
  selectedHuman: DigitalHuman | null
  onSelectHuman: (human: DigitalHuman) => void
  onClearHuman: () => void
  onPreviewTask: (url: string) => void
}

export const StudioDialogs = ({
  materialUploadInputRef,
  onMaterialUpload,
  materialPreview,
  onCloseMaterialPreview,
  onReplaceCreativeUrl,
  resultVideoUrl,
  onResultVideoOpenChange,
  onResultVideoUrlChange,
  activeTasks,
  onSetActiveTasks,
  humanPickerOpen,
  onHumanPickerOpenChange,
  digitalHumans,
  digitalHumansLoading,
  selectedHuman,
  onSelectHuman,
  onClearHuman,
  onPreviewTask,
}: StudioDialogsProps) => {
  const humans =
    selectedHuman &&
    !digitalHumans.some((human) => human.id === selectedHuman.id)
      ? [selectedHuman, ...digitalHumans]
      : digitalHumans

  return (
    <>
      <input
        ref={materialUploadInputRef}
        type='file'
        accept='image/*,video/mp4,video/quicktime,.mp4,.mov'
        multiple
        className='hidden'
        onChange={onMaterialUpload}
      />

      <CreativeMediaPreview
        target={materialPreview}
        onClose={onCloseMaterialPreview}
        onUrlChange={onReplaceCreativeUrl}
      />

      <Dialog
        open={Boolean(resultVideoUrl)}
        onOpenChange={onResultVideoOpenChange}
      >
        <DialogContent className='overflow-hidden border-border bg-background p-0 shadow-2xl sm:max-w-3xl'>
          <DialogHeader className='border-b px-4 py-3'>
            <DialogTitle className='pr-8 text-sm font-semibold'>
              视频预览
            </DialogTitle>
          </DialogHeader>
          <div className='relative flex max-h-[75vh] min-h-[280px] items-center justify-center bg-black p-2'>
            {resultVideoUrl ? (
              <video
                key={resultVideoUrl}
                src={resultVideoUrl}
                controls
                autoPlay
                playsInline
                preload='metadata'
                className='max-h-[70vh] max-w-full rounded object-contain'
                onError={() => {
                  const previous = resultVideoUrl
                  if (!previous) return
                  void requestCreativeUrlPresign(previous)
                    .then((next) => {
                      if (!next || next === previous) return
                      onResultVideoUrlChange(next)
                      onSetActiveTasks((tasks) =>
                        tasks.map((task) => ({
                          ...task,
                          file_url:
                            task.file_url === previous ? next : task.file_url,
                          video_url:
                            task.video_url === previous ? next : task.video_url,
                        }))
                      )
                    })
                    .catch(() => {
                      /* 保留当前地址 */
                    })
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={humanPickerOpen} onOpenChange={onHumanPickerOpenChange}>
        <DialogContent className='max-h-[85vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[80vw]'>
          <DialogHeader>
            <DialogTitle>选择数字人</DialogTitle>
          </DialogHeader>
          <DigitalHumanPicker
            humans={humans}
            loading={digitalHumansLoading}
            selectedId={selectedHuman?.id}
            onSelect={onSelectHuman}
            allowNone
            noneSelected={selectedHuman === null}
            onSelectNone={onClearHuman}
          />
        </DialogContent>
      </Dialog>

      <GenerationTaskList activeTasks={activeTasks} onPreview={onPreviewTask} />
    </>
  )
}
