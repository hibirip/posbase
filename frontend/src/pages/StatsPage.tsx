import { useState, useMemo } from 'react'
import { useSalesStats, useProductStats, useCustomerStats, usePaymentStats } from '@/hooks/useStats'

type TabType = 'overview' | 'products' | 'customers'

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month')
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
      case 'custom':
        return { startDate: customStart || todayStr, endDate: customEnd || todayStr }
    }
  }, [period, customStart, customEnd])

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-fg-primary">통계</h1>
        <p className="text-sm md:text-base text-fg-secondary mt-1">매출 및 입금 통계</p>
      </div>

      {/* Period Selector */}
      <div className="glass-card p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: '오늘' },
              { value: 'week', label: '7일' },
              { value: 'month', label: '30일' },
              { value: 'custom', label: '직접' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as typeof period)}
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
      {activeTab === 'overview' && <OverviewTab startDate={startDate} endDate={endDate} />}
      {activeTab === 'products' && <ProductsTab startDate={startDate} endDate={endDate} />}
      {activeTab === 'customers' && <CustomersTab startDate={startDate} endDate={endDate} />}
    </div>
  )
}

// Overview Tab
function OverviewTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: salesStats, isLoading: salesLoading } = useSalesStats(startDate, endDate)
  const { data: paymentStats, isLoading: paymentLoading } = usePaymentStats(startDate, endDate)

  if (salesLoading || paymentLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="glass-card p-6">
            <div className="skeleton skeleton-text w-1/4 mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="skeleton skeleton-text h-16" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sales Stats */}
      <div className="glass-card p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3 md:mb-4">판매 현황</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">총 매출</p>
            <p className="data-value data-value-xl text-fg-primary mt-2">
              ₩{(salesStats?.totals.totalSales || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">현금 수령</p>
            <p className="data-value data-value-xl text-success mt-2">
              ₩{(salesStats?.totals.totalPaid || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">외상</p>
            <p className="data-value data-value-xl text-warning mt-2">
              ₩{(salesStats?.totals.totalCredit || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">판매 건수</p>
            <p className="data-value data-value-xl mt-2">
              {salesStats?.totals.orderCount || 0}건
            </p>
          </div>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="glass-card p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3 md:mb-4">입금 현황</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">총 입금</p>
            <p className="data-value data-value-xl text-success mt-2">
              ₩{(paymentStats?.totalDeposits || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">총 환불</p>
            <p className="data-value data-value-xl text-danger mt-2">
              ₩{(paymentStats?.totalRefunds || 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">입금 건수</p>
            <p className="data-value data-value-xl mt-2">
              {paymentStats?.depositCount || 0}건
            </p>
          </div>
          <div className="p-4 bg-bg-tertiary rounded-md">
            <p className="data-label">환불 건수</p>
            <p className="data-value data-value-xl mt-2">
              {paymentStats?.refundCount || 0}건
            </p>
          </div>
        </div>

        {/* Payment by Method */}
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="text-sm text-fg-secondary mb-3">결제 방법별 입금</p>
          <div className="flex gap-6">
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

      {/* Daily Stats */}
      {salesStats?.dailyStats && salesStats.dailyStats.length > 0 && (
        <div className="glass-card p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3 md:mb-4">일별 매출</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-fg-tertiary border-b border-border-subtle">
                  <th className="pb-3 font-medium">날짜</th>
                  <th className="pb-3 font-medium text-right">매출</th>
                  <th className="pb-3 font-medium text-right">현금</th>
                  <th className="pb-3 font-medium text-right">외상</th>
                  <th className="pb-3 font-medium text-right">건수</th>
                </tr>
              </thead>
              <tbody>
                {salesStats.dailyStats.map((day) => (
                  <tr key={day.date} className="border-b border-border-subtle/50">
                    <td className="py-3 text-fg-primary">
                      {new Date(day.date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </td>
                    <td className="py-3 text-right font-mono text-fg-primary">
                      ₩{day.totalSales.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-success">
                      ₩{day.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-warning">
                      ₩{day.totalCredit.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-fg-secondary">
                      {day.orderCount}건
                    </td>
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
      <div className="glass-card p-6">
        <div className="skeleton skeleton-text w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton skeleton-text h-12" />
          ))}
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

  const maxAmount = Math.max(...productStats.map(p => p.amount))

  return (
    <div className="glass-card p-4 md:p-6">
      <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3 md:mb-4">상품별 판매</h2>
      <div className="space-y-4">
        {productStats.slice(0, 20).map((product, index) => (
          <div key={product.name} className="flex items-center gap-4">
            <span className="w-6 text-sm text-fg-tertiary text-right">{index + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-fg-primary font-medium">{product.name}</span>
                <span className="font-mono text-fg-primary">₩{product.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fg-secondary rounded-full transition-all"
                    style={{ width: `${(product.amount / maxAmount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-fg-tertiary w-12 text-right">{product.quantity}개</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Customers Tab
function CustomersTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: customerStats, isLoading } = useCustomerStats(startDate, endDate)

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="skeleton skeleton-text w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton skeleton-text h-16" />
          ))}
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

  return (
    <div className="glass-card p-4 md:p-6">
      <h2 className="text-base md:text-lg font-semibold text-fg-primary mb-3 md:mb-4">거래처별 판매</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-fg-tertiary border-b border-border-subtle">
              <th className="pb-3 font-medium">#</th>
              <th className="pb-3 font-medium">거래처</th>
              <th className="pb-3 font-medium text-right">총 매출</th>
              <th className="pb-3 font-medium text-right">현금</th>
              <th className="pb-3 font-medium text-right">외상</th>
              <th className="pb-3 font-medium text-right">건수</th>
            </tr>
          </thead>
          <tbody>
            {customerStats.map((customer, index) => (
              <tr key={customer.id} className="border-b border-border-subtle/50">
                <td className="py-3 text-fg-tertiary">{index + 1}</td>
                <td className="py-3 text-fg-primary font-medium">{customer.name}</td>
                <td className="py-3 text-right font-mono text-fg-primary">
                  ₩{customer.totalSales.toLocaleString()}
                </td>
                <td className="py-3 text-right font-mono text-success">
                  ₩{customer.totalPaid.toLocaleString()}
                </td>
                <td className="py-3 text-right font-mono text-warning">
                  ₩{customer.totalCredit.toLocaleString()}
                </td>
                <td className="py-3 text-right text-fg-secondary">
                  {customer.orderCount}건
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
