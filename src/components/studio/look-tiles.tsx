import React from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { CaptionStage } from '~/components/studio/caption-stage'
import type { Studio } from '~/components/studio/use-studio'
import {
  CAPTION_LOOKS,
  type Caption,
  type CaptionLookId,
  type StudioMeme
} from '~/constants/studio'
import { getCaptionLook, matchHasCaptionText } from '~/helpers/caption'
import { m } from '~/paraglide/messages'

const LOOK_LABELS = {
  'white-band': () => {
    return m.studio_look_white_band()
  },
  'black-band': () => {
    return m.studio_look_black_band()
  },
  impact: () => {
    return m.studio_look_impact()
  },
  subtitle: () => {
    return m.studio_look_subtitle()
  }
} as const satisfies Record<CaptionLookId, () => string>

const buildSampleCaption = (caption: Caption, lookId: CaptionLookId) => {
  if (matchHasCaptionText(caption)) {
    return { ...caption, look: lookId }
  }

  const { defaultSlot } = getCaptionLook(lookId)
  const sample = m.studio_look_sample()

  return {
    look: lookId,
    top: defaultSlot === 'top' ? sample : '',
    bottom: defaultSlot === 'bottom' ? sample : ''
  }
}

type LookTilesProps = {
  studio: Studio
  meme: StudioMeme
}

export const LookTiles = ({ studio, meme }: LookTilesProps) => {
  const labelId = React.useId()

  return (
    <div className="studio-look-group studio-hide-while-typing">
      <p id={labelId} className="studio-look-label">
        {m.studio_looks_label()}
      </p>
      <RadioGroup<CaptionLookId>
        aria-labelledby={labelId}
        value={studio.caption.look}
        onValueChange={(lookId) => {
          studio.setLook(lookId)
        }}
        className="studio-look-tiles"
      >
        {CAPTION_LOOKS.map((look) => {
          return (
            <Radio.Root
              key={look.id}
              value={look.id}
              className="studio-look-tile"
            >
              <span className="studio-look-tile-preview" aria-hidden="true">
                <span className="studio-stage-fit">
                  <CaptionStage
                    meme={meme}
                    caption={buildSampleCaption(studio.caption, look.id)}
                    showWatermark={false}
                  />
                </span>
              </span>
              <span className="studio-look-tile-label">
                {LOOK_LABELS[look.id]()}
              </span>
            </Radio.Root>
          )
        })}
      </RadioGroup>
    </div>
  )
}
