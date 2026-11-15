import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion'
import type { FaqItem } from '~/constants/faq'

type FaqSectionProps = {
  items: readonly FaqItem[]
  heading: string
  headingClassName?: string
  className?: string
}

export const FaqSection = ({
  items,
  heading,
  headingClassName = 'mb-4 text-3xl font-semibold md:mb-11 md:text-4xl',
  className
}: FaqSectionProps) => {
  const headingId = React.useId()

  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className={headingClassName}>
        {heading}
      </h2>
      <Accordion multiple hiddenUntilFound>
        {items.map((item) => {
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
