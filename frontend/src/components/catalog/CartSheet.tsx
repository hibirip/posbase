import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Minus, Plus, Send, Check } from 'lucide-react'
import { useCartStore, generateOrderMessage } from '@/stores/cartStore'
import { useToast } from '@/components/Toast'

interface CartSheetProps {
  isOpen: boolean
  onClose: () => void
  shopName: string
  kakaoId?: string | null
}

export default function CartSheet({
  isOpen,
  onClose,
  shopName,
  kakaoId,
}: CartSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()
  const {
    items,
    inquiries,
    removeItem,
    updateQuantity,
    removeInquiry,
    clearAll,
    getTotalPrice,
  } = useCartStore()

  const [buyerName, setBuyerName] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const totalPrice = getTotalPrice()

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // 주문서 생성 및 카카오톡 전송
  const handleSendOrder = async () => {
    const message = generateOrderMessage(shopName, items, inquiries, buyerName || undefined)

    try {
      await navigator.clipboard.writeText(message)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)

      addToast({
        type: 'success',
        title: '주문서가 복사되었습니다',
        message: '카카오톡에서 붙여넣기 해주세요',
      })

      // 카카오톡 앱 열기 시도
      if (kakaoId) {
        // 카카오톡 오픈채팅 딥링크
        window.location.href = `kakaotalk://launch`
      } else {
        // 일반 카카오톡
        window.location.href = 'kakaotalk://launch'
      }
    } catch {
      // 클립보드 복사 실패 시 fallback
      addToast({
        type: 'danger',
        title: '복사 실패',
        message: '주문서를 수동으로 복사해주세요',
      })
    }
  }

  // 주문서 미리보기 생성
  const orderPreview = generateOrderMessage(shopName, items, inquiries, buyerName || undefined)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-bg-secondary rounded-t-2xl animate-slide-up max-h-[90vh] flex flex-col safe-area-bottom"
      >
        {/* Handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-10 h-1 bg-fg-muted/50 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-fg-primary">주문서</h2>
          <div className="flex items-center gap-2">
            {(items.length > 0 || inquiries.length > 0) && (
              <button
                onClick={() => {
                  if (confirm('장바구니를 비우시겠습니까?')) {
                    clearAll()
                  }
                }}
                className="p-2 text-danger hover:bg-danger/10 rounded-md transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-fg-muted hover:text-fg-secondary rounded-md hover:bg-bg-hover transition-colors"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {items.length === 0 && inquiries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-fg-secondary">장바구니가 비어있습니다.</p>
              <p className="text-sm text-fg-tertiary mt-2">
                상품을 선택해주세요.
              </p>
            </div>
          ) : (
            <>
              {/* 구매자 이름 (선택) */}
              <div>
                <label className="text-sm font-medium text-fg-secondary block mb-1.5">
                  보내는 분 (선택)
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="거래처명 또는 성함"
                  className="input w-full"
                />
              </div>

              {/* 주문 상품 */}
              {items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-fg-secondary mb-2">
                    🛒 주문 상품 ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.variantId}
                        className="flex items-center gap-3 p-3 bg-bg-tertiary/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-fg-primary truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-fg-tertiary">
                            {item.color} / {item.size}
                          </p>
                          <p className="text-sm font-bold text-fg-primary mt-1">
                            ₩{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>

                        {/* 수량 조절 */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-bg-tertiary text-fg-secondary hover:bg-bg-hover"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-fg-primary">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-bg-tertiary text-fg-secondary hover:bg-bg-hover"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* 삭제 */}
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="p-1 text-fg-muted hover:text-danger transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 합계 */}
                  <div className="mt-3 p-3 bg-point/10 border border-point/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-fg-secondary">합계</span>
                      <span className="text-lg font-bold text-point-light">
                        ₩{totalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 미송 문의 */}
              {inquiries.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-fg-secondary mb-2">
                    📋 미송 문의 ({inquiries.length})
                  </h3>
                  <div className="space-y-2">
                    {inquiries.map((inquiry) => (
                      <div
                        key={`${inquiry.productId}-${inquiry.color}-${inquiry.size}`}
                        className="flex items-center gap-3 p-3 bg-warning/5 border border-warning/20 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-fg-primary truncate">
                            {inquiry.productName}
                          </p>
                          <p className="text-xs text-fg-tertiary">
                            {inquiry.color} / {inquiry.size} × {inquiry.quantity}개
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            removeInquiry(
                              inquiry.productId,
                              inquiry.color,
                              inquiry.size
                            )
                          }
                          className="p-1 text-fg-muted hover:text-danger transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 주문서 미리보기 */}
              <div>
                <h3 className="text-sm font-medium text-fg-secondary mb-2">
                  주문서 미리보기
                </h3>
                <div className="p-3 bg-bg-tertiary/50 rounded-lg">
                  <pre className="text-xs text-fg-secondary whitespace-pre-wrap font-sans">
                    {orderPreview}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {(items.length > 0 || inquiries.length > 0) && (
          <div className="p-4 border-t border-border-subtle flex-shrink-0">
            <button
              onClick={handleSendOrder}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {isCopied ? (
                <>
                  <Check size={20} />
                  복사 완료! 카카오톡에서 붙여넣기
                </>
              ) : (
                <>
                  <Send size={20} />
                  카카오톡으로 주문하기
                </>
              )}
            </button>
            <p className="text-xs text-fg-muted text-center mt-2">
              주문서가 클립보드에 복사되고 카카오톡이 열립니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
