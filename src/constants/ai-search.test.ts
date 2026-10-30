import { describe, expect, it } from 'vitest'
import {
  AI_SEARCH_INPUT_SCHEMA,
  MAX_PROMPT_LENGTH
} from '~/constants/ai-search'

describe('the AI search input schema', () => {
  it('should keep a prompt written over several lines', () => {
    const result = AI_SEARCH_INPUT_SCHEMA.safeParse({
      prompt: '  un chat\nqui tombe\tdu canapé\r\n  '
    })

    expect(result.data).toStrictEqual({
      prompt: 'un chat\nqui tombe\tdu canapé'
    })
  })

  it.each([
    ['nothing but whitespace', ' \n\t '],
    ['one character too many', 'a'.repeat(MAX_PROMPT_LENGTH + 1)],
    ['text and a NUL byte', 'chat\u0000'],
    ['text and an escape character', 'chat\u001B[31m'],
    ['text and a delete character', 'chat\u007F'],
    ['text and a C1 control character', 'chat\u0085']
  ])('should reject a prompt made of %s', (_, prompt) => {
    const result = AI_SEARCH_INPUT_SCHEMA.safeParse({ prompt })

    expect(result.success).toBe(false)
  })
})
