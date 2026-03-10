import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  Copy,
  Eye,
  Globe,
  Link2,
  Shield,
  TrendingUp
} from 'lucide-react'
import { m } from '@/paraglide/messages'

type Rule = {
  icon: LucideIcon
  getMessage: () => string
}

const RULES = [
  {
    icon: Clock,
    getMessage: () => {
      return m.submit_rule_duration()
    }
  },
  {
    icon: TrendingUp,
    getMessage: () => {
      return m.submit_rule_viral()
    }
  },
  {
    icon: Link2,
    getMessage: () => {
      return m.submit_rule_source()
    }
  },
  {
    icon: Copy,
    getMessage: () => {
      return m.submit_rule_no_duplicate()
    }
  },
  {
    icon: Globe,
    getMessage: () => {
      return m.submit_rule_language()
    }
  },
  {
    icon: Shield,
    getMessage: () => {
      return m.submit_rule_appropriate()
    }
  },
  {
    icon: Eye,
    getMessage: () => {
      return m.submit_rule_quality()
    }
  }
] as const satisfies readonly Rule[]

export const SubmissionRules = () => {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{m.submit_rules_heading()}</h2>
      <ul className="flex flex-col gap-1.5">
        {RULES.map((rule, index) => {
          const Icon = rule.icon

          return (
            <li
              key={index}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <Icon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              <span>{rule.getMessage()}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {m.submit_rules_warning()}
      </p>
    </div>
  )
}
