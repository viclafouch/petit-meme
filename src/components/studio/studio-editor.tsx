import React from 'react'
import ReactDOM from 'react-dom'
import { Plus, X } from 'lucide-react'
import { CaptionStage } from '~/components/studio/caption-stage'
import { ExportActions, RenderIssue } from '~/components/studio/export-actions'
import { LookTiles } from '~/components/studio/look-tiles'
import type { Studio } from '~/components/studio/use-studio'
import {
  CAPTION_SLOT_LABELS,
  CAPTION_SLOTS,
  type Caption,
  type CaptionLookId,
  type CaptionSlot,
  type StudioMeme
} from '~/constants/studio'
import {
  getCaptionLook,
  getOtherCaptionSlot,
  listFilledCaptionSlots,
  matchHasSlotText
} from '~/helpers/caption'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

const REMOVE_SLOT_LABELS = {
  top: () => {
    return m.studio_remove_top()
  },
  bottom: () => {
    return m.studio_remove_bottom()
  }
} as const satisfies Record<CaptionSlot, () => string>

type KeptSlots = {
  lookId: CaptionLookId
  slots: CaptionSlot[]
}

const useOpenSlots = (caption: Caption) => {
  const look = getCaptionLook(caption.look)
  const [focusedSlot, setFocusedSlot] = React.useState<CaptionSlot | null>(null)
  const filledSlots = listFilledCaptionSlots(caption)
  const initialSlots = filledSlots.length > 0 ? filledSlots : [look.defaultSlot]
  const [kept, setKept] = React.useState<KeptSlots>({
    lookId: look.id,
    slots: initialSlots
  })

  if (kept.lookId !== look.id) {
    setKept({ lookId: look.id, slots: initialSlots })
  }

  const openSlots = CAPTION_SLOTS.filter((slot) => {
    return (
      matchHasSlotText(caption, slot) ||
      slot === focusedSlot ||
      kept.slots.includes(slot)
    )
  })

  const updateKeptSlots = (
    update: (previous: CaptionSlot[]) => CaptionSlot[]
  ) => {
    setKept((previous) => {
      return { lookId: previous.lookId, slots: update(previous.slots) }
    })
  }

  return {
    openSlots,
    setFocusedSlot,
    keep: (slot: CaptionSlot) => {
      updateKeptSlots((previous) => {
        return previous.includes(slot) ? previous : [...previous, slot]
      })
    },
    remove: (slot: CaptionSlot) => {
      setFocusedSlot(null)
      updateKeptSlots((previous) => {
        const remaining = previous.filter((keptSlot) => {
          return keptSlot !== slot
        })
        const hasOtherText = matchHasSlotText(
          caption,
          getOtherCaptionSlot(slot)
        )

        return remaining.length > 0 || hasOtherText
          ? remaining
          : [look.defaultSlot]
      })
    }
  }
}

type SlotRowProps = {
  slot: CaptionSlot
  isOpen: boolean
  canRemove: boolean
  onAdd: (slot: CaptionSlot) => void
  onRemove: (slot: CaptionSlot) => void
}

const preventFieldBlur = (event: React.PointerEvent) => {
  event.preventDefault()
}

const SlotRow = ({
  slot,
  isOpen,
  canRemove,
  onAdd,
  onRemove
}: SlotRowProps) => {
  return (
    <div className="studio-slot-row">
      {isOpen && !canRemove ? null : (
        <button
          type="button"
          onPointerDown={isOpen ? preventFieldBlur : undefined}
          onClick={() => {
            if (isOpen) {
              onRemove(slot)
            } else {
              onAdd(slot)
            }
          }}
          className={cn(
            'pill pill-sm studio-slot-chip',
            isOpen ? 'pill-quiet' : 'pill-veil'
          )}
          data-action={isOpen ? 'remove' : 'add'}
        >
          {isOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {isOpen ? REMOVE_SLOT_LABELS[slot]() : CAPTION_SLOT_LABELS[slot]()}
        </button>
      )}
    </div>
  )
}

type StudioEditorProps = {
  studio: Studio
  meme: StudioMeme
}

export const StudioEditor = ({ studio, meme }: StudioEditorProps) => {
  const slots = useOpenSlots(studio.caption)
  const inputsRef = React.useRef(new Map<CaptionSlot, HTMLTextAreaElement>())
  const { openSlots } = slots

  const addSlot = (slot: CaptionSlot) => {
    studio.choosePlacement()
    ReactDOM.flushSync(() => {
      slots.keep(slot)
    })
    inputsRef.current.get(slot)?.focus()
  }

  const removeSlot = (slot: CaptionSlot) => {
    studio.choosePlacement()
    ReactDOM.flushSync(() => {
      studio.setText(slot, '')
      slots.remove(slot)
    })
    inputsRef.current.get(slot)?.focus()
  }

  const canRemove = (slot: CaptionSlot) => {
    return matchHasSlotText(studio.caption, slot) || openSlots.length > 1
  }

  const renderSlotRow = (slot: CaptionSlot) => {
    return (
      <SlotRow
        slot={slot}
        isOpen={openSlots.includes(slot)}
        canRemove={canRemove(slot)}
        onAdd={addSlot}
        onRemove={removeSlot}
      />
    )
  }

  return (
    <div className="studio-editor">
      <section
        aria-label={m.studio_preview_label()}
        className="studio-editor-stage"
      >
        {renderSlotRow('top')}
        <CaptionStage
          meme={meme}
          caption={studio.caption}
          openSlots={openSlots}
          showWatermark={!studio.isPremium}
          field={{
            placeholder: m.studio_caption_placeholder(),
            onChange: studio.setText,
            onFocusSlot: slots.setFocusedSlot,
            inputRef: (slot, element) => {
              if (element === null) {
                inputsRef.current.delete(slot)
              } else {
                inputsRef.current.set(slot, element)
              }
            }
          }}
        />
        {renderSlotRow('bottom')}
      </section>
      <div className="studio-editor-tools">
        <LookTiles studio={studio} meme={meme} />
        <RenderIssue studio={studio} />
        <ExportActions studio={studio} />
      </div>
    </div>
  )
}
