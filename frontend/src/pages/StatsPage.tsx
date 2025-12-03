import { useState, useMemo } from 'react'
import { useSalesStats, useProductStats, useCustomerStats, usePaymentStats } from '@/hooks/useStats'
import { ChartCard, BarChart, DonutChart, HorizontalBarChart } from '@/components/charts'

type TabType = 'overview' | 'products' | 'customers'
type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'halfYear' | 'year' | 'custom'

// 기간 옵션
const PERIOD_OPTIONS = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '7일' },
  { value: 'month', label: '30일' },
  { value: 'quarter', label: '3개월' },
  { value: 'halfYear', label: '6개월' },
  { value: 'year', label: '1년' },
  { value: 'custom', label: '직접' },
] as const

// 차트 subtitle 라벨
const PERIOD_LABELS: Record<PeriodType, string> = {
  today: '오늘',
  week: '최근 7일',
  month: '최근 30일',
  quarter: '최근 3개월 (주별)',
  halfYear: '최근 6개월 (주별)',
  year: '최근 1년 (월별)',
  custom: '선택 기간',
}

// 주별 집계 함수
interface DailyStat {
  date: string
  totalSales: number
  totalPaid: number
  totalCredit: number
  orderCount: number
}

function aggregateByWeek(dailyStats: DailyStat[]) {
  const weeklyMap = new Map<string, { sales: number; startDate: string }>()

  dailyStats.forEach((day) => {
    const date = new Date(day.date)
    // 해당 주의 월요일 계산
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(date)
    monday.setDate(diff)
    const weekKey = monday.toISOString().split('T')[0]

    const existing = weeklyMap.get(weekKey)
    if (existing) {
      existing.sales += day.totalSales
    } else {
      weeklyMap.set(weekKey, { sales: day.totalSales, startDate: weekKey })
    }
  })

  return Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, data]) => ({
      name: new Date(data.startDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '주',
      value: data.sales,
    }))
}

// 월별 집계 함수
function aggregateByMonth(dailyStats: DailyStat[]) {
  const monthlyMap = new Map<string, number>()

  dailyStats.forEach((day) => {
    const date = new Date(day.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const existing = monthlyMap.get(monthKey) || 0
    monthlyMap.set(monthKey, existing + day.totalSales)
  })

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, sales]) => {
      const month = monthKey.split('-')[1]
      return {
        name: `${parseInt(month)}월`,
        value: sales,
      }
    })
}

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [period, setPeriod] = useState<PeriodType>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // 기간 계산
  const { startDate, endDate } = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    switch (period) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr }
      case 'week': {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return { startDate: weekAgo.toISOString().split('T')[0], endDate: todayStr }
      }
      case 'month': {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return { startDate: monthAgo.toISOString().split('T')[0], endDate: todayStr }
      }
      case 'quarter': {
        const quarterAgo = new Date(today)
        quarterAgo.setMonth(quarterAgo.getMonth() - 3)
        return { startDate: quarterAgo.toISOString().split('T')[0], endDate: todayStr }
      }
      case 'halfYear': {
        const halfYearAgo = new Date(today)
        halfYearAgo.setMonth(halfYearAgo.getMonth() - 6)
        return { startDate: halfYearAgo.toISOString().split('T')[0], endDate: todayStr }
      }
      case 'year': {
        const yearAgo = new Date(today)
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        return { startDate: yearAgo.toISOString().split('T')[0], endDate: todayStr }
      }
      case 'custom':
        return { startDate: customStart || todayStr, endDate: customEnd || todayStr }
    }
  }, [period, customStart, customEnd])

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-fg-primary">통계</h1>
        <p className="text-sm md:text-base text-fg-secondary mt-1">매출 및 입금 통계</p>
      </div>

      {/* Period Selector */}
      <div className="glass-card p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as PeriodType)}
                className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md border transition-colors ${
                  period === p.value
                    ? 'bg-bg-hover border-border-secondary text-fg-primary'
                    : 'bg-bg-tertiary border-border-subtle text-fg-tertiary hover:text-fg-secondary'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input py-1.5 text-sm"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="text-fg-tertiary">~</span>
              <input
                type="date"
                className="input py-1.5 text-sm"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 md:gap-2 border-b border-border-subtle">
        {[
          { value: 'overview', label: '개요' },
          { value: 'products', label: '상품별' },
          { value: 'customers', label: '거래처별' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as TabType)}
            className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-fg-primary text-fg-primary'
                : 'border-transparent text-fg-tertiary hover:text-fg-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab startDate={startDate} endDate={endDate} period={period} />}
      {activeTab === 'products' && <ProductsTab startDate={startDate} endDate={endDate} />}
      {activeTab === 'customers' && <CustomersTab startDate={startDate} endDate={endDate} />}
    </div>
  )
}

