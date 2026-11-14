import { describe, expect, it } from 'vitest'
import { DAY } from '~/constants/time'
import {
  PREMIUM_INVITATION_QUIET_PERIOD_MS,
  resolveExportFollowUp
} from '~/helpers/export-follow-up'

const NOW = new Date('2026-11-14T12:00:00.000Z').getTime()

const FREE_PERSON_AFTER_AN_EXPORT = {
  isPremium: false,
  isInstallable: true,
  canShowInstallOfferHere: true,
  wasInstallOffered: false,
  premiumSnoozedAt: null,
  now: NOW
}

describe('resolveExportFollowUp', () => {
  it('should offer the app after the first export', () => {
    expect(resolveExportFollowUp(FREE_PERSON_AFTER_AN_EXPORT)).toBe('install')
  })

  it('should offer Premium once the app was already offered', () => {
    expect(
      resolveExportFollowUp({
        ...FREE_PERSON_AFTER_AN_EXPORT,
        wasInstallOffered: true
      })
    ).toBe('premium')
  })

  it('should offer Premium when the app is already installed', () => {
    expect(
      resolveExportFollowUp({
        ...FREE_PERSON_AFTER_AN_EXPORT,
        isInstallable: false
      })
    ).toBe('premium')
  })

  it('should keep the app offer for later rather than pass it over to Premium', () => {
    expect(
      resolveExportFollowUp({
        ...FREE_PERSON_AFTER_AN_EXPORT,
        canShowInstallOfferHere: false
      })
    ).toBeNull()
  })

  it('should stay quiet while a Premium invitation was seen in the last days', () => {
    expect(
      resolveExportFollowUp({
        ...FREE_PERSON_AFTER_AN_EXPORT,
        wasInstallOffered: true,
        premiumSnoozedAt: NOW - DAY
      })
    ).toBeNull()
  })

  it('should offer Premium again once the quiet period is over', () => {
    expect(
      resolveExportFollowUp({
        ...FREE_PERSON_AFTER_AN_EXPORT,
        wasInstallOffered: true,
        premiumSnoozedAt: NOW - PREMIUM_INVITATION_QUIET_PERIOD_MS
      })
    ).toBe('premium')
  })

  it('should never offer Premium to a Premium person', () => {
    expect(
      resolveExportFollowUp({
        ...FREE_PERSON_AFTER_AN_EXPORT,
        isPremium: true,
        wasInstallOffered: true
      })
    ).toBeNull()
  })

  it('should still offer the app to a Premium person', () => {
    expect(
      resolveExportFollowUp({ ...FREE_PERSON_AFTER_AN_EXPORT, isPremium: true })
    ).toBe('install')
  })
})
