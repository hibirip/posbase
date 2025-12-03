import { Package } from 'lucide-react'
import type { CatalogProduct } from '@/types/catalog.types'

interface CatalogProductCardProps {
  product: CatalogProduct
  showPrice: boolean
  onClick: () => void
}

export default function CatalogProductCard({
  product,
  showPrice,
  onClick,
}: CatalogProductCardProps) {
  const isOutOfStock = product.total_stock === 0

  return (
    <div
      className={`cursor-pointer transition-all duration-200 active:scale-[0.98] ${
        isOutOfStock ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-bg-tertiary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-fg-muted" />
          </div>
        )}

        {/* 품절 오버레이 */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-semibold text-sm px-3 py-1 bg-black/60 rounded-full">
              품절
            </span>
          </div>
        )}
      </div>

      {/* 상품 정보 */}
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-fg-primary line-clamp-2">
          {product.name}
        </h3>
        {product.code && (
          <p className="text-xs text-fg-muted mt-0.5">{product.code}</p>
        )}
        {showPrice && (
          <p className={`text-sm font-bold mt-1 ${isOutOfStock ? 'text-fg-muted' : 'text-fg-primary'}`}>
            ₩{product.sale_price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
