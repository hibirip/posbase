import { useState, useMemo } from 'react'
import { X, Camera, Search } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { useCreateSample } from '@/hooks/useSamples'
import type { ProductWithVariants, Customer, ProductVariant } from '@/types/database.types'

interface SampleLendModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedCustomer?: Customer
}

export default function SampleLendModal({ isOpen, onClose, preselectedCustomer }: SampleLendModalProps) {
  const { data: products } = useProducts()
  const { data: customers } = useCustomers()
  const createSample = useCreateSample()

  // 선택된 항목
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer || null)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [returnDue, setReturnDue] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7) // 기본 7일 후
    return date.toISOString().split('T')[0]
  })
  const [deductStock, setDeductStock] = useState(false)
  const [memo, setMemo] = useState('')

  // 검색
  const [productSearch, setProductSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSelect, setShowCustomerSelect] = useState(false)

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

  // 상품 선택
  const handleSelectProduct = (product: ProductWithVariants) => {
    setSelectedProduct(product)
    setSelectedVariant(null)
    setProductSearch('')
  }

  // 옵션 선택
  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant)
  }

  // 초기화
  const resetForm = () => {
    setSelectedCustomer(preselectedCustomer || null)
    setSelectedProduct(null)
    setSelectedVariant(null)
    setQuantity(1)
    const date = new Date()
    date.setDate(date.getDate() + 7)
    setReturnDue(date.toISOString().split('T')[0])
    setDeductStock(false)
    setMemo('')
    setProductSearch('')
    setCustomerSearch('')
    setShowCustomerSelect(false)
  }

  // 제출
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      alert('거래처를 선택해주세요.')
      return
    }

    if (!selectedProduct || !selectedVariant) {
      alert('상품과 옵션을 선택해주세요.')
      return
    }

    if (quantity <= 0) {
      alert('수량을 입력해주세요.')
      return
    }

    if (!returnDue) {
      alert('반납 예정일을 선택해주세요.')
      return
    }

    try {
      await createSample.mutateAsync({
        customer_id: selectedCustomer.id,
        variant_id: selectedVariant.id,
        product_name: selectedProduct.name,
        color: selectedVariant.color,
        size: selectedVariant.size,
        quantity,
        return_due: returnDue,
        deduct_stock: deductStock,
        memo: memo || undefined,
      })

      alert('샘플 대여가 등록되었습니다.')
      resetForm()
      onClose()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border-subtle rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Camera size={20} strokeWidth={1.5} className="text-fg-secondary" />
            <h2 className="text-lg font-semibold text-fg-primary">샘플 대여</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg-secondary rounded-md hover:bg-bg-hover transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* 거래처 선택 */}
          <div>
            <label className="text-sm font-medium text-fg-primary">거래처 *</label>
            {selectedCustomer ? (
              <div className="mt-1 flex items-center justify-between bg-bg-tertiary rounded-md p-2">
                <span className="text-fg-primary">{selectedCustomer.name}</span>
                <button
                  onClick={() => {
                    setSelectedCustomer(null)
                    setShowCustomerSelect(true)
                  }}
                  className="text-xs text-fg-tertiary hover:text-fg-secondary"
                >
                  변경
                </button>
              </div>
            ) : (
              <div className="mt-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  type="text"
                  placeholder="거래처 검색..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerSelect(true)
                  }}
                  onFocus={() => setShowCustomerSelect(true)}
                  className="input pl-9"
                />
                {showCustomerSelect && (
                  <div className="absolute z-10 w-full mt-1 bg-bg-secondary border border-border-subtle rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <p className="p-3 text-sm text-fg-tertiary">검색 결과 없음</p>
                    ) : (
                      filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setShowCustomerSelect(false)
                            setCustomerSearch('')
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-bg-hover text-sm"
                        >
                          <p className="text-fg-primary">{customer.name}</p>
                          {customer.contact_name && (
                            <p className="text-xs text-fg-tertiary">{customer.contact_name}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 상품 선택 */}
          <div>
            <label className="text-sm font-medium text-fg-primary">상품 *</label>
            {selectedProduct ? (
              <div className="mt-1">
                <div className="flex items-center justify-between bg-bg-tertiary rounded-md p-2 mb-2">
                  <span className="text-fg-primary">{selectedProduct.name}</span>
                  <button
                    onClick={() => {
                      setSelectedProduct(null)
                      setSelectedVariant(null)
                    }}
                    className="text-xs text-fg-tertiary hover:text-fg-secondary"
                  >
                    변경
                  </button>
                </div>

                {/* 옵션 선택 */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {selectedProduct.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => handleSelectVariant(variant)}
                        className={`p-2 text-sm rounded border transition-colors ${
                          selectedVariant?.id === variant.id
                            ? 'border-point bg-point/10 text-fg-primary'
                            : 'border-border-subtle bg-bg-tertiary text-fg-secondary hover:border-border-secondary'
                        }`}
                      >
                        <span>{variant.color}/{variant.size}</span>
                        <span className="ml-1 text-xs text-fg-tertiary">(재고: {variant.stock})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  type="text"
                  placeholder="상품 검색..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="input pl-9"
                />
                {productSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-bg-secondary border border-border-subtle rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-sm text-fg-tertiary">검색 결과 없음</p>
                    ) : (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="w-full text-left px-3 py-2 hover:bg-bg-hover text-sm"
                        >
                          <p className="text-fg-primary">{product.name}</p>
                          {product.code && (
                            <p className="text-xs text-fg-tertiary">{product.code}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 수량 */}
          <div>
            <label className="text-sm font-medium text-fg-primary">수량 *</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="input mt-1"
            />
          </div>

          {/* 반납 예정일 */}
          <div>
            <label className="text-sm font-medium text-fg-primary">반납 예정일 *</label>
            <input
              type="date"
              value={returnDue}
              onChange={(e) => setReturnDue(e.target.value)}
              className="input mt-1"
            />
          </div>

          {/* 재고 차감 옵션 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deductStock"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              className="w-4 h-4 accent-point"
            />
            <label htmlFor="deductStock" className="text-sm text-fg-secondary">
              재고에서 차감 (반납 시 복원됨)
            </label>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-sm font-medium text-fg-primary">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="촬영 목적, 연락처 등 (선택)"
              className="input mt-1 h-20 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-bg-tertiary/50">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 btn btn-ghost"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCustomer || !selectedVariant || createSample.isPending}
              className="flex-1 btn btn-primary"
            >
              {createSample.isPending ? '처리 중...' : '대여 등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
