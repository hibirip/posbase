import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface BarChartData {
  name: string
  value: number
  label?: string
}

interface BarChartProps {
  data: BarChartData[]
  size?: 'mini' | 'full'
  showGrid?: boolean
  color?: 'primary' | 'success' | 'warning' | 'danger'
  valueFormatter?: (value: number) => string
}

const COLORS = {
  primary: '#3ECF8E',   // Supabase Green
  success: '#22C55E',   // Muted Green
  warning: '#F59E0B',   // Muted Amber
  danger: '#EF4444',    // Muted Red
}

export default function BarChart({
  data,
  size = 'full',
  showGrid = true,
  color = 'primary',
  valueFormatter = (v) => `₩${v.toLocaleString()}`,
}: BarChartProps) {
  const isMini = size === 'mini'
  const height = isMini ? 120 : 240

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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={isMini
          ? { top: 5, right: 5, left: 5, bottom: 5 }
          : { top: 10, right: 10, left: 10, bottom: 10 }
        }
      >
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
          tick={{ fill: '#8E8E93', fontSize: isMini ? 10 : 12 }}
          interval={isMini ? 'preserveStartEnd' : 0}
        />
        {!isMini && (
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
        )}
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        <Bar
          dataKey="value"
          fill={COLORS[color]}
          radius={[4, 4, 0, 0]}
          maxBarSize={isMini ? 20 : 40}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
