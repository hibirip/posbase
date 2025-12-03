import { useState } from 'react'
import { useSamples, useReturnSample, useCancelSample, useSampleStats } from '@/hooks/useSamples'
import type { SampleStatus, SampleWithDetails } from '@/types/database.types'
import { Plus, Camera } from 'lucide-react'
import SampleLendModal from '@/components/samples/SampleLendModal'

export default function SamplesPage() {
  const [statusFilter, setStatusFilter] = useState<SampleStatus | ''>('')
  const [isLendModalOpen, setIsLendModalOpen] = useState(false)

  const { data: samples, isLoading } = useSamples({
    status: statusFilter || undefined,
  })
  const { data: stats } = useSampleStats()
  const returnSample = useReturnSample()
  const cancelSample = useCancelSample()

  const handleReturn = async (id: string) => {
    if (confirm('이 샘플을 반납 처리하시겠습니까?')) {
      try {
        await returnSample.mutateAsync(id)
        alert('반납 처리되었습니다.')
      } catch (err) {
        alert((err as Error).message)
      }
    }
  }

  const handleCancel = async (id: string) => {
    if (confirm('이 샘플 대여를 취소하시겠습니까?')) {
      try {
        await cancelSample.mutateAsync(id)
        alert('취소되었습니다.')
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
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">샘플 관리</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">촬영용 상품 대여/반납 관리</p>
        </div>
        <button
          onClick={() => setIsLendModalOpen(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={1.5} />
          <span className="hidden sm:inline">샘플 대여</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <div className="glass-card p-3">
          <p className="data-label">대여 중</p>
          <p className="data-value data-value-lg mt-1 text-point">
            {stats?.outCount || 0}건
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">대여 수량</p>
          <p className="data-value data-value-lg mt-1">
            {stats?.totalQuantity || 0}개
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">대여 거래처</p>
          <p className="data-value data-value-lg mt-1">
            {stats?.uniqueCustomers || 0}곳
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">연체</p>
          <p className={`data-value data-value-lg mt-1 ${(stats?.overdueCount || 0) > 0 ? 'text-danger' : ''}`}>
            {stats?.overdueCount || 0}건
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card p-3 md:p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: '전체' },
            { value: 'out', label: '대여 중' },
            { value: 'returned', label: '반납 완료' },
            { value: 'cancelled', label: '취소됨' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value as SampleStatus | '')}
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

      {/* Samples List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-3">
              <div className="skeleton skeleton-text w-1/4 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : samples?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Camera size={48} strokeWidth={1} className="mx-auto text-fg-tertiary mb-4" />
          <p className="text-fg-tertiary text-lg">
            {statusFilter === 'out' ? '대여 중인 샘플이 없습니다.' : '샘플 내역이 없습니다.'}
          </p>
          <p className="text-fg-muted text-sm mt-1">상품을 대여하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {samples?.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              onReturn={() => handleReturn(sample.id)}
              onCancel={() => handleCancel(sample.id)}
              isProcessing={returnSample.isPending || cancelSample.isPending}
            />
          ))}
        </div>
      )}

      {/* Sample Lend Modal */}
      <SampleLendModal
        isOpen={isLendModalOpen}
        onClose={() => setIsLendModalOpen(false)}
      />
    </div>
  )
}

// Sample Card Component
interface SampleCardProps {
  sample: SampleWithDetails
  onReturn: () => void
  onCancel: () => void
  isProcessing: boolean
}

function SampleCard({ sample, onReturn, onCancel, isProcessing }: SampleCardProps) {
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = sample.status === 'out' && sample.return_due < today
  const daysOverdue = isOverdue
    ? Math.floor((new Date().getTime() - new Date(sample.return_due).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const statusBadge = {
    out: { label: '대여 중', class: 'badge-point' },
    returned: { label: '반납 완료', class: 'badge-success' },
    cancelled: { label: '취소됨', class: 'badge-neutral' },
  }[sample.status]

  return (
    <div className="glass-card p-3 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 상태 & 상품명 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
            {isOverdue && (
              <span className="badge badge-danger">
                연체 {daysOverdue}일
              </span>
            )}
            <h3 className="font-semibold text-fg-primary truncate">
              {sample.product_name}
            </h3>
          </div>

          {/* 옵션 & 수량 */}
          <div className="flex items-center gap-3 mt-2 text-sm">
            {(sample.color || sample.size) && (
              <span className="text-fg-secondary">
                {sample.color}{sample.color && sample.size && '/'}{sample.size}
              </span>
            )}
            <span className="font-mono font-semibold text-fg-primary">
              {sample.quantity}개
            </span>
            {sample.deduct_stock && (
              <span className="text-xs text-fg-tertiary">(재고 차감)</span>
            )}
          </div>

          {/* 거래처 */}
          <div className="flex items-center gap-3 mt-2 text-sm text-fg-tertiary">
            <span>{sample.customer?.name || '알 수 없음'}</span>
          </div>

          {/* 날짜 */}
          <p className="text-xs text-fg-tertiary mt-2">
            대여일: {new Date(sample.out_date).toLocaleDateString('ko-KR')}
            {' • '}
            <span className={isOverdue ? 'text-danger font-medium' : ''}>
              반납 예정: {new Date(sample.return_due).toLocaleDateString('ko-KR')}
            </span>
            {sample.returned_at && (
              <> • 반납: {new Date(sample.returned_at).toLocaleDateString('ko-KR')}</>
            )}
          </p>

          {/* 메모 */}
          {sample.memo && (
            <p className="text-sm text-fg-secondary mt-2 bg-bg-tertiary px-2 py-1 rounded">
              {sample.memo}
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        {sample.status === 'out' && (
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={onReturn}
              disabled={isProcessing}
              className="btn btn-primary btn-sm"
            >
              반납
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
