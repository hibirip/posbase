import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

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
  primary: '#0052FF',
  success: '#00C805',
  warning: '#FF9500',
  danger: '#FF3B30',
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#8E8E93', '#636366']

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

  if (isMini) {
    // 미니 버전: 단순 리스트 형태
    return (
      <div className="space-y-2">
        {displayData.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div key={item.name} className="flex items-center gap-2">
              {showRank && (
                <span
                  className="w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded"
                  style={{
                    backgroundColor: index < 3 ? RANK_COLORS[index] : '#2C2C2E',
                    color: index < 3 ? '#000' : '#8E8E93',
                  }}
                >
                  {index + 1}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-fg-secondary truncate">{item.name}</span>
                  <span className="text-fg-primary font-mono ml-2">
                    {valueFormatter(item.value)}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color || COLORS[color],
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 풀 버전: Recharts 사용
  const chartHeight = displayData.length * 48 + 20

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-2 border border-border-subtle text-xs">
          <p className="text-fg-secondary mb-1">{payload[0].payload.name}</p>
          <p className="text-fg-primary font-semibold">
            {valueFormatter(payload[0].value)}
          </p>
          {payload[0].payload.subValue !== undefined && (
            <p className="text-fg-tertiary mt-0.5">
              {payload[0].payload.subValue}개 판매
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            hide
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={({ x, y, payload, index }) => (
              <g>
                {showRank && (
                  <text
                    x={x - 75}
                    y={y}
                    dy={4}
                    fontSize={11}
                    fontWeight="bold"
                    fill={index < 3 ? RANK_COLORS[index] : '#8E8E93'}
                    textAnchor="middle"
                  >
                    {index + 1}
                  </text>
                )}
                <text
                  x={x - 55}
                  y={y}
                  dy={4}
                  fontSize={12}
                  fill="#FFFFFF"
                  textAnchor="start"
                >
                  {payload.value.length > 10
                    ? payload.value.substring(0, 10) + '...'
                    : payload.value}
                </text>
              </g>
            )}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[color]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
