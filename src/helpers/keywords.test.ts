import { describe, expect, it } from 'vitest'
import { keepNewKeywords } from '~/helpers/keywords'

const EASTENDERS_RECORD = [
  'Phil Mitchell qui fume - EastEnders',
  'Découvrez et téléchargez ce mème de Phil Mitchell qui fume une cigarette, l’air ÉNERVÉ.',
  'Séries',
  'feuilleton'
]

describe('keepNewKeywords', () => {
  it('should drop the keywords whose word the record already holds, ignoring case and accents', () => {
    expect(
      keepNewKeywords({
        keywords: ['phil', 'eastenders', 'cigarette', 'enerve', 'series'],
        knownTexts: EASTENDERS_RECORD
      })
    ).toStrictEqual([])
  })

  it('should keep a verb in a form the record does not hold', () => {
    expect(
      keepNewKeywords({
        keywords: ['fumer', 'clope', 'fume'],
        knownTexts: EASTENDERS_RECORD
      })
    ).toStrictEqual(['fumer', 'clope'])
  })

  it('should keep a keyword of several words when one of them is new', () => {
    expect(
      keepNewKeywords({
        keywords: ['phil mitchell', 'bully maguire'],
        knownTexts: EASTENDERS_RECORD
      })
    ).toStrictEqual(['bully maguire'])
  })

  it('should keep each new keyword once', () => {
    expect(
      keepNewKeywords({
        keywords: ['fumer', 'clope', 'Fumer '],
        knownTexts: EASTENDERS_RECORD
      })
    ).toStrictEqual(['fumer', 'clope'])
  })
})
