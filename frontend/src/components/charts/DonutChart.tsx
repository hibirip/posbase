import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface DonutChartData {
  name: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

interface DonutChartProps {
  data: DonutChartData[]
  size?: 'mini' | 'full'
  showLegend?: boolean
  valueFormatter?: (value: number) => string
  centerLabel?: string
  centerValue?: string
}

const DEFAULT_COLORS = [
  '#3ECF8E',  // Supabase Green (메인)
  '#38BDF8',  // Sky Blue
  '#A78BFA',  // Violet
  '#FB923C',  // Orange (muted)
  '#6B7280',  // Gray
]

export default function DonutChart({
  data,
  size = 'full',
  showLegend = true,
  valueFormatter = (v) => `₩${v.toLocaleString()}`,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const isMini = size === 'mini'
  const height = isMini ? 120 : 200
  const innerRadius = isMini ? 30 : 50
  const outerRadius = isMini ? 45 : 75

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
      return (
        <div className="glass-card p-2 border border-border-subtle text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.payload.fill }}
            />
            <span className="text-fg-secondary">{item.name}</span>
          </div>
          <p className="text-fg-primary font-semibold">
            {valueFormatter(item.value)} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderLegend = () => {
    return (
      <div className={`flex flex-wrap gap-x-4 gap-y-1 ${isMini ? 'mt-2' : 'mt-4'}`}>
        {data.map((entry, index) => {
          const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0
          return (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
              />
              <span className="text-fg-secondary">{entry.name}</span>
              <span className="text-fg-tertiary">{percentage}%</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <span className={`font-mono font-bold text-fg-primary ${isMini ? 'text-sm' : 'text-lg'}`}>
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className={`text-fg-tertiary ${isMini ? 'text-[10px]' : 'text-xs'}`}>
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {showLegend && renderLegend()}
    </div>
  )
}
