import { useState } from 'react'
import { useBackorders, useCompleteBackorder, useCancelBackorder, useBackorderStats } from '@/hooks/useBackorders'
import type { BackorderStatus, BackorderWithDetails } from '@/types/database.types'

export default function BackordersPage() {
  const [statusFilter, setStatusFilter] = useState<BackorderStatus | ''>('')

  const { data: backorders, isLoading } = useBackorders({
    status: statusFilter || undefined,
  })
  const { data: stats } = useBackorderStats()
  const completeBackorder = useCompleteBackorder()
  const cancelBackorder = useCancelBackorder()

  const handleComplete = async (id: string) => {
    if (confirm('이 미송을 출고 처리하시겠습니까? 재고가 차감됩니다.')) {
      try {
        await completeBackorder.mutateAsync(id)
        alert('출고 처리되었습니다.')
      } catch (err) {
        alert((err as Error).message)
      }
    }
  }

  const handleCancel = async (id: string) => {
    if (confirm('이 미송을 취소하시겠습니까?')) {
      try {
        await cancelBackorder.mutateAsync(id)
        alert('취소되었습니다.')
      } catch (err) {
        alert((err as Error).message)
      }
    }
  }

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-fg-primary">미송 관리</h1>
        <p className="text-sm md:text-base text-fg-secondary mt-1">재고 부족으로 나중에 보내기로 한 상품</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="glass-card p-3">
          <p className="data-label">대기 중</p>
          <p className="data-value data-value-lg mt-1 text-warning">
            {stats?.pendingCount || 0}건
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">미송 수량</p>
          <p className="data-value data-value-lg mt-1">
            {stats?.totalQuantity || 0}개
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">대기 거래처</p>
          <p className="data-value data-value-lg mt-1">
            {stats?.uniqueCustomers || 0}곳
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card p-3 md:p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: '전체' },
            { value: 'pending', label: '대기 중' },
            { value: 'completed', label: '출고 완료' },
            { value: 'cancelled', label: '취소됨' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value as BackorderStatus | '')}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-md border transition-colors ${
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

      {/* Backorders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-3">
              <div className="skeleton skeleton-text w-1/4 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : backorders?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">
            {statusFilter === 'pending' ? '대기 중인 미송이 없습니다.' : '미송 내역이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {backorders?.map((backorder) => (
            <BackorderCard
              key={backorder.id}
              backorder={backorder}
              onComplete={() => handleComplete(backorder.id)}
              onCancel={() => handleCancel(backorder.id)}
              isProcessing={completeBackorder.isPending || cancelBackorder.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Backorder Card Component
interface BackorderCardProps {
  backorder: BackorderWithDetails
  onComplete: () => void
  onCancel: () => void
  isProcessing: boolean
}

function BackorderCard({ backorder, onComplete, onCancel, isProcessing }: BackorderCardProps) {
  const statusBadge = {
    pending: { label: '대기 중', class: 'badge-warning' },
    completed: { label: '출고 완료', class: 'badge-success' },
    cancelled: { label: '취소됨', class: 'badge-neutral' },
  }[backorder.status]

  const currentStock = backorder.variant?.stock || 0
  const canComplete = backorder.status === 'pending' && currentStock >= backorder.quantity

  return (
    <div className="glass-card p-3 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 상태 & 상품명 */}
          <div className="flex items-center gap-2">
            <span className={`badge ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
            <h3 className="font-semibold text-fg-primary truncate">
              {backorder.product_name}
            </h3>
          </div>

          {/* 옵션 & 수량 */}
          <div className="flex items-center gap-3 mt-2 text-sm">
            {(backorder.color || backorder.size) && (
              <span className="text-fg-secondary">
                {backorder.color}{backorder.color && backorder.size && '/'}{backorder.size}
              </span>
            )}
            <span className="font-mono font-semibold text-fg-primary">
              {backorder.quantity}개
            </span>
            {backorder.status === 'pending' && (
              <span className={`text-xs ${currentStock >= backorder.quantity ? 'text-success' : 'text-danger'}`}>
                (현재 재고: {currentStock})
              </span>
            )}
          </div>

          {/* 거래처 & 판매번호 */}
          <div className="flex items-center gap-3 mt-2 text-sm text-fg-tertiary">
            <span>{backorder.customer?.name || '알 수 없음'}</span>
            <span>{backorder.sale?.sale_number}</span>
          </div>

          {/* 날짜 */}
          <p className="text-xs text-fg-tertiary mt-2">
            생성: {new Date(backorder.created_at).toLocaleDateString('ko-KR')}
            {backorder.completed_at && (
              <> • 완료: {new Date(backorder.completed_at).toLocaleDateString('ko-KR')}</>
            )}
          </p>

          {/* 메모 */}
          {backorder.memo && (
            <p className="text-sm text-fg-secondary mt-2 bg-bg-tertiary px-2 py-1 rounded">
              {backorder.memo}
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        {backorder.status === 'pending' && (
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={onComplete}
              disabled={isProcessing || !canComplete}
              className={`btn btn-sm ${canComplete ? 'btn-primary' : 'btn-ghost opacity-50 cursor-not-allowed'}`}
              title={!canComplete ? '재고가 부족합니다' : undefined}
            >
              출고
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
