import { useMemo, useState, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { ProductVariant } from '@/types/database.types'
import type { CartItem, MisongInquiry } from '@/types/catalog.types'

interface VariantMatrixProps {
  productId: string
  productName: string
  salePrice: number
  imageUrl?: string | null
  variants: ProductVariant[]
  onAddToCart: (items: CartItem[]) => void
  onAddInquiry?: (inquiry: MisongInquiry) => void
}

interface QuantityState {
  [key: string]: number // "color-size" -> quantity
}

export default function VariantMatrix({
  productId,
  productName,
  salePrice,
  imageUrl,
  variants,
  onAddToCart,
  onAddInquiry,
}: VariantMatrixProps) {
  const [quantities, setQuantities] = useState<QuantityState>({})
  const [inquiryQuantities, setInquiryQuantities] = useState<QuantityState>({})

  // 색상과 사이즈 목록 추출
  const { colors, sizes } = useMemo(() => {
    const colorSet = new Set<string>()
    const sizeSet = new Set<string>()

    variants.forEach((v) => {
      colorSet.add(v.color)
      sizeSet.add(v.size)
    })

    // 일반적인 사이즈 순서
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'FREE', '44', '55', '66', '77', '88']
    const sortedSizes = Array.from(sizeSet).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase())
      const bIndex = sizeOrder.indexOf(b.toUpperCase())
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })

    return {
      colors: Array.from(colorSet),
      sizes: sortedSizes,
    }
  }, [variants])

  // variant 찾기
  const getVariant = useCallback(
    (color: string, size: string) => {
      return variants.find((v) => v.color === color && v.size === size)
    },
    [variants]
  )

  // 수량 변경
  const handleQuantityChange = (color: string, size: string, delta: number) => {
    const key = `${color}-${size}`
    const variant = getVariant(color, size)
    if (!variant) return

    setQuantities((prev) => {
      const current = prev[key] || 0
      const newValue = Math.max(0, Math.min(variant.stock, current + delta))
      if (newValue === 0) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: newValue }
    })
  }

  // 미송 문의 수량 변경
  const handleInquiryChange = (color: string, size: string, value: string) => {
    const key = `${color}-${size}`
    const numValue = parseInt(value) || 0
    if (numValue === 0) {
      const { [key]: _, ...rest } = inquiryQuantities
      setInquiryQuantities(rest)
    } else {
      setInquiryQuantities((prev) => ({ ...prev, [key]: Math.max(0, numValue) }))
    }
  }

  // 선택된 항목 수
  const selectedCount = Object.values(quantities).reduce((sum, q) => sum + q, 0)
  const inquiryCount = Object.keys(inquiryQuantities).length

  // 장바구니에 담기
  const handleAddToCart = () => {
    const items: CartItem[] = []

    Object.entries(quantities).forEach(([key, quantity]) => {
      if (quantity > 0) {
        const [color, size] = key.split('-')
        const variant = getVariant(color, size)
        if (variant) {
          items.push({
            productId,
            productName,
            variantId: variant.id,
            color,
            size,
            quantity,
            price: salePrice,
            imageUrl: imageUrl || undefined,
          })
        }
      }
    })

    // 미송 문의도 처리
    if (onAddInquiry) {
      Object.entries(inquiryQuantities).forEach(([key, quantity]) => {
        if (quantity > 0) {
          const [color, size] = key.split('-')
          onAddInquiry({
            productId,
            productName,
            color,
            size,
            quantity,
          })
        }
      })
    }

    if (items.length > 0) {
      onAddToCart(items)
    }

    // 초기화
    setQuantities({})
    setInquiryQuantities({})
  }

  // 품절 옵션 있는지 확인
  const hasOutOfStock = useMemo(() => {
    return colors.some((color) =>
      sizes.some((size) => {
        const variant = getVariant(color, size)
        return variant && variant.stock === 0
      })
    )
  }, [colors, sizes, getVariant])

  return (
    <div className="space-y-4">
      {/* 매트릭스 테이블 */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full border-collapse min-w-[300px]">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-fg-tertiary border-b border-border-subtle sticky left-0 bg-bg-secondary z-10">
                색상
              </th>
              {sizes.map((size) => (
                <th
                  key={size}
                  className="p-2 text-center text-xs font-medium text-fg-secondary border-b border-border-subtle min-w-[70px]"
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => (
              <tr key={color} className="border-b border-border-subtle/50">
                <td className="p-2 text-sm font-medium text-fg-primary bg-bg-tertiary/30 sticky left-0 z-10">
                  {color}
                </td>
                {sizes.map((size) => {
                  const key = `${color}-${size}`
                  const variant = getVariant(color, size)

                  if (!variant) {
                    // 해당 조합 없음
                    return (
                      <td key={key} className="p-1 text-center bg-bg-tertiary/20">
                        <span className="text-fg-muted text-xs">-</span>
                      </td>
                    )
                  }

                  const isOutOfStock = variant.stock === 0
                  const quantity = quantities[key] || 0

                  if (isOutOfStock) {
                    // 품절
                    return (
                      <td key={key} className="p-1 text-center">
                        <span className="text-xs text-danger font-medium">품절</span>
                      </td>
                    )
                  }

                  return (
                    <td key={key} className="p-1">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(color, size, -1)}
                          disabled={quantity === 0}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-bg-tertiary text-fg-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={14} />
                        </button>
                        <span
                          className={`w-8 text-center text-sm font-mono ${
                            quantity > 0 ? 'text-point-light font-bold' : 'text-fg-tertiary'
                          }`}
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(color, size, 1)}
                          disabled={quantity >= variant.stock}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-bg-tertiary text-fg-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {/* 재고 표시 */}
                      <p className="text-[10px] text-fg-muted text-center mt-0.5">
                        재고 {variant.stock}
                      </p>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 품절 상품 미송 문의 */}
      {hasOutOfStock && onAddInquiry && (
        <div className="border-t border-border-subtle pt-4">
          <button
            type="button"
            className="w-full text-left p-3 bg-bg-tertiary/50 rounded-lg"
            onClick={() => {
              const el = document.getElementById('inquiry-section')
              if (el) el.classList.toggle('hidden')
            }}
          >
            <p className="text-sm font-medium text-fg-secondary">
              💬 품절 상품 미송 문의
            </p>
            <p className="text-xs text-fg-tertiary mt-1">
              품절된 상품의 수량을 입력하면 주문서에 포함됩니다
            </p>
          </button>

          <div id="inquiry-section" className="hidden mt-3 space-y-2">
            {colors.map((color) =>
              sizes.map((size) => {
                const variant = getVariant(color, size)
                if (!variant || variant.stock > 0) return null

                const key = `${color}-${size}`
                const value = inquiryQuantities[key] || ''

                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-fg-secondary">
                      {color} {size}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="수량"
                      value={value}
                      onChange={(e) => handleInquiryChange(color, size, e.target.value)}
                      className="w-20 px-2 py-1 text-center text-sm rounded-md border border-border-subtle bg-bg-tertiary text-fg-primary focus:ring-2 focus:ring-point/50"
                    />
                    <span className="text-fg-muted">개</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* 장바구니 담기 버튼 */}
      <div className="pt-2">
        <button
          onClick={handleAddToCart}
          disabled={selectedCount === 0 && inquiryCount === 0}
          className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedCount > 0 && inquiryCount > 0
            ? `장바구니 담기 (${selectedCount}개 + 문의 ${inquiryCount}개)`
            : selectedCount > 0
            ? `장바구니 담기 (${selectedCount}개)`
            : inquiryCount > 0
            ? `미송 문의 담기 (${inquiryCount}개)`
            : '상품을 선택해주세요'}
        </button>
      </div>
    </div>
  )
}
