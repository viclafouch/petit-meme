import { Volume2, VolumeX } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { LOGO_PATH } from '~/constants/branding'
import { m } from '~/paraglide/messages'
import type { ReelsSound } from '~/routes/reels/-lib/reels-playback'

type ReelsTopBarProps = {
  sound: ReelsSound
  onSoundChange: (sound: ReelsSound) => void
}

export const ReelsTopBar = ({ sound, onSoundChange }: ReelsTopBarProps) => {
  const isSoundOn = sound === 'on'
  const SoundIcon = isSoundOn ? Volume2 : VolumeX

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-linear-to-b from-black/50 to-transparent px-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-6">
      <Link
        to="/"
        className="pointer-events-auto grid size-12 place-items-center rounded-full touch-tap outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src={LOGO_PATH}
          alt={m.common_logo_alt()}
          width={28}
          height={28}
          decoding="async"
        />
      </Link>
      <Button
        variant="ghost"
        aria-label={isSoundOn ? m.meme_mute() : m.meme_unmute()}
        className="pointer-events-auto h-12 min-w-12 rounded-full px-3 text-white touch-tap [&>svg]:size-6! [&>svg]:drop-shadow-md"
        onClick={() => {
          onSoundChange(isSoundOn ? 'muted' : 'on')
        }}
      >
        {sound === 'blocked' ? (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black">
            {m.meme_unmute()}
          </span>
        ) : null}
        <SoundIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
