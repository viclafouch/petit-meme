/* eslint-disable id-length */
import React from 'react'
import type { Variants } from 'framer-motion'
import { motion, useInView } from 'framer-motion'
import { Eye, MonitorSmartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  VideoPlayer,
  VideoPlayerContent
} from '@/components/ui/kibo-ui/video-player'
import { PageHeading2 } from '@/routes/_public__root/-components/page-headers'

const tabletVariants: Variants = {
  offscreen: {
    rotate: -30,
    x: -200,
    opacity: 0.3
  },
  onscreen: {
    rotate: -8,
    opacity: 1,
    x: 0,
    transition: {
      type: 'keyframes',
      duration: 0.5,
      delay: 0.2
    }
  }
}

const desktopVariants: Variants = {
  offscreen: {
    y: 100,
    opacity: 0.1
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'keyframes',
      duration: 0.5,
      delay: 0
    }
  }
}

const mobileVariants: Variants = {
  offscreen: {
    rotate: 10,
    x: 100,
    opacity: 0.3
  },
  onscreen: {
    rotate: 0,
    opacity: 1,
    x: 0,
    transition: {
      type: 'keyframes',
      duration: 0.5,
      delay: 0.7
    }
  }
}

const infoVariants: Variants = {
  offscreen: {
    y: 100,
    opacity: 0.1
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'keyframes',
      duration: 0.6,
      delay: 0
    }
  }
}

export const Responsive = () => {
  const tabletVideoRef = React.useRef<HTMLVideoElement>(null)
  const mobileVideoRef = React.useRef<HTMLVideoElement>(null)
  const desktopVideoRef = React.useRef<HTMLVideoElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const isInView = useInView(containerRef, {
    once: true
  })

  React.useEffect(() => {
    if (isInView) {
      void tabletVideoRef.current?.play()
      void mobileVideoRef.current?.play()
      void desktopVideoRef.current?.play()
    }
  }, [isInView])

  return (
    <div className="relative dark" ref={containerRef}>
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <Badge variant="secondary">Application multiplateforme</Badge>
        <PageHeading2 className="mb-4 mt-2 scroll-m-20">
          Ton application, partout
        </PageHeading2>
        <p className="text-muted-foreground mb-8 text-xl">
          Petit Mème s’adapte à toi : une expérience fluide et réactive sur
          mobile, tablette et ordinateur, sans rien installer.
        </p>
      </div>
      <motion.div
        className="relative mx-auto max-w-5xl lg:[&_video]:blur-sm max-lg:[&_video+div]:hidden [&:not(:has(video:hover))]:[&>:first-child_video]:blur-none [&_video]:hover:blur-none [&_video:hover]:[&+div]:scale-0 [&_video]:transition-[filter] [&_video]:duration-500 [&:not(:has(video:hover))]:[&>:first-child_video+div]:scale-0"
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ amount: 0.4, once: true }}
      >
        <motion.div
          data-slot="card"
          data-card
          className="bg-card text-card-foreground flex flex-col gap-0 rounded-xl pt-6 overflow-hidden border-2 shadow-2xl"
          variants={desktopVariants}
        >
          <div className="bg-muted flex items-center gap-2 border-b px-2 md:px-4 py-1 md:py-3">
            <div className="flex gap-1 md:gap-2 [&>div]:size-2 md:[&>div]:size-3">
              <div className="rounded-full bg-red-500" />
              <div className="rounded-full bg-yellow-500" />
              <div className="rounded-full bg-green-500" />
            </div>
          </div>
          <div className="bg-muted aspect-[16/9] relative">
            <VideoPlayer className="overflow-hidden w-full h-full max-h-full dark relative">
              <VideoPlayerContent
                crossOrigin=""
                className="w-full h-full"
                playsInline
                loop
                muted
                ref={desktopVideoRef}
                src="/videos/desktop.mp4"
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
              />
              <div className="absolute top-1/2 left-1/2 size-10 z-10 rounded-full bg-white/30 flex items-center justify-center -translate-1/2 transition-transform">
                <Eye />
              </div>
            </VideoPlayer>
          </div>
        </motion.div>
        <motion.div
          data-slot="card"
          className="bg-card text-card-foreground flex flex-col gap-0 rounded-xl pt-3 md:pt-6 absolute lg:top-1/3 bottom-0 lg:bottom-auto lg:-right-8 right-0 lg:w-60 w-24 sm:w-36 overflow-hidden border-2 shadow-2xl"
          variants={mobileVariants}
        >
          <div className="bg-muted items-center justify-center border-b py-1 md:py-2 flex">
            <div className="bg-muted-foreground/20 h-1 md:h-2 w-10 md:w-16 rounded-full" />
          </div>
          <div className="bg-muted aspect-[9/16]">
            <VideoPlayer className="overflow-hidden w-full h-full max-h-full dark">
              <VideoPlayerContent
                crossOrigin=""
                className="w-full h-full"
                playsInline
                loop
                muted
                src="/videos/mobile.mp4"
                ref={mobileVideoRef}
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
              />
              <div className="absolute top-1/2 left-1/2 size-10 z-10 rounded-full bg-white/30 flex items-center justify-center -translate-1/2 transition-transform">
                <Eye />
              </div>
            </VideoPlayer>
          </div>
        </motion.div>
        <motion.div
          data-slot="card"
          className="bg-card text-card-foreground flex-col gap-0 rounded-xl pb-6 absolute top-1/4 -left-8 w-80 overflow-hidden border-2 shadow-2xl hidden lg:flex"
          variants={tabletVariants}
        >
          <div className="bg-card items-center justify-center border-b py-3 hidden lg:flex">
            <div className="bg-muted-foreground/20 size-2 rounded-full" />
          </div>
          <div className="bg-muted aspect-[4/3]">
            <VideoPlayer className="overflow-hidden w-full h-full max-h-full dark">
              <VideoPlayerContent
                crossOrigin=""
                className="h-full w-full"
                playsInline
                loop
                muted
                ref={tabletVideoRef}
                src="/videos/tablet.mp4"
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
              />
              <div className="absolute top-1/2 left-1/2 size-10 z-10 rounded-full bg-white/30 flex items-center justify-center -translate-1/2 transition-transform">
                <Eye />
              </div>
            </VideoPlayer>
          </div>
        </motion.div>
        <motion.div
          className="absolute lg:top-0 lg:right-0 flex gap-4 bottom-0 left-0 lg:left-auto lg:bottom-auto"
          variants={infoVariants}
        >
          <div
            data-slot="card"
            className="bg-card text-card-foreground flex flex-col gap-2 rounded-xl border shadow-sm animate-float-slow md:p-4 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
                <MonitorSmartphone size={14} />
              </div>
              <p className="font-medium text-sm md:text-md">Responsive</p>
            </div>
            <p className="text-muted-foreground text-xs md:text-sm max-w-[180px]">
              S&apos;adapte parfaitement à toutes les tailles d&apos;écran
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
