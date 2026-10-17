import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

const MAX_KEYWORDS = 8
const MAX_KEYWORD_LENGTH = 30

type MessageContent = string | { type: string; text?: string }[]

type MessagesRequest = {
  model: string
  messages: { role: string; content: MessageContent }[]
}

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

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

const extractKeywords = ({ messages }: MessagesRequest) => {
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

const buildStream = ({ model, text }: { model: string; text: string }) => {
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
  const body: MessagesRequest = JSON.parse(await readBody(request))
  const text = JSON.stringify({ keywords: extractKeywords(body) })

  response.writeHead(200, { 'content-type': 'text/event-stream' })
  response.end(buildStream({ model: body.model, text }))
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')

  if (request.method === 'POST' && pathname === '/v1/messages') {
    void answerMessages(request, response)

    return
  }

  response.writeHead(request.method === 'GET' ? 200 : 404)
  response.end()
}).listen(Number(process.env.PORT))
