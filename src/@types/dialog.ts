export type WithDialog<TProps> = TProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}
