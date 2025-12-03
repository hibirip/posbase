// 카탈로그 시스템 관련 타입 정의

import type { ProductVariant } from './database.types'

// 장바구니 아이템
export interface CartItem {
  productId: string
  productName: string
  variantId: string
  color: string
  size: string
  quantity: number
  price: number
  imageUrl?: string
}

// 미송 문의 (품절 상품)
export interface MisongInquiry {
  productId: string
  productName: string
  color: string
  size: string
  quantity: number
}

// 카탈로그용 상품 타입 (조회용)
export interface CatalogProduct {
  id: string
  name: string
  code: string | null
  category: string | null
  sale_price: number
  image_url: string | null
  total_stock: number
  variant_count: number
}

// 카탈로그용 상품 상세 (variants 포함)
export interface CatalogProductDetail {
  id: string
  name: string
  code: string | null
  category: string | null
  sale_price: number
  image_url: string | null
  variants: ProductVariant[]
}

// 카탈로그 매장 정보
export interface CatalogShopInfo {
  id: string
  display_name: string
  building: string | null
  description: string | null
  phone: string | null
  kakao_id: string | null
  show_prices: boolean
  categories: string[]
}

// 장바구니 상태
export interface CartState {
  items: CartItem[]
  inquiries: MisongInquiry[]
  shopSlug: string | null
}

// 주문서 생성 옵션
export interface OrderMessageOptions {
  shopName: string
  buyerName?: string
  items: CartItem[]
  inquiries: MisongInquiry[]
}
