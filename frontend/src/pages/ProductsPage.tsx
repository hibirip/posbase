import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import type { ProductWithVariants } from '@/types/database.types'
import { LayoutGrid, List, ChevronDown, Boxes } from 'lucide-react'

type StockFilter = 'all' | 'out' | 'low' | 'normal'
type SortBy = 'recent' | 'name' | 'stockDesc' | 'stockAsc' | 'priceDesc' | 'priceAsc'
type ViewMode = 'card' | 'list'

const CATEGORIES = ['전체', '상의', '하의', '아우터', '원피스', '세트', '기타']

const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'out', label: '품절' },
  { value: 'low', label: '부족' },
  { value: 'normal', label: '정상' },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'recent', label: '최근 등록순' },
  { value: 'name', label: '이름순' },
  { value: 'stockDesc', label: '재고 많은순' },
  { value: 'stockAsc', label: '재고 적은순' },
  { value: 'priceDesc', label: '가격 높은순' },
  { value: 'priceAsc', label: '가격 낮은순' },
]

export default function ProductsPage() {
  const { data: products, isLoading, error } = useProducts()
  const deleteProduct = useDeleteProduct()

  // 필터/정렬 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('전체')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // 필터링 및 정렬된 상품 목록
  const filteredProducts = useMemo(() => {
    if (!products) return []

    let result = [...products]

    // 검색 필터
    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) || p.code?.toLowerCase().includes(query)
      )
    }

    // 카테고리 필터
    if (category !== '전체') {
      result = result.filter((p) => p.category === category)
    }

    // 재고 필터
    result = result.filter((p) => {
      const totalStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
      switch (stockFilter) {
        case 'out':
          return totalStock === 0
        case 'low':
          return totalStock > 0 && totalStock <= 5
        case 'normal':
          return totalStock > 5
        default:
          return true
      }
    })

    // 정렬
    result.sort((a, b) => {
      const aStock = a.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
      const bStock = b.variants?.reduce((sum, v) => sum + v.stock, 0) || 0

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'stockDesc':
          return bStock - aStock
        case 'stockAsc':
          return aStock - bStock
        case 'priceDesc':
          return b.sale_price - a.sale_price
        case 'priceAsc':
          return a.sale_price - b.sale_price
        default: // recent
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return result
  }, [products, searchTerm, category, stockFilter, sortBy])

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" 상품을 삭제하시겠습니까?`)) {
      await deleteProduct.mutateAsync(id)
    }
  }

  // 필터 초기화
  const resetFilters = () => {
    setSearchTerm('')
    setCategory('전체')
    setStockFilter('all')
    setSortBy('recent')
  }

  const hasActiveFilters = searchTerm || category !== '전체' || stockFilter !== 'all'

  if (error) {
    return (
      <div className="p-8 text-center text-danger">상품을 불러오는 중 오류가 발생했습니다.</div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">상품 관리</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">
            총 {products?.length || 0}개 상품
            {filteredProducts.length !== (products?.length || 0) && (
              <span className="text-fg-tertiary"> (필터: {filteredProducts.length}개)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/inventory"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
          >
            <Boxes size={16} />
            재고 관리
          </Link>
          <Link to="/products/new" className="btn btn-primary text-sm md:text-base">
            + 상품 등록
          </Link>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        className="input w-full"
        placeholder="상품명 또는 품번으로 검색..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Filters */}
      <div className="glass-card p-2.5 md:p-3 space-y-2">
        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-tertiary w-16 shrink-0">카테고리</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  category === cat
                    ? 'bg-point/20 border-point/30 text-point-light'
                    : 'bg-bg-tertiary border-border-subtle text-fg-tertiary hover:text-fg-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-tertiary w-16 shrink-0">재고</span>
          <div className="flex flex-wrap gap-1.5">
            {STOCK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStockFilter(filter.value)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  stockFilter === filter.value
                    ? filter.value === 'out'
                      ? 'bg-danger/20 border-danger/30 text-danger'
                      : filter.value === 'low'
                      ? 'bg-warning/20 border-warning/30 text-warning'
                      : 'bg-point/20 border-point/30 text-point-light'
                    : 'bg-bg-tertiary border-border-subtle text-fg-tertiary hover:text-fg-secondary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & View */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded-md text-fg-secondary hover:text-fg-primary"
              >
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                <ChevronDown size={14} />
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-36 bg-bg-elevated border border-border-primary rounded-md shadow-lg z-20">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setShowSortDropdown(false)
                        }}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-bg-hover ${
                          sortBy === option.value ? 'text-point-light' : 'text-fg-secondary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-fg-tertiary hover:text-fg-secondary"
              >
                필터 초기화
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-bg-tertiary rounded-md p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded ${
                viewMode === 'card' ? 'bg-bg-hover text-fg-primary' : 'text-fg-tertiary'
              }`}
              title="카드 뷰"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list' ? 'bg-bg-hover text-fg-primary' : 'text-fg-tertiary'
              }`}
              title="리스트 뷰"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton skeleton-text w-1/3 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">
            {hasActiveFilters ? '필터 조건에 맞는 상품이 없습니다.' : '등록된 상품이 없습니다.'}
          </p>
          {hasActiveFilters ? (
            <button onClick={resetFilters} className="btn btn-ghost mt-4">
              필터 초기화
            </button>
          ) : (
            <Link to="/products/new" className="btn btn-primary mt-4">
              첫 상품 등록하기
            </Link>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={() => handleDelete(product.id, product.name)}
            />
          ))}
        </div>
      ) : (
        <ProductListView products={filteredProducts} onDelete={handleDelete} />
      )}
    </div>
  )
}

