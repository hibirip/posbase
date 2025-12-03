interface HorizontalBarChartData {
  name: string
  value: number
  subValue?: number
  color?: string
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartData[]
  size?: 'mini' | 'full'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  valueFormatter?: (value: number) => string
  showRank?: boolean
  maxItems?: number
}

const COLORS = {
  primary: '#3ECF8E',   // Supabase Green
  success: '#22C55E',   // Muted Green
  warning: '#F59E0B',   // Muted Amber
  danger: '#EF4444',    // Muted Red
}

// 미묘한 순위 색상 (눈에 튀지 않게)
const RANK_COLORS = ['#CA8A04', '#71717A', '#A16207', '#52525B', '#52525B']

export default function HorizontalBarChart({
  data,
  size = 'full',
  color = 'primary',
  valueFormatter = (v) => `₩${v.toLocaleString()}`,
  showRank = true,
  maxItems = 5,
}: HorizontalBarChartProps) {
  const isMini = size === 'mini'
  const displayData = data.slice(0, maxItems)
  const maxValue = Math.max(...displayData.map((d) => d.value))

  return (
    <div className={`space-y-${isMini ? '2' : '3'}`}>
      {displayData.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
        return (
          <div key={item.name} className="flex items-center gap-3">
            {/* Rank Badge */}
            {showRank && (
              <span
                className={`flex-shrink-0 w-5 text-center font-mono font-bold ${isMini ? 'text-xs' : 'text-sm'}`}
                style={{ color: RANK_COLORS[index] || RANK_COLORS[4] }}
              >
                {index + 1}
              </span>
            )}

            {/* Name and Bar */}
            <div className="flex-1 min-w-0">
              <div className={`flex items-center justify-between ${isMini ? 'text-xs' : 'text-sm'} mb-1`}>
                <span className="text-fg-primary truncate pr-2" title={item.name}>
                  {item.name}
                </span>
                <span className="text-fg-primary font-mono font-semibold flex-shrink-0">
                  {valueFormatter(item.value)}
                </span>
              </div>
              <div className={`${isMini ? 'h-1.5' : 'h-2'} bg-bg-tertiary rounded-full overflow-hidden`}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color || COLORS[color],
                  }}
                />
              </div>
              {/* Sub Value (판매 수량 등) */}
              {!isMini && item.subValue !== undefined && (
                <p className="text-xs text-fg-tertiary mt-0.5">
                  {item.subValue}개 판매
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
