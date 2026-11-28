import React from 'react'
import { lazyComponent } from '~/lib/lazy-component'
import { Hero } from './hero'
import { HomeTrending } from './home-trending'

const HomeStudio = lazyComponent(async () => {
  const homeStudioModule = await import('./home-studio')

  return homeStudioModule.HomeStudio
})

const HomeMobile = lazyComponent(async () => {
  const homeMobileModule = await import('./home-mobile')

  return homeMobileModule.HomeMobile
})

export const HomePage = () => {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      <div className="container-wide flex flex-col gap-16 pb-24 lg:gap-24">
        <HomeTrending />
        <React.Suspense fallback={<div className="home-fullscreen" />}>
          <HomeStudio />
          <HomeMobile />
        </React.Suspense>
      </div>
    </div>
  )
}
