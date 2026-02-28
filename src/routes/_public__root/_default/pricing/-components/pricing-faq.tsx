import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { PRICING_FAQ_ITEMS } from './constants'

export const PricingFaq = () => {
  return (
    <section className="w-full max-w-2xl mx-auto">
      <h2 className="font-bricolage text-2xl font-semibold text-center mb-8 sm:text-3xl">
        Questions fréquentes
      </h2>
      <Accordion type="single" collapsible>
        {PRICING_FAQ_ITEMS.map((item) => {
          return (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="font-semibold hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}
