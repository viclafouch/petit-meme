type EmptyMessageProps = {
  children: React.ReactNode
}

export const EmptyMessage = ({ children }: EmptyMessageProps) => {
  return (
    <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>
  )
}
