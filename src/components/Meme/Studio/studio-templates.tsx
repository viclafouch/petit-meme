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
    <div className="flex gap-2" role="radiogroup">
      {STUDIO_TEMPLATES.map((template) => {
        const isSelected = activeTemplateId === template.id

        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-active={isSelected || undefined}
            className={cn(
              'flex-1 rounded-lg border border-border px-3 py-2 text-left transition-colors cursor-pointer',
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
