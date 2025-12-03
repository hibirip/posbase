import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MisongInquiry } from '@/types/catalog.types'

interface CartState {
  items: CartItem[]
  inquiries: MisongInquiry[]
  shopSlug: string | null

  // Actions
  setShopSlug: (slug: string) => void
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearItems: () => void

  addInquiry: (inquiry: MisongInquiry) => void
  removeInquiry: (productId: string, color: string, size: string) => void
  clearInquiries: () => void

  clearAll: () => void

  // Computed (getter functions)
  getTotalPrice: () => number
  getTotalCount: () => number
  getInquiryCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      inquiries: [],
      shopSlug: null,

      setShopSlug: (slug) => {
        const currentSlug = get().shopSlug
        // 다른 매장이면 장바구니 초기화
        if (currentSlug && currentSlug !== slug) {
          set({ items: [], inquiries: [], shopSlug: slug })
        } else {
          set({ shopSlug: slug })
        }
      },

      addItem: (item) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.variantId === item.variantId
          )

          if (existingIndex !== -1) {
            // 기존 아이템이 있으면 수량 증가
            const newItems = [...state.items]
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + item.quantity,
            }
            return { items: newItems }
          }

          // 새 아이템 추가
          return { items: [...state.items, item] }
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.variantId !== variantId) }
          }

          return {
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, quantity } : i
            ),
          }
        }),

      clearItems: () => set({ items: [] }),

      addInquiry: (inquiry) =>
        set((state) => {
          // 중복 체크
          const exists = state.inquiries.some(
            (i) =>
              i.productId === inquiry.productId &&
              i.color === inquiry.color &&
              i.size === inquiry.size
          )

          if (exists) {
            // 기존 것 업데이트
            return {
              inquiries: state.inquiries.map((i) =>
                i.productId === inquiry.productId &&
                i.color === inquiry.color &&
                i.size === inquiry.size
                  ? { ...i, quantity: inquiry.quantity }
                  : i
              ),
            }
          }

          return { inquiries: [...state.inquiries, inquiry] }
        }),

      removeInquiry: (productId, color, size) =>
        set((state) => ({
          inquiries: state.inquiries.filter(
            (i) =>
              !(i.productId === productId && i.color === color && i.size === size)
          ),
        })),

      clearInquiries: () => set({ inquiries: [] }),

      clearAll: () => set({ items: [], inquiries: [], shopSlug: null }),

      getTotalPrice: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      getTotalCount: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getInquiryCount: () => {
        const { inquiries } = get()
        return inquiries.length
      },
    }),
    {
      name: 'posbase-catalog-cart',
      // localStorage에 저장할 항목 선택
      partialize: (state) => ({
        items: state.items,
        inquiries: state.inquiries,
        shopSlug: state.shopSlug,
      }),
    }
  )
)

// 주문서 메시지 생성 유틸리티 함수
export function generateOrderMessage(
  _shopName: string,
  items: CartItem[],
  inquiries: MisongInquiry[],
  buyerName?: string
): string {
  const lines: string[] = []

  // 헤더
  if (buyerName) {
    lines.push(`[주문요청] ${buyerName}`)
  } else {
    lines.push(`[주문요청]`)
  }
  lines.push('')

  // 주문 상품
  if (items.length > 0) {
    lines.push('🛒 주문')
    items.forEach((item) => {
      const colorSize = [item.color, item.size].filter(Boolean).join(' ')
      lines.push(`• ${item.productName} ${colorSize} x ${item.quantity}`)
    })

    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    lines.push(`합계: ${totalPrice.toLocaleString()}원`)
    lines.push('')
  }

  // 미송 문의
  if (inquiries.length > 0) {
    lines.push('📋 미송 문의')
    inquiries.forEach((inquiry) => {
      const colorSize = [inquiry.color, inquiry.size].filter(Boolean).join(' ')
      lines.push(
        `• ${inquiry.productName} ${colorSize} x ${inquiry.quantity}개 가능할까요?`
      )
    })
    lines.push('')
  }

  lines.push('확인 부탁드립니다 🙏')

  return lines.join('\n')
}
