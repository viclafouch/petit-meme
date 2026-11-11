import React from 'react'

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export const PageHeader = ({ title, action, description }: PageHeaderProps) => {
  return (
    <div className="flex flex-col items-start justify-between md:flex-row gap-6">
      <div className="flex flex-col gap-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description}
      </div>
      <div>{action}</div>
    </div>
  )
}
