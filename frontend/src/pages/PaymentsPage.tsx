import { useState } from 'react'
import { usePayments, useCreatePayment } from '@/hooks/usePayments'
import { useCustomers } from '@/hooks/useCustomers'
import type { PaymentMethod, PaymentType, Customer } from '@/types/database.types'

export default function PaymentsPage() {
  const [showModal, setShowModal] = useState(false)
  const [filterCustomerId, setFilterCustomerId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: payments, isLoading } = usePayments({
    customerId: filterCustomerId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
  const { data: customers } = useCustomers()

  const totalAmount = payments?.reduce((sum, p) => {
    if (p.type === 'deposit') return sum + p.amount
    return sum - p.amount
  }, 0) || 0

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">입금 관리</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">거래처 입금 및 환불 내역</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary text-sm md:text-base">
          + 입금 등록
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">거래처</label>
            <select
              className="input"
              value={filterCustomerId}
              onChange={(e) => setFilterCustomerId(e.target.value)}
            >
              <option value="">전체 거래처</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">시작일</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">종료일</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-fg-secondary">조회된 입금 합계</span>
          <span className={`font-mono font-bold text-xl ${totalAmount >= 0 ? 'text-success' : 'text-danger'}`}>
            ₩{totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton skeleton-text w-1/4 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : payments?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">입금 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments?.map((payment) => (
            <div key={payment.id} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${payment.type === 'deposit' ? 'badge-success' : 'badge-danger'}`}>
                      {payment.type === 'deposit' ? '입금' : '환불'}
                    </span>
                    <span className="badge badge-neutral">
                      {{ cash: '현금', card: '카드', transfer: '이체', credit: '외상', mixed: '복합' }[payment.method]}
                    </span>
                  </div>
                  <p className="font-semibold text-fg-primary mt-2">
                    {payment.customer?.name || '알 수 없음'}
                  </p>
                  <p className="text-xs text-fg-tertiary mt-1">
                    {new Date(payment.payment_date).toLocaleDateString('ko-KR')} •{' '}
                    {new Date(payment.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {payment.memo && (
                    <p className="text-sm text-fg-secondary mt-2">{payment.memo}</p>
                  )}
                </div>
                <p className={`font-mono font-bold text-xl ${payment.type === 'deposit' ? 'text-success' : 'text-danger'}`}>
                  {payment.type === 'deposit' ? '+' : '-'}₩{payment.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showModal && (
        <PaymentModal
          customers={customers || []}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// Payment Modal Component
interface PaymentModalProps {
  customers: Customer[]
  onClose: () => void
  preselectedCustomerId?: string
}

function PaymentModal({ customers, onClose, preselectedCustomerId }: PaymentModalProps) {
  const createPayment = useCreatePayment()

  const [customerId, setCustomerId] = useState(preselectedCustomerId || '')
  const [type, setType] = useState<PaymentType>('deposit')
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [memo, setMemo] = useState('')

  const selectedCustomer = customers.find(c => c.id === customerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerId) {
      alert('거래처를 선택해주세요.')
      return
    }

    if (amount <= 0) {
      alert('금액을 입력해주세요.')
      return
    }

    try {
      await createPayment.mutateAsync({
        customer_id: customerId,
        type,
        amount,
        method,
        memo: memo || undefined,
      })
      alert('입금이 등록되었습니다.')
      onClose()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md mx-4 p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-fg-primary">입금 등록</h2>
          <button onClick={onClose} className="text-fg-tertiary hover:text-fg-primary">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 거래처 */}
          <div>
            <label className="label">거래처 *</label>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">거래처 선택</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(외상 ₩${c.balance.toLocaleString()})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 선택된 거래처 외상 정보 */}
          {selectedCustomer && selectedCustomer.balance > 0 && (
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning">
                현재 외상: ₩{selectedCustomer.balance.toLocaleString()}
              </p>
            </div>
          )}

          {/* 유형 */}
          <div>
            <label className="label">유형</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('deposit')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  type === 'deposit'
                    ? 'bg-success/10 border-success text-success'
                    : 'bg-bg-tertiary border-border-subtle text-fg-secondary hover:border-fg-tertiary'
                }`}
              >
                입금
              </button>
              <button
                type="button"
                onClick={() => setType('refund')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  type === 'refund'
                    ? 'bg-danger/10 border-danger text-danger'
                    : 'bg-bg-tertiary border-border-subtle text-fg-secondary hover:border-fg-tertiary'
                }`}
              >
                환불
              </button>
            </div>
          </div>

          {/* 금액 */}
          <div>
            <label className="label">금액 *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary">₩</span>
              <input
                type="number"
                className="input pl-8 text-right"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="0"
                required
              />
            </div>
            {selectedCustomer && selectedCustomer.balance > 0 && type === 'deposit' && (
              <button
                type="button"
                onClick={() => setAmount(selectedCustomer.balance)}
                className="text-xs text-fg-secondary hover:text-fg-primary mt-1"
              >
                전액 입금 (₩{selectedCustomer.balance.toLocaleString()})
              </button>
            )}
          </div>

          {/* 결제 방법 */}
          <div>
            <label className="label">결제 방법</label>
            <div className="flex gap-2">
              {(['cash', 'card', 'transfer'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                    method === m
                      ? 'bg-bg-hover border-border-secondary text-fg-primary'
                      : 'bg-bg-tertiary border-border-subtle text-fg-tertiary hover:text-fg-secondary'
                  }`}
                >
                  {{ cash: '현금', card: '카드', transfer: '이체', credit: '외상', mixed: '복합' }[m]}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="label">메모</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (선택)"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createPayment.isPending}
              className="btn btn-primary flex-1"
            >
              {createPayment.isPending ? '처리 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
