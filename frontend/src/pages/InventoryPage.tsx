import { useState, useMemo } from 'react'
import { useProducts, useUpdateVariant } from '@/hooks/useProducts'
import type { ProductWithVariants, ProductVariant } from '@/types/database.types'
import { Package, AlertTriangle, XCircle, CheckCircle, Plus, Grid3X3 } from 'lucide-react'
import StockMatrixModal from '@/components/StockMatrixModal'

type StockFilter = 'all' | 'out' | 'low' | 'normal'

interface FlatVariant extends ProductVariant {
  productName: string
  productCode: string | null
}

export default function InventoryPage() {
  const { data: products, isLoading } = useProducts()
  const updateVariant = useUpdateVariant()
  const [inventoryFilter, setInventoryFilter] = useState<StockFilter>('all')
  const [inventorySearch, setInventorySearch] = useState('')
  const [addStockInputs, setAddStockInputs] = useState<Record<string, string>>({})
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)

  // 모든 variants를 flat하게 펼침
  const allVariants = useMemo<FlatVariant[]>(() => {
    if (!products) return []
    const variants: FlatVariant[] = []
    products.forEach((product) => {
      product.variants?.forEach((v) => {
        variants.push({
          ...v,
          productName: product.name,
          productCode: product.code,
        })
      })
    })
    return variants
  }, [products])

  // 재고 현황 통계
  const stats = useMemo(() => {
    const total = allVariants.length
    const outOfStock = allVariants.filter((v) => v.stock === 0).length
    const lowStock = allVariants.filter((v) => v.stock > 0 && v.stock <= 5).length
    const normalStock = allVariants.filter((v) => v.stock > 5).length
    return { total, outOfStock, lowStock, normalStock }
  }, [allVariants])

  // 필터링 및 정렬된 variants
  const filteredVariants = useMemo(() => {
    let result = [...allVariants]

    // 검색 필터
    if (inventorySearch) {
      const query = inventorySearch.toLowerCase()
      result = result.filter(
        (v) =>
          v.productName.toLowerCase().includes(query) ||
          v.productCode?.toLowerCase().includes(query) ||
          v.color.toLowerCase().includes(query) ||
          v.size.toLowerCase().includes(query)
      )
    }

    // 재고 상태 필터링
    switch (inventoryFilter) {
      case 'out':
        result = result.filter((v) => v.stock === 0)
        break
      case 'low':
        result = result.filter((v) => v.stock > 0 && v.stock <= 5)
        break
      case 'normal':
        result = result.filter((v) => v.stock > 5)
        break
    }

    // 재고 적은 순 정렬
    result.sort((a, b) => a.stock - b.stock)

    return result
  }, [allVariants, inventoryFilter, inventorySearch])

  // 검색에 맞는 상품 필터링
  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!inventorySearch) return products
    const query = inventorySearch.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code?.toLowerCase().includes(query)
    )
  }, [products, inventorySearch])

  // 빠른 입고 처리
  const handleAddStock = async (variantId: string) => {
    const addAmount = parseInt(addStockInputs[variantId] || '0')
    if (addAmount <= 0) return

    const variant = allVariants.find((v) => v.id === variantId)
    if (!variant) return

    try {
      await updateVariant.mutateAsync({
        id: variantId,
        stock: variant.stock + addAmount,
      })
      setAddStockInputs((prev) => ({ ...prev, [variantId]: '' }))
    } catch (error) {
      console.error('재고 추가 실패:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-4 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">재고 관리</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">재고 현황 및 설정</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-3">
              <div className="skeleton skeleton-text w-1/2 mb-2" />
              <div className="skeleton skeleton-text w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-fg-primary">재고 관리</h1>
        <p className="text-sm md:text-base text-fg-secondary mt-1">
          총 {stats.total}개 옵션
          {stats.outOfStock > 0 && (
            <span className="text-danger ml-2">({stats.outOfStock}개 품절)</span>
          )}
        </p>
      </div>

      {/* 검색 */}
      <input
        type="text"
        className="input w-full"
        placeholder="상품명, 품번, 색상, 사이즈로 검색..."
        value={inventorySearch}
        onChange={(e) => setInventorySearch(e.target.value)}
      />

      {/* 재고 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => setInventoryFilter('all')}
          className={`glass-card p-3 text-left transition-all ${
            inventoryFilter === 'all' ? 'ring-2 ring-point/50' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Package size={18} className="text-fg-tertiary" />
            <span className="text-xs text-fg-tertiary">총 옵션</span>
          </div>
          <p className="text-2xl font-bold text-fg-primary">{stats.total}</p>
        </button>

        <button
          onClick={() => setInventoryFilter('out')}
          className={`glass-card p-3 text-left transition-all ${
            inventoryFilter === 'out' ? 'ring-2 ring-danger/50' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <XCircle size={18} className="text-danger" />
            <span className="text-xs text-fg-tertiary">품절</span>
          </div>
          <p className="text-2xl font-bold text-danger">{stats.outOfStock}</p>
        </button>

        <button
          onClick={() => setInventoryFilter('low')}
          className={`glass-card p-3 text-left transition-all ${
            inventoryFilter === 'low' ? 'ring-2 ring-warning/50' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={18} className="text-warning" />
            <span className="text-xs text-fg-tertiary">부족 (1~5)</span>
          </div>
          <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
        </button>

        <button
          onClick={() => setInventoryFilter('normal')}
          className={`glass-card p-3 text-left transition-all ${
            inventoryFilter === 'normal' ? 'ring-2 ring-point/50' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle size={18} className="text-point" />
            <span className="text-xs text-fg-tertiary">정상 (6+)</span>
          </div>
          <p className="text-2xl font-bold text-point">{stats.normalStock}</p>
        </button>
      </div>

      {/* 상품별 빠른 재고 설정 */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Grid3X3 size={18} className="text-point" />
            <h3 className="font-semibold text-fg-primary">
              상품별 재고 설정
              <span className="ml-2 text-sm font-normal text-fg-tertiary">
                (클릭하여 매트릭스 입력)
              </span>
            </h3>
          </div>
        </div>

        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredProducts.map((product) => {
            const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
            const variantCount = product.variants?.length || 0
            const outOfStockCount = product.variants?.filter((v) => v.stock === 0).length || 0

            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="text-left p-3 bg-bg-tertiary/50 hover:bg-bg-hover border border-border-subtle rounded-lg transition-all hover:border-point/30 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg-primary truncate group-hover:text-point-light transition-colors">
                      {product.name}
                    </p>
                    {product.code && (
                      <p className="text-xs text-fg-tertiary font-mono">{product.code}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-lg font-bold font-mono ${
                        totalStock === 0
                          ? 'text-danger'
                          : totalStock <= 5
                          ? 'text-warning'
                          : 'text-fg-primary'
                      }`}
                    >
                      {totalStock}
                    </p>
                    <p className="text-xs text-fg-tertiary">{variantCount}개 옵션</p>
                  </div>
                </div>
                {outOfStockCount > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-danger">
                    <XCircle size={12} />
                    <span>{outOfStockCount}개 품절</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 옵션별 재고 리스트 */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-semibold text-fg-primary">
            옵션별 재고 현황
            <span className="ml-2 text-sm font-normal text-fg-tertiary">
              ({filteredVariants.length}개)
            </span>
          </h3>
        </div>

        {filteredVariants.length === 0 ? (
          <div className="p-8 text-center text-fg-tertiary">
            {inventoryFilter === 'all' ? '등록된 옵션이 없습니다.' : '해당하는 옵션이 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-fg-tertiary border-b border-border-subtle bg-bg-tertiary/50">
                  <th className="px-3 py-2 font-medium">상품</th>
                  <th className="px-3 py-2 font-medium">색상</th>
                  <th className="px-3 py-2 font-medium">사이즈</th>
                  <th className="px-3 py-2 font-medium text-right">재고</th>
                  <th className="px-3 py-2 font-medium text-right">입고</th>
                </tr>
              </thead>
              <tbody>
                {filteredVariants.map((variant) => (
                  <tr
                    key={variant.id}
                    className="border-b border-border-subtle/50 hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div>
                        <span className="text-sm text-fg-primary font-medium">
                          {variant.productName}
                        </span>
                        {variant.productCode && (
                          <span className="ml-2 text-xs text-fg-tertiary font-mono">
                            ({variant.productCode})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-fg-secondary">{variant.color}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm text-fg-secondary">{variant.size}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 text-sm font-mono font-semibold rounded ${
                          variant.stock === 0
                            ? 'bg-danger/10 text-danger'
                            : variant.stock <= 5
                            ? 'bg-warning/10 text-warning'
                            : 'bg-point/10 text-point'
                        }`}
                      >
                        {variant.stock}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={addStockInputs[variant.id] || ''}
                          onChange={(e) =>
                            setAddStockInputs((prev) => ({
                              ...prev,
                              [variant.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddStock(variant.id)
                            }
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 text-sm text-center bg-bg-tertiary border border-border-subtle rounded-md focus:ring-2 focus:ring-point/50 focus:border-point"
                        />
                        <button
                          onClick={() => handleAddStock(variant.id)}
                          disabled={
                            !addStockInputs[variant.id] ||
                            parseInt(addStockInputs[variant.id]) <= 0 ||
                            updateVariant.isPending
                          }
                          className="p-1.5 bg-point/10 text-point rounded-md hover:bg-point/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="입고"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Matrix Modal */}
      {selectedProduct && (
        <StockMatrixModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
