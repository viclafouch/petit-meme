import React from 'react'
import { ChevronLeft, Wrench } from 'lucide-react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { useMatch, useRouteContext } from '@tanstack/react-router'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { ANNOUNCEMENT_BANNER_DISMISSAL } from '~/constants/banner'
import { dismissBanner, isBannerDismissed } from '~/lib/banner-dismissal'
import { createClientCookie } from '~/lib/cookie'
import {
  PREMIUM_OVERRIDES,
  writePremiumOverride,
  type PremiumOverride
} from '~/lib/premium-override'
import {
  BREAK_UI_DATASETS,
  useBreakUiDataset,
  type BreakUiDataset
} from '~/routes/_public__root/memes/-lib/break-ui-fixtures'
import './dev-toolbar.css'

const COLLAPSED_STORAGE_KEY = 'devToolbarCollapsed'

const PREMIUM_LABELS = {
  free: 'Gratuit',
  premium: 'Premium'
} as const satisfies Record<PremiumOverride, string>

const DATASET_LABELS = {
  demo: 'Démo',
  worst: 'Pire cas',
  empty: 'Vide',
  one: 'Un seul'
} as const satisfies Record<BreakUiDataset, string>

const applyPremiumOverride = (plan: PremiumOverride) => {
  writePremiumOverride(plan)
  window.location.reload()
}

const showDataset = (dataset: BreakUiDataset) => {
  const url = new URL(window.location.href)
  url.searchParams.set('data', dataset)
  window.location.assign(url)
}

const PremiumControl = () => {
  const isPremium = useIsPremium()
  const currentPlan: PremiumOverride = isPremium ? 'premium' : 'free'

  return (
    <RadioGroup
      aria-label="Accès Premium"
      value={currentPlan}
      onValueChange={applyPremiumOverride}
      className="dev-toolbar-track"
    >
      {PREMIUM_OVERRIDES.map((plan) => {
        return (
          <Radio.Root key={plan} value={plan} className="dev-toolbar-segment">
            {PREMIUM_LABELS[plan]}
          </Radio.Root>
        )
      })}
    </RadioGroup>
  )
}

const BannerControl = () => {
  const isBannerShown = !isBannerDismissed(ANNOUNCEMENT_BANNER_DISMISSAL)

  const handleClick = () => {
    if (isBannerShown) {
      dismissBanner(ANNOUNCEMENT_BANNER_DISMISSAL)
    } else {
      createClientCookie(ANNOUNCEMENT_BANNER_DISMISSAL.cookieKey, '', {
        maxAge: 0
      })
    }

    window.location.reload()
  }

  return (
    <div className="dev-toolbar-track">
      <button
        type="button"
        aria-pressed={isBannerShown}
        onClick={handleClick}
        className="dev-toolbar-segment"
      >
        Bannière
      </button>
    </div>
  )
}

const DatasetControl = () => {
  const dataset = useBreakUiDataset()

  return (
    <RadioGroup
      aria-label="Données de la page"
      value={dataset}
      onValueChange={showDataset}
      className="dev-toolbar-track"
    >
      {BREAK_UI_DATASETS.map((key) => {
        return (
          <Radio.Root key={key} value={key} className="dev-toolbar-segment">
            {DATASET_LABELS[key]}
          </Radio.Root>
        )
      })}
    </RadioGroup>
  )
}

export const DevToolbar = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const memeMatch = useMatch({
    from: '/_public__root/memes/$memeId',
    shouldThrow: false
  })
  const publicLayoutMatch = useMatch({
    from: '/_public__root',
    shouldThrow: false
  })
  const embedMatch = useMatch({ from: '/embed/$memeId', shouldThrow: false })
  const adminMatch = useMatch({ from: '/admin', shouldThrow: false })
  const studioMatch = useMatch({
    from: '/_public__root/memes/$memeId/studio',
    shouldThrow: false
  })
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  })

  const handleToggleCollapsed = () => {
    setIsCollapsed((wasCollapsed) => {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(!wasCollapsed))

      return !wasCollapsed
    })
  }

  if (embedMatch || adminMatch || studioMatch) {
    return null
  }

  return (
    <aside aria-label="Outils de dev" className="dev-toolbar">
      <div className="dev-toolbar-row">
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-label={
            isCollapsed
              ? 'Déplier les outils de dev'
              : 'Replier les outils de dev'
          }
          onClick={handleToggleCollapsed}
          className="dev-toolbar-handle"
        >
          <span className="dev-toolbar-handle-icon">
            {isCollapsed ? (
              <Wrench aria-hidden="true" />
            ) : (
              <ChevronLeft aria-hidden="true" />
            )}
          </span>
        </button>
        {isCollapsed ? null : (
          <>
            {user ? (
              <PremiumControl />
            ) : (
              <div className="dev-toolbar-track">
                <span className="dev-toolbar-visitor">Visiteur</span>
              </div>
            )}
            {publicLayoutMatch ? <BannerControl /> : null}
            {memeMatch ? <DatasetControl /> : null}
          </>
        )}
      </div>
    </aside>
  )
}
