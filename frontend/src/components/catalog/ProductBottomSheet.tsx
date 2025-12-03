import { useEffect, useRef } from 'react'
import { X, Package } from 'lucide-react'
import VariantMatrix from './VariantMatrix'
import { useCartStore } from '@/stores/cartStore'
import { useToast } from '@/components/Toast'
import type { ProductWithVariants } from '@/types/database.types'
import type { CartItem, MisongInquiry } from '@/types/catalog.types'

interface ProductBottomSheetProps {
  product: ProductWithVariants | null
  isOpen: boolean
  onClose: () => void
  showPrice: boolean
}

export default function ProductBottomSheet({
  product,
  isOpen,
  onClose,
  showPrice,
}: ProductBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const { addItem, addInquiry } = useCartStore()
  const { addToast } = useToast()

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

  const handleAddToCart = (items: CartItem[]) => {
    items.forEach((item) => addItem(item))
    addToast({
      type: 'success',
      title: '장바구니에 담았습니다',
      message: `${items.length}개 옵션이 추가되었습니다`,
    })
    onClose()
  }

  const handleAddInquiry = (inquiry: MisongInquiry) => {
    addInquiry(inquiry)
  }

  if (!isOpen || !product) return null

  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
  const isOutOfStock = totalStock === 0

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
        <div className="px-4 pb-3 border-b border-border-subtle flex items-start gap-3 flex-shrink-0">
          {/* 이미지 썸네일 */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-bg-tertiary flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={24} className="text-fg-muted" />
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-fg-primary line-clamp-2">
              {product.name}
            </h2>
            {product.code && (
              <p className="text-xs text-fg-tertiary font-mono mt-0.5">{product.code}</p>
            )}
            {showPrice && (
              <p className="text-lg font-bold text-fg-primary mt-1">
                ₩{product.sale_price.toLocaleString()}
              </p>
            )}
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg-secondary rounded-md hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isOutOfStock ? (
            <div className="text-center py-8">
              <p className="text-fg-secondary">이 상품은 현재 품절입니다.</p>
              <p className="text-sm text-fg-tertiary mt-2">
                다른 상품을 확인해주세요.
              </p>
            </div>
          ) : (
            <VariantMatrix
              productId={product.id}
              productName={product.name}
              salePrice={product.sale_price}
              imageUrl={product.image_url}
              variants={product.variants || []}
              onAddToCart={handleAddToCart}
              onAddInquiry={handleAddInquiry}
            />
          )}
        </div>
      </div>
    </div>
  )
}
