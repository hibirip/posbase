import { useState } from 'react'
import { useReturns, useCompleteReturn, useCancelReturn, useReturnStats } from '@/hooks/useReturns'
import type { ReturnStatus, ReturnWithDetails } from '@/types/database.types'

export default function ReturnsPage() {
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | ''>('')

  const { data: returns, isLoading } = useReturns({
    status: statusFilter || undefined,
  })
  const { data: stats } = useReturnStats()
  const completeReturn = useCompleteReturn()
  const cancelReturn = useCancelReturn()

  const handleComplete = async (id: string) => {
    if (confirm('이 반품을 완료 처리하시겠습니까? 재고가 복원됩니다.')) {
      try {
        await completeReturn.mutateAsync(id)
        alert('반품 완료 처리되었습니다.')
      } catch (err) {
        alert((err as Error).message)
      }
    }
  }

  const handleCancel = async (id: string) => {
    if (confirm('이 반품을 취소하시겠습니까?')) {
      try {
        await cancelReturn.mutateAsync(id)
        alert('취소되었습니다.')
      } catch (err) {
        alert((err as Error).message)
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg-primary">반품 관리</h1>
        <p className="text-fg-secondary mt-1">판매된 상품의 반품 처리</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="data-label">대기 중</p>
          <p className="data-value data-value-lg mt-1 text-warning">
            {stats?.pendingCount || 0}건
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="data-label">총 환불액</p>
          <p className="data-value data-value-lg mt-1">
            ₩{(stats?.totalRefunded || 0).toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="data-label">이번 달 반품</p>
          <p className="data-value data-value-lg mt-1">
            {stats?.thisMonthCount || 0}건
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          {[
            { value: '', label: '전체' },
            { value: 'pending', label: '대기 중' },
            { value: 'completed', label: '완료' },
            { value: 'cancelled', label: '취소됨' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value as ReturnStatus | '')}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                statusFilter === option.value
                  ? 'bg-bg-hover border-border-secondary text-fg-primary'
                  : 'bg-bg-tertiary border-border-subtle text-fg-tertiary hover:text-fg-secondary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Returns List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton skeleton-text w-1/4 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : returns?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">
            {statusFilter === 'pending' ? '대기 중인 반품이 없습니다.' : '반품 내역이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns?.map((returnItem) => (
            <ReturnCard
              key={returnItem.id}
              returnItem={returnItem}
              onComplete={() => handleComplete(returnItem.id)}
              onCancel={() => handleCancel(returnItem.id)}
              isProcessing={completeReturn.isPending || cancelReturn.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Return Card Component
interface ReturnCardProps {
  returnItem: ReturnWithDetails
  onComplete: () => void
  onCancel: () => void
  isProcessing: boolean
}

function ReturnCard({ returnItem, onComplete, onCancel, isProcessing }: ReturnCardProps) {
  const statusBadge = {
    pending: { label: '대기 중', class: 'badge-warning' },
    completed: { label: '완료', class: 'badge-success' },
    cancelled: { label: '취소됨', class: 'badge-neutral' },
  }[returnItem.status]

  return (
    <div className="glass-card p-4 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 상태 & 상품명 */}
          <div className="flex items-center gap-2">
            <span className={`badge ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
            <h3 className="font-semibold text-fg-primary truncate">
              {returnItem.product_name}
            </h3>
          </div>

          {/* 옵션 & 수량 */}
          <div className="flex items-center gap-3 mt-2 text-sm">
            {(returnItem.color || returnItem.size) && (
              <span className="text-fg-secondary">
                {returnItem.color}{returnItem.color && returnItem.size && '/'}{returnItem.size}
              </span>
            )}
            <span className="font-mono font-semibold text-fg-primary">
              {returnItem.quantity}개
            </span>
          </div>

          {/* 환불금액 */}
          <div className="mt-2">
            <span className="font-mono font-semibold text-danger">
              환불 ₩{returnItem.refund_amount.toLocaleString()}
            </span>
          </div>

          {/* 거래처 & 판매번호 */}
          <div className="flex items-center gap-3 mt-2 text-sm text-fg-tertiary">
            <span>{returnItem.customer?.name || '일반 고객'}</span>
            <span>{returnItem.sale?.sale_number}</span>
            <span>{returnItem.return_number}</span>
          </div>

          {/* 날짜 */}
          <p className="text-xs text-fg-tertiary mt-2">
            반품일: {new Date(returnItem.return_date).toLocaleDateString('ko-KR')}
            {returnItem.completed_at && (
              <> • 완료: {new Date(returnItem.completed_at).toLocaleDateString('ko-KR')}</>
            )}
          </p>

          {/* 사유 */}
          {returnItem.reason && (
            <p className="text-sm text-fg-secondary mt-2 bg-bg-tertiary px-2 py-1 rounded">
              사유: {returnItem.reason}
            </p>
          )}

          {/* 메모 */}
          {returnItem.memo && (
            <p className="text-sm text-fg-tertiary mt-1">
              {returnItem.memo}
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        {returnItem.status === 'pending' && (
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={onComplete}
              disabled={isProcessing}
              className="btn btn-primary btn-sm"
            >
              완료
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
