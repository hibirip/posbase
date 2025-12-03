import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { useCreateReturn } from '@/hooks/useReturns'
import { useSaleReturns } from '@/hooks/useReturns'
import type { SaleWithItems, SaleItem } from '@/types/database.types'

interface ReturnModalProps {
  sale: SaleWithItems
  isOpen: boolean
  onClose: () => void
}

interface ReturnItem {
  saleItem: SaleItem
  quantity: number
  reason: string
}

export default function ReturnModal({ sale, isOpen, onClose }: ReturnModalProps) {
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [memo, setMemo] = useState('')

  const createReturn = useCreateReturn()
  const { data: existingReturns } = useSaleReturns(sale.id)

  // 이미 반품된 수량 계산
  const getReturnedQuantity = (saleItemId: string) => {
    if (!existingReturns) return 0
    return existingReturns
      .filter(r => r.sale_item_id === saleItemId && r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.quantity, 0)
  }

  // 반품 가능한 최대 수량
  const getMaxReturnQuantity = (item: SaleItem) => {
    return item.quantity - getReturnedQuantity(item.id)
  }

  // 반품 항목 토글
  const toggleReturnItem = (item: SaleItem) => {
    const existing = returnItems.find(r => r.saleItem.id === item.id)
    if (existing) {
      setReturnItems(returnItems.filter(r => r.saleItem.id !== item.id))
    } else {
      const maxQty = getMaxReturnQuantity(item)
      if (maxQty > 0) {
        setReturnItems([...returnItems, { saleItem: item, quantity: maxQty, reason: '' }])
      }
    }
  }

  // 반품 수량 변경
  const updateQuantity = (itemId: string, quantity: number) => {
    setReturnItems(returnItems.map(r => {
      if (r.saleItem.id === itemId) {
        const maxQty = getMaxReturnQuantity(r.saleItem)
        return { ...r, quantity: Math.min(Math.max(1, quantity), maxQty) }
      }
      return r
    }))
  }

  // 반품 사유 변경
  const updateReason = (itemId: string, reason: string) => {
    setReturnItems(returnItems.map(r => {
      if (r.saleItem.id === itemId) {
        return { ...r, reason }
      }
      return r
    }))
  }

  // 총 환불금액 계산
  const totalRefund = returnItems.reduce((sum, r) => sum + r.quantity * r.saleItem.unit_price, 0)

  // 반품 처리
  const handleSubmit = async () => {
    if (returnItems.length === 0) {
      alert('반품할 상품을 선택해주세요.')
      return
    }

    try {
      for (const item of returnItems) {
        await createReturn.mutateAsync({
          sale_id: sale.id,
          sale_item_id: item.saleItem.id,
          customer_id: sale.customer_id || undefined,
          variant_id: item.saleItem.variant_id || undefined,
          product_name: item.saleItem.product_name,
          color: item.saleItem.color || undefined,
          size: item.saleItem.size || undefined,
          quantity: item.quantity,
          unit_price: item.saleItem.unit_price,
          reason: item.reason || undefined,
          memo: memo || undefined,
        })
      }

      alert(`${returnItems.length}건의 반품이 등록되었습니다.`)
      onClose()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <RotateCcw size={20} strokeWidth={1.5} className="text-fg-secondary" />
            <h2 className="text-lg font-semibold text-fg-primary">반품 등록</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg-secondary rounded-md hover:bg-bg-hover transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* 판매 정보 */}
          <div className="bg-bg-tertiary rounded-md p-3">
            <p className="text-sm text-fg-secondary">
              판매번호: <span className="font-mono text-fg-primary">{sale.sale_number}</span>
            </p>
            <p className="text-sm text-fg-secondary mt-1">
              거래처: <span className="text-fg-primary">{sale.customer?.name || '일반 고객'}</span>
            </p>
            <p className="text-sm text-fg-secondary mt-1">
              판매금액: <span className="font-mono text-fg-primary">₩{sale.final_amount.toLocaleString()}</span>
            </p>
          </div>

          {/* 상품 목록 */}
          <div>
            <p className="text-sm font-medium text-fg-primary mb-2">반품할 상품 선택</p>
            <div className="space-y-2">
              {sale.items.map((item) => {
                const returnedQty = getReturnedQuantity(item.id)
                const maxQty = getMaxReturnQuantity(item)
                const selected = returnItems.find(r => r.saleItem.id === item.id)
                const isFullyReturned = maxQty <= 0

                return (
                  <div
                    key={item.id}
                    className={`border rounded-md p-3 transition-colors ${
                      isFullyReturned
                        ? 'border-border-subtle bg-bg-tertiary/50 opacity-50'
                        : selected
                        ? 'border-point bg-point/5'
                        : 'border-border-subtle hover:border-border-secondary cursor-pointer'
                    }`}
                    onClick={() => !isFullyReturned && toggleReturnItem(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-fg-primary text-sm">
                          {item.product_name}
                        </p>
                        {(item.color || item.size) && (
                          <p className="text-xs text-fg-tertiary">
                            {item.color}{item.color && item.size && '/'}{item.size}
                          </p>
                        )}
                        <p className="text-xs text-fg-secondary mt-1">
                          {item.quantity}개 × ₩{item.unit_price.toLocaleString()}
                          {returnedQty > 0 && (
                            <span className="text-warning ml-2">
                              (반품됨: {returnedQty}개)
                            </span>
                          )}
                        </p>
                      </div>

                      {isFullyReturned ? (
                        <span className="text-xs text-fg-tertiary">전량 반품됨</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => toggleReturnItem(item)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-point"
                        />
                      )}
                    </div>

                    {/* 선택된 항목: 수량 및 사유 */}
                    {selected && (
                      <div className="mt-3 pt-3 border-t border-border-subtle space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-fg-secondary">반품 수량:</label>
                          <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={selected.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 input input-sm"
                          />
                          <span className="text-xs text-fg-tertiary">/ {maxQty}개</span>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="반품 사유 (선택)"
                            value={selected.reason}
                            onChange={(e) => updateReason(item.id, e.target.value)}
                            className="w-full input input-sm"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono text-danger">
                            환불: ₩{(selected.quantity * item.unit_price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-sm font-medium text-fg-primary">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="반품 관련 메모 (선택)"
              className="input mt-1 h-20 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-bg-tertiary/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-fg-secondary">
              선택된 상품: {returnItems.length}건
            </span>
            <span className="font-mono font-bold text-lg text-danger">
              총 환불: ₩{totalRefund.toLocaleString()}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 btn btn-ghost"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={returnItems.length === 0 || createReturn.isPending}
              className="flex-1 btn btn-primary"
            >
              {createReturn.isPending ? '처리 중...' : '반품 등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
