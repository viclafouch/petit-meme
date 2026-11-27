import React from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type { FaqItem } from '~/constants/faq'

type FaqSectionProps = {
  items: readonly FaqItem[]
  heading: string
  headingClassName?: string
  className?: string
}

type FaqQuestionProps = FaqItem

const FaqQuestion = ({ question, answer }: FaqQuestionProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const answerRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const answerNode = answerRef.current

    if (!answerNode) {
      return () => {}
    }

    if (!isOpen) {
      answerNode.setAttribute('hidden', 'until-found')
    }

    const open = () => {
      setIsOpen(true)
    }

    answerNode.addEventListener('beforematch', open)

    return () => {
      answerNode.removeEventListener('beforematch', open)
    }
  }, [isOpen])

  return (
    <div className="not-last:border-b">
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((wasOpen) => {
              return !wasOpen
            })
          }}
          className="group flex w-full items-start justify-between gap-4 rounded-md py-4 text-left font-semibold focus-visible:focus-ring"
        >
          {question}
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 translate-y-1 text-muted-foreground transition-transform duration-(--duration-fast) ease-out group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </button>
      </h3>
      <div
        ref={answerRef}
        hidden={!isOpen}
        className="pb-4 text-muted-foreground"
      >
        {answer}
      </div>
    </div>
  )
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
      {items.map((item) => {
        return <FaqQuestion key={item.question} {...item} />
      })}
    </section>
  )
}
