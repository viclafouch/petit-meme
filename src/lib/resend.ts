import { Resend } from 'resend'
import { serverEnv } from '@/env/server'

export const resendClient = new Resend(serverEnv.RESEND_SECRET)
