import { setResponseStatus } from '@tanstack/react-start/server'
import type { HTTP_STATUS } from '~/constants/http'

type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

export const throwWithStatus = (status: HttpStatus, error: Error): never => {
  setResponseStatus(status)
  throw error
}
