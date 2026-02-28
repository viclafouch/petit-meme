import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

export type FaqItem = {
  question: string
  answer: string
}

type FaqSectionParams = {
  items: readonly FaqItem[]
  heading?: string
  headingClassName?: string
  className?: string
}

export const FaqSection = ({
  items,
  heading = 'Questions fréquentes',
  headingClassName = 'mb-4 text-3xl font-semibold md:mb-11 md:text-4xl',
  className
}: FaqSectionParams) => {
  return (
    <section className={className}>
      <h2 className={headingClassName}>{heading}</h2>
      <Accordion type="single" collapsible>
        {items.map((item, index) => {
          return (
            <AccordionItem key={index} value={`item-${index}`}>
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
