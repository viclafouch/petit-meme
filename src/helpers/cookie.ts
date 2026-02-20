import { createClientOnlyFn } from '@tanstack/react-start'

export const readClientCookie = createClientOnlyFn((name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))

  return match?.[1]
})

type WriteClientCookieOptions = {
  maxAge: number
  sameSite?: 'Lax' | 'Strict' | 'None'
  secure?: boolean
  path?: string
}

export const createClientCookie = createClientOnlyFn(
  (name: string, value: string, options: WriteClientCookieOptions) => {
    const parts = [
      `${name}=${value}`,
      `path=${options.path ?? '/'}`,
      `max-age=${options.maxAge}`,
      `SameSite=${options.sameSite ?? 'Lax'}`
    ]

    if (options.secure) {
      parts.push('Secure')
    }

    document.cookie = parts.join('; ')
  }
)
