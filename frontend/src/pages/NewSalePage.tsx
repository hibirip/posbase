import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { useCreateSale, type SaleItemInput } from '@/hooks/useSales'
import { useCreateBackorder } from '@/hooks/useBackorders'
import BottomSheet from '@/components/BottomSheet'
import type { ProductWithVariants, Customer, PaymentMethod } from '@/types/database.types'
import { ShoppingCart, X, Minus, Plus } from 'lucide-react'

interface CartItem extends SaleItemInput {
  id: string
  stock: number
  backorderQty: number
}

export default function NewSalePage() {
  const navigate = useNavigate()
  const { data: products } = useProducts()
  const { data: customers } = useCustomers()
  const createSale = useCreateSale()
  const createBackorder = useCreateBackorder()

  // 장바구니
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // 결제 정보
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [discount, setDiscount] = useState(0)
  const [receivedAmount, setReceivedAmount] = useState(0)
  const [memo] = useState('')

  // 검색
  const [productSearch, setProductSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSelect, setShowCustomerSelect] = useState(false)

  // 금액 계산
  const totalAmount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cart]
  )
  const finalAmount = totalAmount - discount
  const creditAmount = Math.max(0, finalAmount - receivedAmount)
  const changeAmount = Math.max(0, receivedAmount - finalAmount)

  // 미송 수량 계산
  const totalBackorderQty = useMemo(() =>
    cart.reduce((sum, item) => sum + item.backorderQty, 0),
    [cart]
  )
  const hasBackorders = totalBackorderQty > 0
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // 상품 검색
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products || []
    const search = productSearch.toLowerCase()
    return (products || []).filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.code?.toLowerCase().includes(search)
    )
  }, [products, productSearch])

  // 거래처 검색
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers || []
    const search = customerSearch.toLowerCase()
    return (customers || []).filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.contact_name?.toLowerCase().includes(search)
    )
  }, [customers, customerSearch])

  // 장바구니에 추가
  const addToCart = (product: ProductWithVariants, variant?: { id: string; color: string; size: string; stock: number }) => {
    const cartId = variant?.id || `product-${product.id}-${Date.now()}`
    const stock = variant?.stock ?? 999

    const existingIndex = cart.findIndex(item => item.id === cartId)

    if (existingIndex >= 0) {
      setCart(prev => prev.map((item, idx) => {
        if (idx !== existingIndex) return item
        const newQty = item.quantity + 1
        const backorderQty = Math.max(0, newQty - item.stock)
        return { ...item, quantity: newQty, backorderQty }
      }))
    } else {
      const newItem: CartItem = {
        id: cartId,
        variant_id: variant?.id,
        product_id: product.id,
        product_name: product.name,
        color: variant?.color,
        size: variant?.size,
        quantity: 1,
        unit_price: product.sale_price,
        stock,
        backorderQty: stock < 1 ? 1 : 0,
      }
      setCart(prev => [...prev, newItem])
    }

    setProductSearch('')
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
    } else {
      setCart(prev => prev.map(item => {
        if (item.id !== id) return item
        const backorderQty = Math.max(0, quantity - item.stock)
        return { ...item, quantity, backorderQty }
      }))
    }
  }

  const setFullPayment = () => {
    setReceivedAmount(finalAmount)
  }

  const handleSubmit = async () => {
    if (cart.length === 0) {
      alert('상품을 추가해주세요.')
      return
    }

    if (creditAmount > 0 && !selectedCustomer) {
      alert('외상 판매는 거래처를 선택해야 합니다.')
      return
    }

    if (hasBackorders && !selectedCustomer) {
      alert('미송 처리를 위해 거래처를 선택해야 합니다.')
      return
    }

    if (hasBackorders) {
      const backorderItems = cart.filter(item => item.backorderQty > 0)
      const backorderSummary = backorderItems
        .map(item => `${item.product_name} ${item.color || ''}${item.size ? '/' + item.size : ''}: ${item.backorderQty}개`)
        .join('\n')

      if (!confirm(`다음 상품이 재고 부족으로 미송 처리됩니다:\n\n${backorderSummary}\n\n계속하시겠습니까?`)) {
        return
      }
    }

    try {
      const saleItems = cart.map(({ id, stock, backorderQty, ...item }) => ({
        ...item,
        quantity: item.quantity - backorderQty,
      })).filter(item => item.quantity > 0)

      const sale = await createSale.mutateAsync({
        customer_id: selectedCustomer?.id,
        items: saleItems,
        discount_amount: discount,
        payment_method: creditAmount > 0 ? 'credit' : paymentMethod,
        paid_amount: receivedAmount,
        memo: hasBackorders ? `${memo ? memo + ' / ' : ''}미송 ${totalBackorderQty}개` : memo,
      })

      if (hasBackorders && selectedCustomer) {
        const backorderItems = cart.filter(item => item.backorderQty > 0 && item.variant_id)

        for (const item of backorderItems) {
          await createBackorder.mutateAsync({
            sale_id: sale.id,
            sale_item_id: sale.id,
            customer_id: selectedCustomer.id,
            variant_id: item.variant_id!,
            product_name: item.product_name,
            color: item.color,
            size: item.size,
            quantity: item.backorderQty,
          })
        }
      }

      const message = hasBackorders
        ? `판매가 완료되었습니다!\n미송 ${totalBackorderQty}개가 등록되었습니다.`
        : '판매가 완료되었습니다!'
      alert(message)
      navigate('/sales')
    } catch (err) {
      alert((err as Error).message)
    }
  }

  // 장바구니 & 결제 컴포넌트 (Desktop & Mobile 공용)
  const CartContent = () => (
    <div className="flex flex-col h-full">
      {/* 거래처 선택 */}
      <div className="p-4 border-b border-border-subtle">
        <div className="relative">
          <input
            type="text"
            className="input"
            placeholder="거래처 검색 (선택)"
            value={selectedCustomer ? selectedCustomer.name : customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setSelectedCustomer(null)
              setShowCustomerSelect(true)
            }}
            onFocus={() => setShowCustomerSelect(true)}
          />
          {selectedCustomer && (
            <button
              onClick={() => {
                setSelectedCustomer(null)
                setCustomerSearch('')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary"
            >
              <X size={16} />
            </button>
          )}

          {showCustomerSelect && !selectedCustomer && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg max-h-48 overflow-auto z-10">
              {filteredCustomers.length === 0 ? (
                <div className="p-3 text-sm text-fg-tertiary">
                  거래처를 찾을 수 없습니다.
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setCustomerSearch('')
                      setShowCustomerSelect(false)
                    }}
                    className="w-full p-3 text-left hover:bg-bg-hover transition-colors"
                  >
                    <p className="font-medium text-fg-primary">{customer.name}</p>
                    {customer.balance > 0 && (
                      <p className="text-xs text-warning">
                        외상 ₩{customer.balance.toLocaleString()}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 장바구니 아이템 */}
      <div className="flex-1 overflow-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center py-8 text-fg-tertiary">
            <p>상품을 선택해주세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg ${item.backorderQty > 0 ? 'bg-warning/10 border border-warning/30' : 'bg-bg-tertiary'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-fg-primary text-sm truncate">
                    {item.product_name}
                  </p>
                  {item.color && item.size && (
                    <p className="text-xs text-fg-tertiary">
                      {item.color} / {item.size}
                    </p>
                  )}
                  <p className="text-xs text-fg-secondary mt-1">
                    ₩{item.unit_price.toLocaleString()} × {item.quantity}
                  </p>
                  {item.backorderQty > 0 && (
                    <p className="text-xs text-warning mt-1">
                      재고 {item.stock}개 / 미송 {item.backorderQty}개
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-bg-hover text-fg-secondary hover:text-fg-primary flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-bg-hover text-fg-secondary hover:text-fg-primary flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <p className="font-mono font-semibold text-sm w-16 text-right">
                  ₩{(item.quantity * item.unit_price).toLocaleString()}
                </p>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 text-fg-tertiary hover:text-danger"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 결제 정보 */}
      <div className="border-t border-border-subtle p-4 space-y-3 bg-bg-secondary">
        {/* 할인 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-secondary">할인</span>
          <div className="relative w-28">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary text-sm">₩</span>
            <input
              type="number"
              className="input pl-7 text-right text-sm py-1.5"
              value={discount || ''}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* 합계 */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-fg-primary">합계</span>
          <span className="font-mono font-bold text-xl text-fg-primary">
            ₩{finalAmount.toLocaleString()}
          </span>
        </div>

        {/* 결제 방법 */}
        <div className="flex gap-2">
          {(['cash', 'card', 'transfer'] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`flex-1 py-2.5 text-sm rounded-lg border transition-colors ${
                paymentMethod === method
                  ? 'bg-bg-hover border-border-secondary text-fg-primary'
                  : 'bg-bg-tertiary border-border-subtle text-fg-tertiary hover:text-fg-secondary'
              }`}
            >
              {{ cash: '현금', card: '카드', transfer: '이체', credit: '외상', mixed: '복합' }[method]}
            </button>
          ))}
        </div>

        {/* 받은 금액 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary">₩</span>
            <input
              type="number"
              className="input pl-8 text-right"
              placeholder="받은 금액"
              value={receivedAmount || ''}
              onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
            />
          </div>
          <button
            onClick={setFullPayment}
            className="btn btn-ghost px-4"
          >
            전액
          </button>
        </div>

        {/* 거스름돈 / 외상 */}
        {(changeAmount > 0 || creditAmount > 0) && (
          <div className="flex items-center justify-between text-sm">
            {changeAmount > 0 ? (
              <>
                <span className="text-fg-secondary">거스름돈</span>
                <span className="font-mono text-success">
                  ₩{changeAmount.toLocaleString()}
                </span>
              </>
            ) : creditAmount > 0 ? (
              <>
                <span className="text-fg-secondary">외상</span>
                <span className="font-mono text-warning">
                  ₩{creditAmount.toLocaleString()}
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* 미송 경고 */}
        {hasBackorders && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm text-warning font-medium">
              재고 부족: 미송 {totalBackorderQty}개
            </p>
            <p className="text-xs text-fg-tertiary mt-1">
              미송 처리를 위해 거래처 선택이 필요합니다.
            </p>
          </div>
        )}

        {/* 완료 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || createSale.isPending || createBackorder.isPending}
          className="btn btn-primary w-full py-3.5 text-base font-semibold"
        >
          {createSale.isPending || createBackorder.isPending
            ? '처리 중...'
            : hasBackorders
              ? `판매 완료 (미송 ${totalBackorderQty}개)`
              : '판매 완료'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex h-[calc(100vh-7rem)] gap-4 animate-fade-in">
        {/* Left: 상품 선택 */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <input
              type="text"
              className="input"
              placeholder="상품명 또는 품번으로 검색..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={addToCart}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-fg-tertiary">
                {productSearch ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
              </div>
            )}
          </div>
        </div>

        {/* Right: 장바구니 & 결제 */}
        <div className="w-96 glass-card overflow-hidden">
          <CartContent />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden animate-fade-in">
        {/* 상품 검색 */}
        <div className="mb-4">
          <input
            type="text"
            className="input"
            placeholder="상품명 또는 품번으로 검색..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>

        {/* 상품 그리드 */}
        <div className="grid grid-cols-2 gap-3 pb-24">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={addToCart}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-fg-tertiary">
            {productSearch ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
          </div>
        )}

        {/* 플로팅 장바구니 버튼 */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-point hover:bg-point-hover text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 z-40"
        >
          <ShoppingCart size={24} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </button>

        {/* 장바구니 바텀시트 */}
        <BottomSheet
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          title={`장바구니 (${cartItemCount}개)`}
        >
          <CartContent />
        </BottomSheet>
      </div>
    </>
  )
}

// Product Card
interface ProductCardProps {
  product: ProductWithVariants
  onSelect: (product: ProductWithVariants, variant?: { id: string; color: string; size: string; stock: number }) => void
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  const [showVariants, setShowVariants] = useState(false)
  const hasVariants = product.variants && product.variants.length > 0

  const handleClick = () => {
    if (hasVariants) {
      setShowVariants(!showVariants)
    } else {
      onSelect(product)
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={handleClick}
        className="w-full p-3 text-left hover:bg-bg-hover active:bg-bg-hover transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {product.code && (
              <span className="text-xs text-fg-tertiary">{product.code}</span>
            )}
            <p className="font-medium text-fg-primary text-sm truncate">{product.name}</p>
          </div>
          <p className="font-mono text-fg-primary text-sm ml-2">
            ₩{product.sale_price.toLocaleString()}
          </p>
        </div>
      </button>

      {/* Variants */}
      {showVariants && hasVariants && (
        <div className="border-t border-border-subtle p-2 bg-bg-tertiary/50">
          <div className="flex flex-wrap gap-1">
            {product.variants?.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  onSelect(product, v)
                  setShowVariants(false)
                }}
                disabled={v.stock <= 0}
                className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  v.stock <= 0
                    ? 'bg-bg-tertiary border-border-subtle text-fg-muted cursor-not-allowed'
                    : 'bg-bg-secondary border-border-subtle text-fg-secondary hover:border-border-secondary hover:text-fg-primary active:bg-bg-hover'
                }`}
              >
                {v.color}/{v.size}
                <span className={`ml-1 ${v.stock <= 5 ? 'text-warning' : ''}`}>
                  ({v.stock})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
