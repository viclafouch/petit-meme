import { describe, expect, it } from 'vitest'
import { getSuggestedLocale, parseAcceptLanguage } from '~/helpers/locale'

describe('parseAcceptLanguage', () => {
  it('should keep the languages in the order the browser sent them', () => {
    expect(
      parseAcceptLanguage('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7')
    ).toStrictEqual(['fr-FR', 'fr', 'en-US', 'en'])
  })

  it('should return no language for an empty header', () => {
    expect(parseAcceptLanguage('')).toStrictEqual([])
  })
})

describe('getSuggestedLocale', () => {
  it('should suggest the browser language when the page speaks another one', () => {
    expect(
      getSuggestedLocale({
        browserLanguages: ['fr-FR', 'en'],
        currentLocale: 'en',
        availableLocales: ['fr', 'en']
      })
    ).toBe('fr')
  })

  it('should suggest nothing when the page already speaks the browser language', () => {
    expect(
      getSuggestedLocale({
        browserLanguages: ['en-US', 'fr'],
        currentLocale: 'en',
        availableLocales: ['fr', 'en']
      })
    ).toBeNull()
  })
})
