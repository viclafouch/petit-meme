import React from 'react'
import { Check, Clipboard } from 'lucide-react'
import { useLinkProps } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { SECOND } from '~/constants/time'
import { buildUrl } from '~/lib/seo/url'
import { m } from '~/paraglide/messages'
import { recordMemeExport } from '~/server/meme/meme.functions'

const COPY_FEEDBACK_DURATION = 2 * SECOND

type CopyStatus = 'idle' | 'copied' | 'failed'

const COPY_STATUS_MESSAGES = {
  idle: () => {
    return ''
  },
  copied: m.meme_link_copied,
  failed: m.meme_link_copy_error
} as const satisfies Record<CopyStatus, () => string>

type CopyMemeLinkButtonProps = {
  memeId: string
  onCopy?: () => void
} & Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'>

export const CopyMemeLinkButton = ({
  memeId,
  onCopy,
  ...buttonProps
}: CopyMemeLinkButtonProps) => {
  const memeLink = useLinkProps({
    to: '/memes/$memeId',
    params: { memeId }
  })
  const [copyStatus, setCopyStatus] = React.useState<CopyStatus>('idle')
  const resetTimeoutRef = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    return () => {
      window.clearTimeout(resetTimeoutRef.current)
    }
  }, [])

  const handleClick = async () => {
    onCopy?.()

    if (memeLink.href === undefined) {
      return
    }

    window.clearTimeout(resetTimeoutRef.current)
    setCopyStatus('idle')

    try {
      await navigator.clipboard.writeText(buildUrl(memeLink.href))
      void recordMemeExport({ data: { memeId, action: 'share' } })
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopyStatus('idle')
    }, COPY_FEEDBACK_DURATION)
  }

  const statusMessage = COPY_STATUS_MESSAGES[copyStatus]()

  return (
    <>
      <Button
        {...buttonProps}
        onClick={() => {
          void handleClick()
        }}
      >
        {copyStatus === 'copied' ? <Check /> : <Clipboard />}
        {statusMessage === '' ? m.meme_copy_link() : statusMessage}
      </Button>
      <output className="sr-only">{statusMessage}</output>
    </>
  )
}
