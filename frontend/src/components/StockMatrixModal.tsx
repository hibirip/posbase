import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Package } from 'lucide-react'
import { useBatchUpdateVariants } from '@/hooks/useProducts'
import type { ProductWithVariants } from '@/types/database.types'

interface StockMatrixModalProps {
  product: ProductWithVariants
  isOpen: boolean
  onClose: () => void
}

interface StockValue {
  variantId: string
  originalStock: number
  currentStock: number
}

export default function StockMatrixModal({ product, isOpen, onClose }: StockMatrixModalProps) {
  const batchUpdate = useBatchUpdateVariants()
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // 색상과 사이즈 목록 추출
  const { colors, sizes } = useMemo(() => {
    const colorSet = new Set<string>()
    const sizeSet = new Set<string>()

    product.variants?.forEach((v) => {
      colorSet.add(v.color)
      sizeSet.add(v.size)
    })

    // 일반적인 사이즈 순서
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'FREE']
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
  }, [product.variants])

  // 재고 상태 관리 (color-size 키로 매핑)
  const [stockValues, setStockValues] = useState<Map<string, StockValue>>(new Map())

  // 초기 재고 값 설정
  useEffect(() => {
    if (isOpen && product.variants) {
      const initialMap = new Map<string, StockValue>()
      product.variants.forEach((v) => {
        const key = `${v.color}-${v.size}`
        initialMap.set(key, {
          variantId: v.id,
          originalStock: v.stock,
          currentStock: v.stock,
        })
      })
      setStockValues(initialMap)
    }
  }, [isOpen, product.variants])

  // 재고 값 가져오기
  const getStockValue = (color: string, size: string): StockValue | undefined => {
    return stockValues.get(`${color}-${size}`)
  }

  // 재고 값 변경
  const handleStockChange = (color: string, size: string, value: string) => {
    const key = `${color}-${size}`
    const existing = stockValues.get(key)
    if (!existing) return

    const numValue = parseInt(value) || 0
    setStockValues((prev) => {
      const newMap = new Map(prev)
      newMap.set(key, { ...existing, currentStock: Math.max(0, numValue) })
      return newMap
    })
  }

  // 변경된 항목 가져오기
  const getChangedItems = useCallback(() => {
    const changed: { id: string; stock: number }[] = []
    stockValues.forEach((value) => {
      if (value.currentStock !== value.originalStock) {
        changed.push({ id: value.variantId, stock: value.currentStock })
      }
    })
    return changed
  }, [stockValues])

  // 변경 사항 있는지 확인
  const hasChanges = useMemo(() => getChangedItems().length > 0, [getChangedItems])

  // Tab 키로 다음 셀로 이동
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    colorIndex: number,
    sizeIndex: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      e.preventDefault()

      let nextColorIndex = colorIndex
      let nextSizeIndex = sizeIndex

      if (e.shiftKey) {
        // Shift+Tab: 이전 셀
        nextSizeIndex--
        if (nextSizeIndex < 0) {
          nextSizeIndex = sizes.length - 1
          nextColorIndex--
        }
        if (nextColorIndex < 0) {
          nextColorIndex = colors.length - 1
        }
      } else {
        // Tab: 다음 셀
        nextSizeIndex++
        if (nextSizeIndex >= sizes.length) {
          nextSizeIndex = 0
          nextColorIndex++
        }
        if (nextColorIndex >= colors.length) {
          nextColorIndex = 0
        }
      }

      // 해당 셀이 존재하는지 확인하고 포커스
      let attempts = 0
      while (attempts < colors.length * sizes.length) {
        const nextKey = `${colors[nextColorIndex]}-${sizes[nextSizeIndex]}`
        const nextInput = inputRefs.current.get(nextKey)
        if (nextInput) {
          nextInput.focus()
          nextInput.select()
          break
        }

        // 다음 셀로
        if (e.shiftKey) {
          nextSizeIndex--
          if (nextSizeIndex < 0) {
            nextSizeIndex = sizes.length - 1
            nextColorIndex--
          }
          if (nextColorIndex < 0) {
            nextColorIndex = colors.length - 1
          }
        } else {
          nextSizeIndex++
          if (nextSizeIndex >= sizes.length) {
            nextSizeIndex = 0
            nextColorIndex++
          }
          if (nextColorIndex >= colors.length) {
            nextColorIndex = 0
          }
        }
        attempts++
      }
    }
  }

  // 저장 처리
  const handleSubmit = async () => {
    const changed = getChangedItems()
    if (changed.length === 0) {
      onClose()
      return
    }

    try {
      await batchUpdate.mutateAsync(changed)
      onClose()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  // 첫 번째 입력 필드에 포커스
  useEffect(() => {
    if (isOpen && colors.length > 0 && sizes.length > 0) {
      setTimeout(() => {
        // 첫 번째 유효한 셀 찾기
        for (const color of colors) {
          for (const size of sizes) {
            const key = `${color}-${size}`
            const input = inputRefs.current.get(key)
            if (input) {
              input.focus()
              input.select()
              return
            }
          }
        }
      }, 100)
    }
  }, [isOpen, colors, sizes])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <Package size={20} strokeWidth={1.5} className="text-fg-secondary flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-fg-primary truncate">{product.name}</h2>
              {product.code && (
                <p className="text-xs text-fg-tertiary font-mono">{product.code}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg-secondary rounded-md hover:bg-bg-hover transition-colors flex-shrink-0 ml-2"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {/* 안내 문구 */}
          <p className="text-xs text-fg-tertiary mb-4">
            Tab으로 다음 칸 이동 · Enter로 저장 · Esc로 취소
          </p>

          {/* Matrix Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-fg-tertiary border-b border-border-subtle w-24">
                    색상 / 사이즈
                  </th>
                  {sizes.map((size) => (
                    <th
                      key={size}
                      className="p-2 text-center text-xs font-medium text-fg-secondary border-b border-border-subtle min-w-[60px]"
                    >
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((color, colorIndex) => (
                  <tr key={color} className="border-b border-border-subtle/50">
                    <td className="p-2 text-sm font-medium text-fg-primary bg-bg-tertiary/30">
                      {color}
                    </td>
                    {sizes.map((size, sizeIndex) => {
                      const stockValue = getStockValue(color, size)
                      const key = `${color}-${size}`

                      if (!stockValue) {
                        // 해당 조합의 옵션이 없는 경우
                        return (
                          <td
                            key={key}
                            className="p-2 text-center bg-bg-tertiary/20"
                          >
                            <span className="text-fg-muted text-xs">-</span>
                          </td>
                        )
                      }

                      const isChanged = stockValue.currentStock !== stockValue.originalStock
                      const isEmpty = stockValue.currentStock === 0

                      return (
                        <td key={key} className="p-1">
                          <input
                            ref={(el) => {
                              if (el) {
                                inputRefs.current.set(key, el)
                              } else {
                                inputRefs.current.delete(key)
                              }
                            }}
                            type="number"
                            min="0"
                            value={stockValue.currentStock}
                            onChange={(e) => handleStockChange(color, size, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, colorIndex, sizeIndex)}
                            onFocus={(e) => e.target.select()}
                            className={`w-full px-2 py-1.5 text-center text-sm font-mono rounded-md border transition-colors
                              ${isEmpty
                                ? 'border-danger/30 bg-danger/10 text-danger'
                                : isChanged
                                ? 'border-point/50 bg-point/10 text-point-light'
                                : 'border-border-subtle bg-bg-tertiary text-fg-primary'
                              }
                              focus:ring-2 focus:ring-point/50 focus:border-point
                            `}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 변경 사항 요약 */}
          {hasChanges && (
            <div className="mt-4 p-3 bg-point/5 border border-point/20 rounded-md">
              <p className="text-sm text-point-light">
                {getChangedItems().length}개 옵션의 재고가 변경되었습니다.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-bg-tertiary/50">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 btn btn-ghost">
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={batchUpdate.isPending}
              className="flex-1 btn btn-primary"
            >
              {batchUpdate.isPending ? '저장 중...' : hasChanges ? '저장' : '닫기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
