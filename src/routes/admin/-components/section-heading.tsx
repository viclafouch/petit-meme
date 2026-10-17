type SectionHeadingProps = {
  title: string
  action?: React.ReactNode
}

export const SectionHeading = ({ title, action }: SectionHeadingProps) => {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
      {action}
    </div>
  )
}

type SectionCardProps = SectionHeadingProps & {
  children: React.ReactNode
}

export const SectionCard = ({ title, action, children }: SectionCardProps) => {
  return (
    <section aria-label={title}>
      <SectionHeading title={title} action={action} />
      <div className="rounded-xl border bg-card p-4">{children}</div>
    </section>
  )
}
