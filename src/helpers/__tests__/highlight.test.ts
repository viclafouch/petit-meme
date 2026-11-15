import { describe, expect, it } from 'vitest'
import { parseHighlightedHtml } from '~/helpers/highlight'

describe('parseHighlightedHtml', () => {
  it('should split the highlighted words from the rest of the title', () => {
    expect(parseHighlightedHtml('Le <em>chat</em> qui danse')).toStrictEqual([
      { text: 'Le ', isHighlighted: false },
      { text: 'chat', isHighlighted: true },
      { text: ' qui danse', isHighlighted: false }
    ])
  })

  it('should give back the characters Algolia escapes', () => {
    expect(
      parseHighlightedHtml('Tom &amp; Jerry &lt;3 <em>l&#39;été</em>')
    ).toStrictEqual([
      { text: 'Tom & Jerry <3 ', isHighlighted: false },
      { text: "l'été", isHighlighted: true }
    ])
  })

  it('should keep markup a title writes as plain text', () => {
    expect(
      parseHighlightedHtml('&lt;img src=x onerror=alert(1)&gt; <em>meme</em>')
    ).toStrictEqual([
      { text: '<img src=x onerror=alert(1)> ', isHighlighted: false },
      { text: 'meme', isHighlighted: true }
    ])
  })
})
