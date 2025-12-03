import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'

export default function CustomerFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(id)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    address: '',
    email: '',
    memo: '',
  })

  const [error, setError] = useState('')

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        contact_name: customer.contact_name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        email: customer.email || '',
        memo: customer.memo || '',
      })
    }
  }, [customer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('업체명을 입력해주세요.')
      return
    }

    try {
      if (isEdit && id) {
        await updateCustomer.mutateAsync({ id, ...formData })
      } else {
        await createCustomer.mutateAsync(formData)
      }
      navigate('/customers')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (isEdit && isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-point border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-fg-primary mb-6">
        {isEdit ? '거래처 수정' : '거래처 등록'}
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

          <div>
            <label className="data-label block mb-1.5">업체명 *</label>
            <input
              type="text"
              name="name"
              className="input"
              placeholder="예: ABC 패션"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="data-label block mb-1.5">담당자명</label>
              <input
                type="text"
                name="contact_name"
                className="input"
                placeholder="예: 김철수"
                value={formData.contact_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="data-label block mb-1.5">연락처</label>
              <input
                type="tel"
                name="phone"
                className="input"
                placeholder="예: 010-1234-5678"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-fg-primary">추가 정보</h2>

          <div>
            <label className="data-label block mb-1.5">주소</label>
            <input
              type="text"
              name="address"
              className="input"
              placeholder="예: 서울시 중구 동대문..."
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="data-label block mb-1.5">이메일</label>
            <input
              type="email"
              name="email"
              className="input"
              placeholder="예: contact@abc.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* 메모 */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-fg-primary">메모</h2>
          <textarea
            name="memo"
            className="input min-h-[100px] resize-none"
            placeholder="거래처에 대한 메모..."
            value={formData.memo}
            onChange={handleChange}
          />
        </div>

        {/* 외상 정보 (수정 모드에서만 표시) */}
        {isEdit && customer && customer.balance > 0 && (
          <div className="glass-card p-5">
            <h2 className="font-semibold text-fg-primary mb-3">외상 정보</h2>
            <div className="flex items-center justify-between">
              <span className="text-fg-secondary">현재 외상 잔액</span>
              <span className="font-mono font-bold text-xl text-warning">
                ₩{customer.balance.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-fg-tertiary mt-2">
              * 외상 잔액은 판매/입금 시 자동으로 변경됩니다.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="btn btn-ghost flex-1"
          >
            취소
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={createCustomer.isPending || updateCustomer.isPending}
          >
            {createCustomer.isPending || updateCustomer.isPending
              ? '저장 중...'
              : isEdit ? '수정하기' : '등록하기'
            }
          </button>
        </div>
      </form>
    </div>
  )
}
