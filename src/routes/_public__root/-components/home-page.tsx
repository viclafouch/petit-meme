import { BestMemes } from './best-memes'
import { Faq } from './faq'
import { Hero } from './hero'
import { PageContainer } from './page-headers'
import { Responsive } from './responsive'

export const HomePage = () => {
  return (
    <PageContainer>
      <section className="flex w-full flex-col py-30 pb-10 sm:pt-42">
        <Hero />
        <div className="container lg:mt-36 mt-24">
          <BestMemes />
          <div className="mt-16">
            <Responsive />
          </div>
          <div className="mt-16 lg:mt-40">
            <Faq />
          </div>
        </div>
      </section>
    </PageContainer>
  )
}
