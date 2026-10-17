import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http'
import { text as readStreamText } from 'node:stream/consumers'
import { parseArgs } from 'node:util'
import { z } from 'zod'
import { HTTP_STATUS } from '../src/constants/http.ts'

const MAX_KEYWORDS = 8
const MAX_KEYWORD_LENGTH = 30

const MESSAGE_CONTENT_SCHEMA = z.union([
  z.string(),
  z.array(z.object({ type: z.string(), text: z.string().optional() }))
])

const MESSAGES_REQUEST_SCHEMA = z.object({
  model: z.string(),
  messages: z.array(
    z.object({ role: z.string(), content: MESSAGE_CONTENT_SCHEMA })
  )
})

type MessageContent = z.infer<typeof MESSAGE_CONTENT_SCHEMA>

type MessagesRequest = z.infer<typeof MESSAGES_REQUEST_SCHEMA>

const { values: cliOptions } = parseArgs({
  options: { port: { type: 'string' } }
})

const readText = (content: MessageContent) => {
  if (typeof content === 'string') {
    return content
  }

  return content
    .map((block) => {
      return block.text ?? ''
    })
    .join(' ')
}

type ExtractKeywordsParams = MessagesRequest

const extractKeywords = ({ messages }: ExtractKeywordsParams) => {
  const prompt = readText(messages.at(-1)?.content ?? '')

  return prompt
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS)
    .map((word) => {
      return word.slice(0, MAX_KEYWORD_LENGTH)
    })
}

const toServerSentEvent = (event: { type: string }) => {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

type BuildStreamParams = {
  model: string
  text: string
}

const buildStream = ({ model, text }: BuildStreamParams) => {
  return [
    {
      type: 'message_start',
      message: {
        id: 'msg_e2e',
        type: 'message',
        role: 'assistant',
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 }
      }
    },
    {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' }
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text }
    },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 0 }
    },
    { type: 'message_stop' }
  ]
    .map(toServerSentEvent)
    .join('')
}

const answerMessages = async (
  request: IncomingMessage,
  response: ServerResponse
) => {
  const body = MESSAGES_REQUEST_SCHEMA.parse(
    JSON.parse(await readStreamText(request))
  )
  const text = JSON.stringify({ keywords: extractKeywords(body) })

  response.writeHead(HTTP_STATUS.OK, { 'content-type': 'text/event-stream' })
  response.end(buildStream({ model: body.model, text }))
}

export const fakeAnthropicServer = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')

  if (request.method === 'POST' && pathname === '/v1/messages') {
    void answerMessages(request, response)

    return
  }

  response.writeHead(
    request.method === 'GET' ? HTTP_STATUS.OK : HTTP_STATUS.NOT_FOUND
  )
  response.end()
}).listen(Number(cliOptions.port))
