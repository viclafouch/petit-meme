export type WithDialog<TProps = unknown> = TProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}
