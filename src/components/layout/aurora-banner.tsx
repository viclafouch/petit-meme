import type React from 'react'

type AuroraBannerProps = {
  children: React.ReactNode
}

export const AuroraBanner = ({ children }: AuroraBannerProps) => {
  return (
    <output className="aurora flex min-h-12 items-center justify-center px-2 py-2 text-center text-sm font-medium">
      {children}
    </output>
  )
}
