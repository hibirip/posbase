import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProduct, useCreateProduct, useUpdateProduct, useAddVariant, useDeleteVariant } from '@/hooks/useProducts'

interface VariantInput {
  id?: string
  color: string
  size: string
  stock: number
  isNew?: boolean
}

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: product, isLoading: isLoadingProduct } = useProduct(id)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const addVariant = useAddVariant()
  const deleteVariant = useDeleteVariant()

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    cost_price: 0,
    sale_price: 0,
    memo: '',
  })

  const [variants, setVariants] = useState<VariantInput[]>([
    { color: '', size: '', stock: 0, isNew: true }
  ])

  const [error, setError] = useState('')

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        code: product.code || '',
        category: product.category || '',
        cost_price: product.cost_price,
        sale_price: product.sale_price,
        memo: product.memo || '',
      })
      setVariants(
        product.variants?.map(v => ({
          id: v.id,
          color: v.color,
          size: v.size,
          stock: v.stock,
        })) || []
      )
    }
  }, [product])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') ? Number(value) || 0 : value,
    }))
  }

  const handleVariantChange = (index: number, field: string, value: string | number) => {
    setVariants(prev => prev.map((v, i) =>
      i === index ? { ...v, [field]: field === 'stock' ? Number(value) || 0 : value } : v
    ))
  }

  const addVariantRow = () => {
    setVariants(prev => [...prev, { color: '', size: '', stock: 0, isNew: true }])
  }

  const removeVariantRow = async (index: number) => {
    const variant = variants[index]
    if (variant.id && !variant.isNew) {
      // 기존 옵션 삭제
      await deleteVariant.mutateAsync(variant.id)
    }
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('상품명을 입력해주세요.')
      return
    }

    const validVariants = variants.filter(v => v.color && v.size)

    try {
      if (isEdit && id) {
        // 상품 수정
        await updateProduct.mutateAsync({
          id,
          ...formData,
        })

        // 새 옵션 추가
        for (const v of validVariants) {
          if (v.isNew && v.color && v.size) {
            await addVariant.mutateAsync({
              product_id: id,
              color: v.color,
              size: v.size,
              stock: v.stock,
            })
          }
        }
      } else {
        // 상품 생성
        await createProduct.mutateAsync({
          ...formData,
          variants: validVariants.map(v => ({
            color: v.color,
            size: v.size,
            stock: v.stock,
          })),
        })
      }

      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (isEdit && isLoadingProduct) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-point border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-fg-primary mb-6">
        {isEdit ? '상품 수정' : '상품 등록'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-fg-primary">기본 정보</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="data-label block mb-1.5">상품명 *</label>
              <input
                type="text"
                name="name"
                className="input"
                placeholder="예: 플리츠 스커트"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="data-label block mb-1.5">품번</label>
              <input
                type="text"
                name="code"
                className="input"
                placeholder="예: SK-001"
                value={formData.code}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="data-label block mb-1.5">카테고리</label>
              <input
                type="text"
                name="category"
                className="input"
                placeholder="예: 스커트"
                value={formData.category}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* 가격 */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-fg-primary">가격</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="data-label block mb-1.5">원가 (입고가)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary">₩</span>
                <input
                  type="number"
                  name="cost_price"
                  className="input pl-8"
                  placeholder="0"
                  value={formData.cost_price || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="data-label block mb-1.5">판매가 (도매가)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary">₩</span>
                <input
                  type="number"
                  name="sale_price"
                  className="input pl-8"
                  placeholder="0"
                  value={formData.sale_price || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {formData.sale_price > 0 && formData.cost_price > 0 && (
            <p className="text-sm text-fg-secondary">
              마진: ₩{(formData.sale_price - formData.cost_price).toLocaleString()}
              ({Math.round((formData.sale_price - formData.cost_price) / formData.cost_price * 100)}%)
            </p>
          )}
        </div>

        {/* 옵션 (칼라/사이즈) */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg-primary">옵션 (칼라/사이즈)</h2>
            <button
              type="button"
              onClick={addVariantRow}
              className="btn btn-ghost btn-sm"
            >
              + 옵션 추가
            </button>
          </div>

          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="칼라"
                  value={variant.color}
                  onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                />
                <input
                  type="text"
                  className="input w-24"
                  placeholder="사이즈"
                  value={variant.size}
                  onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                />
                <input
                  type="number"
                  className="input w-24"
                  placeholder="재고"
                  value={variant.stock || ''}
                  onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeVariantRow(index)}
                  className="btn btn-ghost btn-sm text-danger"
                  disabled={variants.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 메모 */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-fg-primary">메모</h2>
          <textarea
            name="memo"
            className="input min-h-[100px] resize-none"
            placeholder="상품에 대한 메모..."
            value={formData.memo}
            onChange={handleChange}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-ghost flex-1"
          >
            취소
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={createProduct.isPending || updateProduct.isPending}
          >
            {createProduct.isPending || updateProduct.isPending
              ? '저장 중...'
              : isEdit ? '수정하기' : '등록하기'
            }
          </button>
        </div>
      </form>
    </div>
  )
}
