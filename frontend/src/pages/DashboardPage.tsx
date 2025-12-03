import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTodayStats, useTodaySales } from '@/hooks/useSales'
import { useCustomersWithBalance } from '@/hooks/useCustomers'
import { usePendingBackorders } from '@/hooks/useBackorders'
import { useSalesStats } from '@/hooks/useStats'
import { ChartCard, BarChart, LineChart } from '@/components/charts'
import {
  ShoppingCart,
  Package,
  Building2,
  Truck,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { data: todayStats } = useTodayStats()
  const { data: todaySales } = useTodaySales()
  const { data: customersWithBalance } = useCustomersWithBalance()
  const { data: pendingBackorders } = usePendingBackorders()

  // 최근 7일 매출 통계
  const { startDate, endDate } = useMemo(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return {
      startDate: weekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }
  }, [])
  const { data: weeklyStats } = useSalesStats(startDate, endDate)

  const totalUnpaid = customersWithBalance?.reduce((sum, c) => sum + c.balance, 0) || 0
  const pendingBackorderCount = pendingBackorders?.length || 0

  // 주간 매출 차트 데이터
  const weeklyChartData = weeklyStats?.dailyStats?.map(day => ({
    name: new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' }),
    value: day.totalSales,
  })) || []

  // 주간 외상 추이 차트 데이터
  const weeklyCreditData = weeklyStats?.dailyStats?.map(day => ({
    name: new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' }),
    value: day.totalCredit,
  })) || []

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-fg-primary">
          안녕하세요, {profile?.shop_name || '매장'}님
        </h1>
        <p className="text-sm md:text-base text-fg-secondary mt-1">오늘도 좋은 하루 되세요!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <StatCard
          label="오늘 매출"
          value={todayStats?.totalSales || 0}
          format="currency"
        />
        <StatCard
          label="오늘 판매건수"
          value={todayStats?.orderCount || 0}
          format="count"
          suffix="건"
        />
        <StatCard
          label="오늘 현금 수령"
          value={todayStats?.totalPaid || 0}
          format="currency"
          variant="success"
        />
        <StatCard
          label="총 미수금"
          value={totalUnpaid}
          format="currency"
          variant="warning"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
        <QuickAction icon={ShoppingCart} label="판매 등록" to="/sales/new" />
        <QuickAction icon={Package} label="상품 등록" to="/products/new" />
        <QuickAction icon={Building2} label="거래처 등록" to="/customers/new" />
        <QuickAction icon={Truck} label="미송 관리" to="/backorders" badge={pendingBackorderCount > 0 ? pendingBackorderCount : undefined} />
        <QuickAction icon={BarChart3} label="통계 보기" to="/stats" />
      </div>

      {/* Mini Charts */}
      {weeklyChartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <ChartCard title="주간 매출 추이" subtitle="최근 7일" size="mini">
            <BarChart data={weeklyChartData} size="mini" color="primary" />
          </ChartCard>
          <ChartCard title="주간 외상 발생" subtitle="최근 7일" size="mini">
            <LineChart data={weeklyCreditData} size="mini" color="warning" />
          </ChartCard>
        </div>
      )}

      {/* Recent Sales */}
      <div className="glass-card p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-fg-primary">오늘 판매</h2>
          <Link to="/sales" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">
            전체 보기
          </Link>
        </div>

        {!todaySales || todaySales.length === 0 ? (
          <div className="text-center py-8 text-fg-tertiary">
            <p>오늘 판매 내역이 없습니다.</p>
            <Link to="/sales/new" className="btn btn-primary btn-sm mt-3">
              첫 판매 등록하기
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {todaySales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-2.5 bg-bg-tertiary/50 rounded-md"
              >
                <div>
                  <p className="font-medium text-fg-primary text-sm">
                    {sale.customer?.name || '일반 고객'}
                  </p>
                  <p className="text-xs text-fg-tertiary">
                    {sale.sale_number} •{' '}
                    {new Date(sale.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-fg-primary">
                    ₩{sale.final_amount.toLocaleString()}
                  </p>
                  {sale.credit_amount > 0 && (
                    <p className="text-xs text-warning">
                      외상 ₩{sale.credit_amount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unpaid Customers */}
      {customersWithBalance && customersWithBalance.length > 0 && (
        <div className="glass-card p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-fg-primary">외상 거래처</h2>
            <Link to="/customers" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">
              전체 보기
            </Link>
          </div>

          <div className="space-y-1.5">
            {customersWithBalance.slice(0, 5).map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-2.5 bg-bg-tertiary/50 rounded-md"
              >
                <div>
                  <p className="font-medium text-fg-primary text-sm">
                    {customer.name}
                  </p>
                  {customer.contact_name && (
                    <p className="text-xs text-fg-tertiary">{customer.contact_name}</p>
                  )}
                </div>
                <p className="font-mono font-semibold text-warning">
                  ₩{customer.balance.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Backorders */}
      {pendingBackorders && pendingBackorders.length > 0 && (
        <div className="glass-card p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-fg-primary">
              대기 중인 미송
              <span className="ml-2 text-sm font-normal text-warning">
                {pendingBackorders.length}건
              </span>
            </h2>
            <Link to="/backorders" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">
              전체 보기
            </Link>
          </div>

          <div className="space-y-1.5">
            {pendingBackorders.slice(0, 5).map((backorder) => (
              <div
                key={backorder.id}
                className="flex items-center justify-between p-2.5 bg-bg-tertiary/50 rounded-md"
              >
                <div>
                  <p className="font-medium text-fg-primary text-sm">
                    {backorder.product_name}
                    {(backorder.color || backorder.size) && (
                      <span className="text-fg-tertiary ml-1">
                        ({backorder.color}{backorder.color && backorder.size && '/'}{backorder.size})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-fg-tertiary">
                    {backorder.customer?.name} • {backorder.quantity}개
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${(backorder.variant?.stock || 0) >= backorder.quantity ? 'text-success' : 'text-danger'}`}>
                    재고 {backorder.variant?.stock || 0}개
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  label: string
  value: number
  format: 'currency' | 'count'
  suffix?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ label, value, format, suffix, variant = 'default' }: StatCardProps) {
  const formattedValue = value.toLocaleString('ko-KR')
  // 숫자 길이에 따라 폰트 크기 조절 (천만 이상이면 작게)
  const isLongNumber = value >= 10000000

  const variantClass = {
    default: '',
    success: 'border-l-4 border-l-success',
    warning: 'border-l-4 border-l-warning',
    danger: 'border-l-4 border-l-danger',
  }[variant]

  return (
    <div className={`glass-card p-3 min-w-0 ${variantClass}`}>
      <p className="data-label">{label}</p>
      <p className={`font-mono font-bold mt-1 truncate ${isLongNumber ? 'text-xl' : 'text-2xl'}`}>
        {format === 'currency' && '₩'}
        {formattedValue}
        {suffix && <span className="text-base ml-1">{suffix}</span>}
      </p>
    </div>
  )
}

// Quick Action Component
interface QuickActionProps {
  icon: LucideIcon
  label: string
  to: string
  badge?: number
}

function QuickAction({ icon: Icon, label, to, badge }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="glass-card p-3 flex flex-col items-center gap-1.5 hover:bg-bg-hover transition-colors cursor-pointer relative"
    >
      <div className="relative">
        <Icon size={24} strokeWidth={1.5} className="text-fg-secondary" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-warning text-[10px] font-bold text-bg-primary rounded-full flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-fg-primary">{label}</span>
    </Link>
  )
}
