import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTodaySales, useTodayStats, useCancelSale } from '@/hooks/useSales'
import ReturnModal from '@/components/ReturnModal'
import type { Sale, SaleItem, SaleWithItems } from '@/types/database.types'

export default function SalesPage() {
  const { data: sales, isLoading } = useTodaySales()
  const { data: stats } = useTodayStats()
  const cancelSale = useCancelSale()
  const [returnModalSale, setReturnModalSale] = useState<SaleWithItems | null>(null)

  const handleCancel = async (id: string, saleNumber: string) => {
    if (confirm(`판매 ${saleNumber}을 취소하시겠습니까?\n재고가 복원되고 외상이 차감됩니다.`)) {
      try {
        await cancelSale.mutateAsync(id)
        alert('판매가 취소되었습니다.')
      } catch (err) {
        alert((err as Error).message)
      }
    }
  }

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">판매</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">오늘의 판매 내역</p>
        </div>
        <Link to="/sales/new" className="btn btn-primary text-sm md:text-base">
          + 판매 등록
        </Link>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <div className="glass-card p-3">
          <p className="data-label">오늘 매출</p>
          <p className="data-value data-value-lg mt-1 text-fg-primary">
            ₩{(stats?.totalSales || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">현금 수령</p>
          <p className="data-value data-value-lg mt-1 text-success">
            ₩{(stats?.totalPaid || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">외상</p>
          <p className="data-value data-value-lg mt-1 text-warning">
            ₩{(stats?.totalCredit || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">판매 건수</p>
          <p className="data-value data-value-lg mt-1">
            {stats?.orderCount || 0}건
          </p>
        </div>
      </div>

      {/* Sales List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton skeleton-text w-1/4 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : sales?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">오늘 판매 내역이 없습니다.</p>
          <Link to="/sales/new" className="btn btn-primary mt-4">
            첫 판매 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sales?.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              onCancel={() => handleCancel(sale.id, sale.sale_number)}
              onReturn={() => setReturnModalSale(sale as SaleWithItems)}
            />
          ))}
        </div>
      )}

      {/* Return Modal */}
      {returnModalSale && (
        <ReturnModal
          sale={returnModalSale}
          isOpen={!!returnModalSale}
          onClose={() => setReturnModalSale(null)}
        />
      )}
    </div>
  )
}

// Sale Card Component
interface SaleCardProps {
  sale: Sale & { customer: { id: string; name: string } | null; items: SaleItem[] }
  onCancel: () => void
  onReturn: () => void
}

function SaleCard({ sale, onCancel, onReturn }: SaleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isCancelled = sale.status === 'cancelled'

  const paymentMethodLabel = {
    cash: '현금',
    card: '카드',
    transfer: '이체',
    credit: '외상',
    mixed: '복합',
  }[sale.payment_method]

  return (
    <div className={`glass-card overflow-hidden ${isCancelled ? 'opacity-50' : ''}`}>
      <div
        className="p-3 cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 판매번호 & 상태 */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-fg-secondary">
                {sale.sale_number}
              </span>
              {isCancelled && (
                <span className="badge badge-danger">취소</span>
              )}
              {sale.credit_amount > 0 && !isCancelled && (
                <span className="badge badge-warning">외상</span>
              )}
              <span className="badge badge-neutral">{paymentMethodLabel}</span>
            </div>

            {/* 거래처 */}
            <p className="font-semibold text-fg-primary mt-1">
              {sale.customer?.name || '일반 고객'}
            </p>

            {/* 시간 */}
            <p className="text-xs text-fg-tertiary mt-1">
              {new Date(sale.created_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* 금액 */}
          <div className="text-right">
            <p className="font-mono font-bold text-xl text-fg-primary">
              ₩{sale.final_amount.toLocaleString()}
            </p>
            {sale.discount_amount > 0 && (
              <p className="text-xs text-fg-tertiary">
                할인 -₩{sale.discount_amount.toLocaleString()}
              </p>
            )}
            {sale.credit_amount > 0 && (
              <p className="text-xs text-warning">
                외상 ₩{sale.credit_amount.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border-subtle p-3 bg-bg-tertiary/50">
          {/* Items */}
          <div className="space-y-1.5 mb-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-fg-secondary">
                  {item.product_name}
                  {item.color && item.size && (
                    <span className="text-fg-tertiary ml-1">
                      ({item.color}/{item.size})
                    </span>
                  )}
                  <span className="text-fg-tertiary ml-1">x{item.quantity}</span>
                </span>
                <span className="font-mono text-fg-primary">
                  ₩{item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {!isCancelled && (
            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onReturn()
                }}
                className="btn btn-ghost btn-sm text-fg-secondary hover:bg-bg-hover"
              >
                반품
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel()
                }}
                className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
              >
                판매 취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
