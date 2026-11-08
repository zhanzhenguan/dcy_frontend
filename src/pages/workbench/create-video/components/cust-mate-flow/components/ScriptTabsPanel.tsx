import { cn } from '@/utils/utils'

type ScriptTab = {
  id: string
  title: string
}

type ScriptTabsPanelProps = {
  scriptTabs: ScriptTab[]
  selectedScriptTab: string
  promptFocused: boolean
  onSelectScriptTab: (tabId: string) => void
}

export const ScriptTabsPanel = ({
  scriptTabs,
  selectedScriptTab,
  promptFocused,
  onSelectScriptTab,
}: ScriptTabsPanelProps) => {
  return (
    <div className='mt-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto'>
      {scriptTabs.map((script) => {
        const selected = selectedScriptTab === script.id
        const highlight = selected && promptFocused
        return (
          <button
            key={script.id}
            type='button'
            onClick={() => onSelectScriptTab(script.id)}
            className={cn(
              'relative shrink-0 px-3 py-3 text-center text-sm transition-colors duration-200',
              selected
                ? cn(
                    'bg-surface z-20 w-full rounded-l-md rounded-r-none border-2 border-r-0 shadow-[2px_0_0_0_var(--surface)]',
                    highlight
                      ? 'border-primary text-primary font-semibold'
                      : 'border-border text-foreground font-medium'
                  )
                : 'text-foreground/80 hover:text-foreground bg-surface z-0 mr-1.5 rounded-md border border-transparent hover:bg-black/5 dark:hover:bg-white/10'
            )}
          >
            {script.title}
          </button>
        )
      })}
    </div>
  )
}
