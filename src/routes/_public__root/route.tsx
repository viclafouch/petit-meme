import React from 'react'
import { StarsBackground } from '@/components/animate-ui/backgrounds/stars'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { createFileRoute, Outlet } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <StarsBackground>
      <div className="z-10 relative min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
        >
          Aller au contenu principal
        </a>
        <Navbar />
        <main id="main-content" className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
    </StarsBackground>
  )
}

export const Route = createFileRoute('/_public__root')({
  component: RouteComponent
})
