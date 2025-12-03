import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ComposedChart,
} from 'recharts'

interface LineChartData {
  name: string
  value: number
}

interface LineChartProps {
  data: LineChartData[]
  size?: 'mini' | 'full'
  showGrid?: boolean
  showArea?: boolean
  color?: 'primary' | 'success' | 'warning' | 'danger'
  valueFormatter?: (value: number) => string
}

const COLORS = {
  primary: '#0052FF',
  success: '#00C805',
  warning: '#FF9500',
  danger: '#FF3B30',
}

export default function LineChart({
  data,
  size = 'full',
  showGrid = true,
  showArea = true,
  color = 'primary',
  valueFormatter = (v) => `₩${v.toLocaleString()}`,
}: LineChartProps) {
  const isMini = size === 'mini'
  const height = isMini ? 80 : 200
  const lineColor = COLORS[color]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-2 border border-border-subtle text-xs">
          <p className="text-fg-secondary mb-1">{label}</p>
          <p className="text-fg-primary font-semibold">
            {valueFormatter(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  if (isMini) {
    // 미니 버전: 심플한 라인만
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          {showArea && (
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          {showArea && (
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill={`url(#gradient-${color})`}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
      >
        {showArea && (
          <defs>
            <linearGradient id={`gradient-${color}-full`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2C2C2E"
            vertical={false}
          />
        )}
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8E8E93', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8E8E93', fontSize: 11 }}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
            return value.toString()
          }}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        {showArea && (
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill={`url(#gradient-${color}-full)`}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 3 }}
          activeDot={{ fill: lineColor, r: 5, stroke: '#fff', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
