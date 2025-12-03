import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  size?: 'mini' | 'full'
  className?: string
  action?: ReactNode
}

export default function ChartCard({
  title,
  subtitle,
  children,
  size = 'full',
  className = '',
  action,
}: ChartCardProps) {
  const isMini = size === 'mini'

  return (
    <div className={`glass-card ${isMini ? 'p-3 md:p-4' : 'p-4 md:p-6'} ${className}`}>
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div>
          <h3 className={`font-semibold text-fg-primary ${isMini ? 'text-sm' : 'text-base md:text-lg'}`}>
            {title}
          </h3>
          {subtitle && (
            <p className={`text-fg-tertiary mt-0.5 ${isMini ? 'text-xs' : 'text-xs md:text-sm'}`}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
