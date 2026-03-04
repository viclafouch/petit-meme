import type { LucideIcon } from 'lucide-react'
import {
  Bug,
  CreditCard,
  Database,
  ExternalLink,
  Globe,
  Mail,
  Rabbit,
  Search,
  Sparkles,
  Twitter
} from 'lucide-react'
import { clientEnv } from '@/env/client'
import { cn } from '@/lib/utils'

type ServiceConfig = {
  label: string
  icon: LucideIcon
  dashboardUrl: string
  accentClass: string
}

export const SERVICES = [
  {
    label: 'Algolia',
    icon: Search,
    dashboardUrl: `https://dashboard.algolia.com/apps/${clientEnv.VITE_ALGOLIA_APP_ID}/`,
    accentClass:
      'bg-blue-500/15 text-blue-500 dark:bg-blue-400/15 dark:text-blue-400'
  },
  {
    label: 'Bunny CDN',
    icon: Rabbit,
    dashboardUrl: 'https://dash.bunny.net/',
    accentClass:
      'bg-orange-500/15 text-orange-500 dark:bg-orange-400/15 dark:text-orange-400'
  },
  {
    label: 'Stripe',
    icon: CreditCard,
    dashboardUrl: 'https://dashboard.stripe.com/',
    accentClass:
      'bg-violet-500/15 text-violet-500 dark:bg-violet-400/15 dark:text-violet-400'
  },
  {
    label: 'Resend',
    icon: Mail,
    dashboardUrl: 'https://resend.com/',
    accentClass:
      'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-400/15 dark:text-emerald-400'
  },
  {
    label: 'Database (Neon)',
    icon: Database,
    dashboardUrl: 'https://console.neon.tech/',
    accentClass:
      'bg-cyan-500/15 text-cyan-500 dark:bg-cyan-400/15 dark:text-cyan-400'
  },
  {
    label: 'Sentry',
    icon: Bug,
    dashboardUrl: 'https://sentry.io/',
    accentClass:
      'bg-pink-500/15 text-pink-500 dark:bg-pink-400/15 dark:text-pink-400'
  },
  {
    label: 'Vercel',
    icon: Globe,
    dashboardUrl: 'https://vercel.com/',
    accentClass: 'bg-foreground/10 text-foreground'
  },
  {
    label: 'Gemini',
    icon: Sparkles,
    dashboardUrl: 'https://aistudio.google.com/',
    accentClass:
      'bg-amber-500/15 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400'
  },
  {
    label: 'X (Twitter)',
    icon: Twitter,
    dashboardUrl: 'https://console.x.com/',
    accentClass: 'bg-foreground/10 text-foreground'
  }
] as const satisfies readonly ServiceConfig[]

type ServiceCardParams = {
  service: (typeof SERVICES)[number]
}

export const ServiceCard = ({ service }: ServiceCardParams) => {
  const Icon = service.icon

  return (
    <a
      href={service.dashboardUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
      aria-label={`${service.label} (ouvre dans un nouvel onglet)`}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          service.accentClass
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <span className="flex-1 text-sm font-medium">{service.label}</span>
      <ExternalLink
        className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </a>
  )
}
