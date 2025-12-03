import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Phone, MessageCircle, Search, Store, AlertCircle } from 'lucide-react'
import { useShopProfile, useCatalogProducts, useCatalogProductDetail } from '@/hooks/useCatalog'
import { useCartStore } from '@/stores/cartStore'
import CatalogProductCard from '@/components/catalog/CatalogProductCard'
import ProductBottomSheet from '@/components/catalog/ProductBottomSheet'
import CartFloating from '@/components/catalog/CartFloating'
import CartSheet from '@/components/catalog/CartSheet'

export default function CatalogPage() {
  const { slug } = useParams<{ slug: string }>()
  const { setShopSlug } = useCartStore()

  // 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)

  // 데이터 조회
  const { data: shopInfo, isLoading: shopLoading, error: shopError } = useShopProfile(slug)
  const { data: products = [], isLoading: productsLoading } = useCatalogProducts(slug)
  const { data: selectedProduct, isLoading: productDetailLoading } = useCatalogProductDetail(
    slug,
    selectedProductId || undefined
  )

  // 매장 slug 설정 (다른 매장이면 장바구니 초기화)
  useEffect(() => {
    if (slug) {
      setShopSlug(slug)
    }
  }, [slug, setShopSlug])

  // 카테고리 목록 (매장 설정 + 상품에서 추출)
  const categories = useMemo((): string[] => {
    const shopCategories = shopInfo?.categories || ['전체']
    // 상품에서 카테고리 추출하여 추가
    const productCategories = products.map((p) => p.category).filter((c): c is string => Boolean(c))
    const allCategories = new Set([...shopCategories, ...productCategories])
    // '전체'가 맨 앞에 오도록
    return ['전체', ...Array.from(allCategories).filter((c) => c !== '전체')]
  }, [shopInfo?.categories, products])

  // 필터링된 상품 목록
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 카테고리 필터
      if (selectedCategory !== '전체' && product.category !== selectedCategory) {
        return false
      }
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          product.name.toLowerCase().includes(query) ||
          product.code?.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [products, selectedCategory, searchQuery])

  // 로딩 상태
  if (shopLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-point border-t-transparent" />
      </div>
    )
  }

  // 매장 없음 또는 비활성화
  if (shopError || !shopInfo) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
        <Store size={64} className="text-fg-muted mb-4" />
        <h1 className="text-xl font-semibold text-fg-primary mb-2">
          매장을 찾을 수 없습니다
        </h1>
        <p className="text-fg-secondary text-center">
          링크가 올바른지 확인해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-20 safe-area-bottom">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur-sm border-b border-border-subtle safe-area-top">
        {/* 매장 정보 */}
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-fg-primary">{shopInfo.display_name}</h1>
          {shopInfo.building && (
            <p className="text-sm text-fg-secondary mt-0.5">{shopInfo.building}</p>
          )}
          {shopInfo.description && (
            <p className="text-sm text-fg-tertiary mt-1 line-clamp-2">{shopInfo.description}</p>
          )}

          {/* 연락처 버튼 */}
          <div className="flex gap-2 mt-3">
            {shopInfo.phone && (
              <a
                href={`tel:${shopInfo.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-tertiary text-fg-secondary text-sm hover:bg-bg-hover transition-colors"
              >
                <Phone size={14} />
                전화
              </a>
            )}
            {shopInfo.kakao_id && (
              <a
                href={`kakaoopen://friend/${shopInfo.kakao_id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEE500] text-[#3C1E1E] text-sm hover:opacity-90 transition-opacity"
              >
                <MessageCircle size={14} />
                카카오톡
              </a>
            )}
          </div>
        </div>

        {/* 검색 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상품명, 코드 검색..."
              className="input pl-10 py-2"
            />
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="px-4 pb-2 overflow-x-auto scrollbar-none">
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-point text-white'
                    : 'bg-bg-tertiary text-fg-secondary hover:bg-bg-hover'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 상품 그리드 */}
      <main className="p-4">
        {productsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-point border-t-transparent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-fg-muted mb-3" />
            <p className="text-fg-secondary">
              {searchQuery || selectedCategory !== '전체'
                ? '검색 결과가 없습니다.'
                : '등록된 상품이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                showPrice={shopInfo.show_prices}
                onClick={() => setSelectedProductId(product.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 플로팅 장바구니 버튼 */}
      <CartFloating onClick={() => setIsCartOpen(true)} />

      {/* 상품 상세 바텀시트 */}
      <ProductBottomSheet
        product={selectedProduct || null}
        isOpen={!!selectedProductId && !productDetailLoading}
        onClose={() => setSelectedProductId(null)}
        showPrice={shopInfo.show_prices}
      />

      {/* 장바구니/주문서 시트 */}
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        shopName={shopInfo.display_name}
        kakaoId={shopInfo.kakao_id}
      />
    </div>
  )
}