// Overview Tab
function OverviewTab({ startDate, endDate, period }: { startDate: string; endDate: string; period: PeriodType }) {
  const { data: salesStats, isLoading: salesLoading } = useSalesStats(startDate, endDate)
  const { data: paymentStats, isLoading: paymentLoading } = usePaymentStats(startDate, endDate)
  const { data: productStats, isLoading: productLoading } = useProductStats(startDate, endDate)
  const { data: customerStats, isLoading: customerLoading } = useCustomerStats(startDate, endDate)

  const isLoading = salesLoading || paymentLoading || productLoading || customerLoading

  // 차트 데이터 생성 (기간에 따라 집계 방식 변경)
  const dailyChartData = useMemo(() => {
    if (!salesStats?.dailyStats) return []

    const dailyStats = salesStats.dailyStats

    // 단기 (오늘, 7일, 30일): 일별 표시
    if (period === 'today' || period === 'week' || period === 'month') {
      return dailyStats.map((day) => ({
        name: new Date(day.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
        value: day.totalSales,
      }))
    }

    // 중기 (3개월, 6개월): 주별 집계
    if (period === 'quarter' || period === 'halfYear') {
      return aggregateByWeek(dailyStats)
    }

    // 장기 (1년, custom): 월별 집계
    return aggregateByMonth(dailyStats)
  }, [salesStats?.dailyStats, period])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6">
          <div className="skeleton skeleton-text w-1/4 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="skeleton skeleton-text h-16" />
            ))}
          </div>
        </div>
        <div className="skeleton skeleton-card h-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((j) => (
            <div key={j} className="skeleton skeleton-card h-48" />
          ))}
        </div>
      </div>
    )
  }

  // 결제 방식 도넛 차트 데이터
  const totalPaid = salesStats?.totals.totalPaid || 0
  const totalCredit = salesStats?.totals.totalCredit || 0
  const paymentMethodData = [
    { name: '현금 수령', value: totalPaid, color: '#22C55E' },
    { name: '외상', value: totalCredit, color: '#F59E0B' },
  ].filter((d) => d.value > 0)

  // TOP 5 거래처 데이터
  const top5Customers =
    customerStats?.slice(0, 5).map((c) => ({
      name: c.name,
      value: c.totalSales,
      subValue: c.orderCount,
    })) || []

  // TOP 5 상품 데이터
  const top5Products =
    productStats?.slice(0, 5).map((p) => ({
      name: p.name,
      value: p.amount,
      subValue: p.quantity,
    })) || []

  // 외상 비율 계산
  const totalSales = salesStats?.totals.totalSales || 0
  const creditRatio = totalSales > 0 ? Math.round((totalCredit / totalSales) * 100) : 0

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <div className="glass-card p-3">
          <p className="data-label">총 매출</p>
          <p className="data-value data-value-lg md:data-value-xl text-fg-primary mt-2">₩{totalSales.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">현금 수령</p>
          <p className="data-value data-value-lg md:data-value-xl text-success mt-2">₩{totalPaid.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">외상 발생</p>
          <p className="data-value data-value-lg md:data-value-xl text-warning mt-2">₩{totalCredit.toLocaleString()}</p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">판매 건수</p>
          <p className="data-value data-value-lg md:data-value-xl text-fg-primary mt-2">
            {salesStats?.totals.orderCount || 0}건
          </p>
        </div>
      </div>

      {/* Daily Sales Chart */}
      {dailyChartData.length > 0 && (
        <ChartCard title="매출 추이" subtitle={PERIOD_LABELS[period]}>
          <BarChart data={dailyChartData} color="primary" />
        </ChartCard>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Payment Method Donut */}
        <ChartCard title="결제 방식" subtitle={`외상 비율 ${creditRatio}%`}>
          {paymentMethodData.length > 0 ? (
            <DonutChart data={paymentMethodData} centerValue={`${creditRatio}%`} centerLabel="외상 비율" />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-fg-tertiary text-sm">데이터 없음</div>
          )}
        </ChartCard>

        {/* Top 5 Customers */}
        <ChartCard title="거래처 TOP 5" subtitle="매출 기준">
          {top5Customers.length > 0 ? (
            <HorizontalBarChart data={top5Customers} color="primary" />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-fg-tertiary text-sm">데이터 없음</div>
          )}
        </ChartCard>

        {/* Top 5 Products */}
        <ChartCard title="상품 TOP 5" subtitle="매출 기준">
          {top5Products.length > 0 ? (
            <HorizontalBarChart data={top5Products} color="success" />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-fg-tertiary text-sm">데이터 없음</div>
          )}
        </ChartCard>
      </div>

      {/* Payment Stats */}
      <div className="glass-card p-3 md:p-4">
        <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3">입금 현황</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div className="p-3 bg-bg-tertiary rounded-md">
            <p className="data-label">총 입금</p>
            <p className="data-value data-value-lg text-success mt-2">
              ₩{(paymentStats?.totalDeposits || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-bg-tertiary rounded-md">
            <p className="data-label">총 환불</p>
            <p className="data-value data-value-lg text-danger mt-2">
              ₩{(paymentStats?.totalRefunds || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-bg-tertiary rounded-md">
            <p className="data-label">입금 건수</p>
            <p className="data-value data-value-lg mt-2">{paymentStats?.depositCount || 0}건</p>
          </div>
          <div className="p-3 bg-bg-tertiary rounded-md">
            <p className="data-label">환불 건수</p>
            <p className="data-value data-value-lg mt-2">{paymentStats?.refundCount || 0}건</p>
          </div>
        </div>

        {/* Payment by Method */}
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <p className="text-sm text-fg-secondary mb-2">결제 방법별 입금</p>
          <div className="flex flex-wrap gap-3 md:gap-4">
            <div>
              <span className="text-fg-tertiary text-sm">현금</span>
              <p className="font-mono font-semibold text-fg-primary">
                ₩{(paymentStats?.byMethod.cash || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-fg-tertiary text-sm">카드</span>
              <p className="font-mono font-semibold text-fg-primary">
                ₩{(paymentStats?.byMethod.card || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-fg-tertiary text-sm">이체</span>
              <p className="font-mono font-semibold text-fg-primary">
                ₩{(paymentStats?.byMethod.transfer || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Stats Table */}
      {salesStats?.dailyStats && salesStats.dailyStats.length > 0 && (
        <div className="glass-card p-3 md:p-4">
          <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3">일별 매출 상세</h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-bg-primary">
                <tr className="text-left text-xs md:text-sm text-fg-tertiary border-b border-border-subtle">
                  <th className="pb-3 font-medium">날짜</th>
                  <th className="pb-3 font-medium text-right">매출</th>
                  <th className="pb-3 font-medium text-right hidden sm:table-cell">현금</th>
                  <th className="pb-3 font-medium text-right hidden sm:table-cell">외상</th>
                  <th className="pb-3 font-medium text-right">건수</th>
                </tr>
              </thead>
              <tbody>
                {salesStats.dailyStats.map((day) => (
                  <tr key={day.date} className="border-b border-border-subtle/50">
                    <td className="py-3 text-fg-primary text-sm">
                      {new Date(day.date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-fg-primary">
                      ₩{day.totalSales.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-success hidden sm:table-cell">
                      ₩{day.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-warning hidden sm:table-cell">
                      ₩{day.totalCredit.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-fg-secondary text-sm">{day.orderCount}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Products Tab
function ProductsTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: productStats, isLoading } = useProductStats(startDate, endDate)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton skeleton-card h-64" />
        <div className="glass-card p-6">
          <div className="skeleton skeleton-text w-1/4 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-text h-12" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!productStats || productStats.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-fg-tertiary">해당 기간에 판매 내역이 없습니다.</p>
      </div>
    )
  }

  // 상품별 차트 데이터
  const chartData = productStats.slice(0, 10).map((p) => ({
    name: p.name,
    value: p.amount,
    subValue: p.quantity,
  }))

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Chart */}
      <ChartCard title="상품별 매출 TOP 10">
        <HorizontalBarChart data={chartData} color="primary" maxItems={10} />
      </ChartCard>

      {/* Full List */}
      <div className="glass-card p-3 md:p-4">
        <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3">
          전체 상품 ({productStats.length}개)
        </h2>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {productStats.map((product, index) => {
            const maxAmount = productStats[0].amount
            const percentage = maxAmount > 0 ? (product.amount / maxAmount) * 100 : 0
            return (
              <div key={product.name} className="flex items-center gap-3 md:gap-4">
                <span className="w-6 text-sm text-fg-tertiary text-right">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-fg-primary font-medium text-sm truncate">{product.name}</span>
                    <span className="font-mono text-fg-primary text-sm ml-2">₩{product.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-point rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-fg-tertiary w-12 text-right">{product.quantity}개</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Customers Tab
function CustomersTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: customerStats, isLoading } = useCustomerStats(startDate, endDate)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton skeleton-card h-64" />
        <div className="glass-card p-6">
          <div className="skeleton skeleton-text w-1/4 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-text h-16" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!customerStats || customerStats.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-fg-tertiary">해당 기간에 거래처 판매 내역이 없습니다.</p>
      </div>
    )
  }

  // 거래처별 차트 데이터
  const chartData = customerStats.slice(0, 10).map((c) => ({
    name: c.name,
    value: c.totalSales,
    subValue: c.orderCount,
  }))

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Chart */}
      <ChartCard title="거래처별 매출 TOP 10">
        <HorizontalBarChart data={chartData} color="primary" maxItems={10} />
      </ChartCard>

      {/* Table */}
      <div className="glass-card p-3 md:p-4">
        <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3">
          전체 거래처 ({customerStats.length}곳)
        </h2>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-primary">
              <tr className="text-left text-xs md:text-sm text-fg-tertiary border-b border-border-subtle">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">거래처</th>
                <th className="pb-3 font-medium text-right">총 매출</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">현금</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">외상</th>
                <th className="pb-3 font-medium text-right">건수</th>
              </tr>
            </thead>
            <tbody>
              {customerStats.map((customer, index) => (
                <tr key={customer.id} className="border-b border-border-subtle/50">
                  <td className="py-3 text-fg-tertiary text-sm">{index + 1}</td>
                  <td className="py-3 text-fg-primary font-medium text-sm">{customer.name}</td>
                  <td className="py-3 text-right font-mono text-fg-primary text-sm">
                    ₩{customer.totalSales.toLocaleString()}
                  </td>
                  <td className="py-3 text-right font-mono text-success text-sm hidden sm:table-cell">
                    ₩{customer.totalPaid.toLocaleString()}
                  </td>
                  <td className="py-3 text-right font-mono text-warning text-sm hidden sm:table-cell">
                    ₩{customer.totalCredit.toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-fg-secondary text-sm">{customer.orderCount}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
