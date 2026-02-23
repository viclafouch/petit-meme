import { STUDIO_TEMPLATES } from '@/constants/studio'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/stores/studio.store'

export const StudioTemplates = () => {
  const activeTemplateId = useStudioStore((state) => {
    return state.activeTemplateId
  })
  const applyTemplate = useStudioStore((state) => {
    return state.applyTemplate
  })

  return (
    <div className="flex gap-2">
      {STUDIO_TEMPLATES.map((template) => {
        return (
          <button
            key={template.id}
            type="button"
            data-active={activeTemplateId === template.id}
            className={cn(
              'flex-1 rounded-lg border border-border p-3 text-left transition-colors cursor-pointer',
              'data-active:border-primary data-active:bg-accent'
            )}
            onClick={() => {
              applyTemplate(template.id)
            }}
          >
            <p className="text-sm font-medium">{template.label}</p>
            <p className="text-xs text-muted-foreground">
              {template.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}
