type EmptyMessageParams = {
  children: React.ReactNode
}

export const EmptyMessage = ({ children }: EmptyMessageParams) => {
  return (
    <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>
  )
}
