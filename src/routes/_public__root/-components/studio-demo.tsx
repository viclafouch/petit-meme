import { Check, Download } from 'lucide-react'
import { CaptionStage } from '~/components/studio/caption-stage'
import studioCss from '~/components/studio/studio.css?url'
import type { CaptionLookId, StudioMeme } from '~/constants/studio'
import { buildVideoPreviewUrl } from '~/lib/bunny-public-urls'
import { m } from '~/paraglide/messages'

const STAGE_LOOKS = [
  'impact',
  'white-band',
  'subtitle'
] as const satisfies readonly CaptionLookId[]

const TAP_CLASS_NAME =
  'studio-demo-tap pointer-events-none absolute top-1/2 left-1/2 size-9 -translate-1/2 rounded-full bg-veil-heavy opacity-0 ring-1 ring-veil-dense'

const getLookTiles = () => {
  return [
    { id: 'white-band', label: m.studio_look_white_band() },
    { id: 'black-band', label: m.studio_look_black_band() },
    { id: 'impact', label: m.studio_look_impact() },
    { id: 'subtitle', label: m.studio_look_subtitle() }
  ] as const satisfies readonly { id: CaptionLookId; label: string }[]
}

type StudioDemoProps = {
  meme: StudioMeme
}

export const StudioDemo = ({ meme }: StudioDemoProps) => {
  const caption = {
    top: m.home_studio_demo_top(),
    bottom: m.home_studio_demo_bottom()
  }
  const fields = [
    { slot: 'top', label: m.studio_add_top(), text: caption.top },
    { slot: 'bottom', label: m.studio_add_bottom(), text: caption.bottom }
  ] as const

  return (
    <figure
      className="relative mx-auto w-full max-w-120"
      style={{
        '--top-chars': caption.top.length,
        '--bottom-chars': caption.bottom.length,
        '--demo-preview': `url("${buildVideoPreviewUrl(meme.bunnyId)}")`
      }}
    >
      <link rel="stylesheet" href={studioCss} precedence="default" />
      <figcaption className="sr-only">{m.home_studio_demo_label()}</figcaption>
      <div
        aria-hidden="true"
        className="flex flex-col gap-4 rounded-4xl border bg-card p-3 shadow-(--shadow-stage) sm:p-4"
      >
        <div className="grid aspect-4/3 overflow-hidden rounded-xl bg-black [container-type:size]">
          {STAGE_LOOKS.map((look) => {
            return (
              <div
                key={look}
                className="studio-demo-layer col-start-1 row-start-1 grid min-h-0 place-items-center"
                data-look={look}
              >
                <CaptionStage
                  meme={meme}
                  caption={{ look, ...caption }}
                  showWatermark={false}
                />
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fields.map((field) => {
            return (
              <span
                key={field.slot}
                className="studio-demo-field relative flex min-h-14 flex-col gap-0.5 rounded-xl bg-secondary px-3 py-2"
                data-slot={field.slot}
              >
                <span className="text-2xs font-medium text-muted-foreground">
                  {field.label}
                </span>
                <span className="studio-demo-typed relative self-start overflow-hidden text-sm font-semibold whitespace-nowrap">
                  {field.text}
                </span>
                <span className={TAP_CLASS_NAME} />
              </span>
            )
          })}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {getLookTiles().map((tile) => {
            return (
              <span
                key={tile.id}
                className="studio-demo-tile relative grid h-10 place-items-center rounded-xl bg-secondary text-xs font-semibold"
                data-look={tile.id}
              >
                {tile.label}
                {tile.id === 'black-band' ? null : (
                  <span className={TAP_CLASS_NAME} />
                )}
              </span>
            )
          })}
        </div>
        <span className="studio-demo-download relative grid h-12 place-items-center overflow-hidden rounded-full bg-(image:--gradient-brand) text-md font-bold text-(--color-brand-foreground)">
          <span className="studio-demo-progress absolute inset-0 origin-left scale-x-0 bg-veil-dense" />
          <span
            className="studio-demo-label col-start-1 row-start-1 inline-flex items-center gap-2"
            data-step="idle"
          >
            <Download className="size-4" />
            {m.home_studio_demo_download()}
          </span>
          <span
            className="studio-demo-label col-start-1 row-start-1 inline-flex items-center gap-2"
            data-step="busy"
          >
            {m.studio_preparing_download()}
          </span>
          <span
            className="studio-demo-label col-start-1 row-start-1 inline-flex items-center gap-2"
            data-step="done"
          >
            <Check className="size-4" />
            {m.studio_downloaded()}
          </span>
          <span className={TAP_CLASS_NAME} />
        </span>
      </div>
      <span
        aria-hidden="true"
        className="studio-demo-toast absolute inset-x-6 -top-7 flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background opacity-0 shadow-xl"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-green text-black">
          <Check className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">
            {m.studio_export_done_download()}
          </span>
          <span className="truncate text-xs opacity-70">
            {m.home_studio_demo_file()}
          </span>
        </span>
      </span>
    </figure>
  )
}
