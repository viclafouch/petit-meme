import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '~/components/ui/button'
import { m } from '~/paraglide/messages.js'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'

const CONFETTI_DELAY_MS = 300

const showCanvas = async (canvasElement: HTMLCanvasElement) => {
  const confetti = await import('canvas-confetti')
  const myConfetti = confetti.create(canvasElement, {
    resize: true,
    useWorker: true
  })

  await myConfetti({
    particleCount: 100,
    spread: 160
  })
}

export const CheckoutSuccessPage = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const isReducedMotion = useReducedMotion() === true

  React.useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    setTimeout(() => {
      void showCanvas(canvas)
    }, CONFETTI_DELAY_MS)
  }, [])

  return (
    <motion.div
      initial={isReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8 items-center pt-20"
    >
      <PageHeading>{m.checkout_success_heading()}</PageHeading>
      <PageDescription>{m.checkout_success_description()}</PageDescription>
      <Link
        className={buttonVariants({
          variant: 'defaultWithOutline',
          size: 'xl'
        })}
        to="/"
      >
        {m.checkout_success_back()}
      </Link>
      <canvas
        ref={canvasRef}
        className="fixed size-full inset-0 -z-10"
        aria-hidden="true"
      />
    </motion.div>
  )
}
