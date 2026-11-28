import { ScriptOnce } from '@tanstack/react-router'
import { buildIntroSeenScript } from '~/lib/intro-once-per-session'

type IntroOncePerSessionScriptProps = {
  introKey: string
}

export const IntroOncePerSessionScript = ({
  introKey
}: IntroOncePerSessionScriptProps) => {
  return <ScriptOnce>{buildIntroSeenScript(introKey)}</ScriptOnce>
}
