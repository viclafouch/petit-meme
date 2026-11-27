import type React from 'react'
import { Lock, MousePointerClick, ShieldCheck } from 'lucide-react'
import { m } from '~/paraglide/messages'

type StatItem = {
  value: string
  label: string
}

export const getStatItems = (): StatItem[] => {
  return [
    {
      value: m.pricing_stat_memes_value(),
      label: m.pricing_stat_memes_label()
    },
    {
      value: m.pricing_stat_videos_value(),
      label: m.pricing_stat_videos_label()
    },
    { value: m.pricing_stat_users_value(), label: m.pricing_stat_users_label() }
  ]
}

type GuaranteeItem = {
  icon: React.ElementType
  label: string
}

export const getGuaranteeItems = (): GuaranteeItem[] => {
  return [
    { icon: Lock, label: m.pricing_guarantee_no_commitment() },
    { icon: MousePointerClick, label: m.pricing_guarantee_one_click_cancel() },
    { icon: ShieldCheck, label: m.pricing_guarantee_secure_payment() }
  ]
}
