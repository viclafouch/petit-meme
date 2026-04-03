import Anthropic from '@anthropic-ai/sdk'
import { serverEnv } from '~/env/server'

export const anthropicClient = new Anthropic({
  apiKey: serverEnv.ANTHROPIC_API_KEY
})
