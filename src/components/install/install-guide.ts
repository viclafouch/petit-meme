import {
  EllipsisVertical,
  type LucideIcon,
  MonitorDown,
  Share,
  SquarePlus
} from 'lucide-react'
import type { InstallMethod } from '~/helpers/install-app'
import { m } from '~/paraglide/messages'

export type InstallGuideMethod = Extract<
  InstallMethod,
  'ios-guide' | 'browser-guide'
>

export type InstallGuideStep = {
  Icon: LucideIcon | null
  text: string
}

type InstallGuide = {
  description: string
  steps: InstallGuideStep[]
}

const INSTALL_GUIDES = {
  'ios-guide': () => {
    return {
      description: m.install_guide_ios_description(),
      steps: [
        { Icon: Share, text: m.install_guide_ios_step_share() },
        { Icon: SquarePlus, text: m.install_guide_ios_step_add() },
        { Icon: null, text: m.install_guide_ios_step_confirm() }
      ]
    }
  },
  'browser-guide': () => {
    return {
      description: m.install_guide_browser_description(),
      steps: [
        { Icon: EllipsisVertical, text: m.install_guide_browser_step_menu() },
        { Icon: MonitorDown, text: m.install_guide_browser_step_install() }
      ]
    }
  }
} as const satisfies Record<InstallGuideMethod, () => InstallGuide>

export const getInstallGuide = (method: InstallGuideMethod) => {
  return INSTALL_GUIDES[method]()
}

export const toInstallGuideMethod = (
  method: Exclude<InstallMethod, 'installed'>
): InstallGuideMethod => {
  return method === 'ios-guide' ? 'ios-guide' : 'browser-guide'
}
