import { describe, expect, it } from 'vitest'
import { serializeJsonLd } from '~/helpers/json-ld'

describe('serializeJsonLd', () => {
  it('should keep a closing script tag in a title from ending the script', () => {
    const serialized = serializeJsonLd({
      name: '</script><script>alert(1)</script>'
    })

    expect(serialized).not.toContain('<')
    expect(serialized).toBe(
      '{"name":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}'
    )
  })

  it('should keep an HTML comment opener from changing the script parsing', () => {
    expect(serializeJsonLd({ name: '<!--' })).toBe('{"name":"\\u003c!--"}')
  })

  it('should parse back to the same value', () => {
    const value = { name: 'a < b', items: [{ position: 1 }] }

    expect(JSON.parse(serializeJsonLd(value))).toStrictEqual(value)
  })
})
