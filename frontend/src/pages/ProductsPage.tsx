import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import type { ProductWithVariants } from '@/types/database.types'

export default function ProductsPage() {
  const { data: products, isLoading, error } = useProducts()
  const deleteProduct = useDeleteProduct()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" 상품을 삭제하시겠습니까?`)) {
      await deleteProduct.mutateAsync(id)
    }
  }

  if (error) {
    return (
      <div className="p-8 text-center text-danger">
        상품을 불러오는 중 오류가 발생했습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">상품 관리</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">
            총 {products?.length || 0}개 상품
          </p>
        </div>
        <Link to="/products/new" className="btn btn-primary text-sm md:text-base">
          + 상품 등록
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          className="input flex-1"
          placeholder="상품명 또는 품번으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton skeleton-text w-1/3 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
          </p>
          {!searchTerm && (
            <Link to="/products/new" className="btn btn-primary mt-4">
              첫 상품 등록하기
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={() => handleDelete(product.id, product.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Product Card Component
interface ProductCardProps {
  product: ProductWithVariants
  onDelete: () => void
}

function ProductCard({ product, onDelete }: ProductCardProps) {
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
  const variantCount = product.variants?.length || 0

  return (
    <div className="glass-card p-4 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 품번 & 이름 */}
          <div className="flex items-center gap-2">
            {product.code && (
              <span className="badge badge-neutral">{product.code}</span>
            )}
            <h3 className="font-semibold text-fg-primary truncate">
              {product.name}
            </h3>
          </div>

          {/* 카테고리 & 옵션 수 */}
          <div className="flex items-center gap-3 mt-2 text-sm text-fg-secondary">
            {product.category && <span>{product.category}</span>}
            <span>{variantCount}개 옵션</span>
          </div>

          {/* 가격 */}
          <div className="flex items-center gap-4 mt-3">
            <div>
              <span className="text-xs text-fg-tertiary">원가</span>
              <p className="font-mono font-semibold text-fg-secondary">
                ₩{product.cost_price.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-fg-tertiary">판매가</span>
              <p className="font-mono font-semibold text-fg-primary">
                ₩{product.sale_price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* 재고 & 액션 */}
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <span className="text-xs text-fg-tertiary">총 재고</span>
            <p className={`font-mono font-bold text-xl ${totalStock <= 5 ? 'text-danger' : 'text-fg-primary'}`}>
              {totalStock}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/products/${product.id}`}
              className="btn btn-ghost btn-sm"
            >
              수정
            </Link>
            <button
              onClick={onDelete}
              className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
            >
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* Variants Preview */}
      {product.variants && product.variants.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex flex-wrap gap-2">
            {product.variants.slice(0, 6).map((v) => (
              <span
                key={v.id}
                className={`px-2 py-1 text-xs rounded-md border ${
                  v.stock <= 0
                    ? 'bg-danger/10 border-danger/20 text-danger'
                    : v.stock <= 5
                    ? 'bg-warning/10 border-warning/20 text-warning'
                    : 'bg-bg-tertiary border-border-subtle text-fg-secondary'
                }`}
              >
                {v.color}/{v.size}: {v.stock}
              </span>
            ))}
            {product.variants.length > 6 && (
              <span className="px-2 py-1 text-xs text-fg-tertiary">
                +{product.variants.length - 6}개 더
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
