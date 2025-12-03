import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'

interface CartFloatingProps {
  onClick: () => void
}

export default function CartFloating({ onClick }: CartFloatingProps) {
  const { inquiries, getTotalPrice, getTotalCount } = useCartStore()
  const totalCount = getTotalCount()
  const inquiryCount = inquiries.length
  const totalPrice = getTotalPrice()

  // 아무것도 없으면 표시하지 않음
  if (totalCount === 0 && inquiryCount === 0) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-4 right-4 z-40 bg-point hover:bg-point-hover text-white rounded-xl py-3 px-4 shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-between safe-area-bottom"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 flex items-center justify-center bg-white text-point text-xs font-bold rounded-full">
            {totalCount + inquiryCount}
          </span>
        </div>
        <span className="font-medium">장바구니</span>
      </div>

      <div className="text-right">
        {totalCount > 0 && (
          <p className="font-bold">₩{totalPrice.toLocaleString()}</p>
        )}
        {inquiryCount > 0 && (
          <p className="text-xs text-white/80">+ 미송문의 {inquiryCount}건</p>
        )}
      </div>
    </button>
  )
}