// Product Card Component (기존)
interface ProductCardProps {
  product: ProductWithVariants
  onDelete: () => void
}

function ProductCard({ product, onDelete }: ProductCardProps) {
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
  const variantCount = product.variants?.length || 0

  return (
    <div className="glass-card p-3 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 품번 & 이름 */}
          <div className="flex items-center gap-2">
            {product.code && <span className="badge badge-neutral">{product.code}</span>}
            <h3 className="font-semibold text-fg-primary truncate">{product.name}</h3>
          </div>

          {/* 카테고리 & 옵션 수 */}
          <div className="flex items-center gap-3 mt-1.5 text-sm text-fg-secondary">
            {product.category && <span>{product.category}</span>}
            <span>{variantCount}개 옵션</span>
          </div>

          {/* 가격 */}
          <div className="flex items-center gap-4 mt-2">
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
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <span className="text-xs text-fg-tertiary">총 재고</span>
            <p
              className={`font-mono font-bold text-xl ${
                totalStock === 0 ? 'text-danger' : totalStock <= 5 ? 'text-warning' : 'text-fg-primary'
              }`}
            >
              {totalStock}
            </p>
          </div>

          <div className="flex gap-2">
            <Link to={`/products/${product.id}`} className="btn btn-ghost btn-sm">
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
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <div className="flex flex-wrap gap-1.5">
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

// Product List View Component (새로 추가)
interface ProductListViewProps {
  products: ProductWithVariants[]
  onDelete: (id: string, name: string) => void
}

function ProductListView({ products, onDelete }: ProductListViewProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-fg-tertiary border-b border-border-subtle bg-bg-tertiary/50">
              <th className="px-3 py-2 font-medium">품번</th>
              <th className="px-3 py-2 font-medium">상품명</th>
              <th className="px-3 py-2 font-medium hidden md:table-cell">카테고리</th>
              <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">원가</th>
              <th className="px-3 py-2 font-medium text-right">판매가</th>
              <th className="px-3 py-2 font-medium text-right">재고</th>
              <th className="px-3 py-2 font-medium text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
              return (
                <tr
                  key={product.id}
                  className="border-b border-border-subtle/50 hover:bg-bg-hover transition-colors"
                >
                  <td className="px-3 py-2">
                    <span className="text-xs text-fg-tertiary font-mono">{product.code || '-'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-sm text-fg-primary font-medium">{product.name}</span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <span className="text-sm text-fg-secondary">{product.category || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-right hidden sm:table-cell">
                    <span className="text-sm font-mono text-fg-tertiary">
                      ₩{product.cost_price.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-sm font-mono text-fg-primary">
                      ₩{product.sale_price.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`text-sm font-mono font-semibold ${
                        totalStock === 0
                          ? 'text-danger'
                          : totalStock <= 5
                          ? 'text-warning'
                          : 'text-fg-primary'
                      }`}
                    >
                      {totalStock}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/products/${product.id}`}
                        className="px-2 py-1 text-xs text-fg-secondary hover:text-fg-primary"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => onDelete(product.id, product.name)}
                        className="px-2 py-1 text-xs text-danger hover:bg-danger/10 rounded"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
