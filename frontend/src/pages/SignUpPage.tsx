import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp, isLoading } = useAuthStore()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    shopName: '',
    ownerName: '',
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.email || !formData.password || !formData.shopName) {
      setError('필수 항목을 모두 입력해주세요.')
      return
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.shopName,
      formData.ownerName || undefined
    )

    if (error) {
      if (error.message.includes('already registered')) {
        setError('이미 등록된 이메일입니다.')
      } else {
        setError(error.message)
      }
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="glass-card p-8 w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fg-primary">POS<span className="text-point">BASE</span></h1>
          <p className="text-fg-secondary mt-2">새 계정 만들기</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          {/* 매장 정보 */}
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-subtle">
            <h3 className="text-sm font-semibold text-fg-primary mb-3">매장 정보</h3>

            <div className="space-y-3">
              <div>
                <label className="data-label block mb-1.5">매장명 *</label>
                <input
                  type="text"
                  name="shopName"
                  className="input"
                  placeholder="예: 동대문 패션"
                  value={formData.shopName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="data-label block mb-1.5">대표자명</label>
                <input
                  type="text"
                  name="ownerName"
                  className="input"
                  placeholder="예: 홍길동"
                  value={formData.ownerName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* 계정 정보 */}
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border-subtle">
            <h3 className="text-sm font-semibold text-fg-primary mb-3">계정 정보</h3>

            <div className="space-y-3">
              <div>
                <label className="data-label block mb-1.5">이메일 *</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="data-label block mb-1.5">비밀번호 *</label>
                <input
                  type="password"
                  name="password"
                  className="input"
                  placeholder="6자 이상"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="data-label block mb-1.5">비밀번호 확인 *</label>
                <input
                  type="password"
                  name="passwordConfirm"
                  className="input"
                  placeholder="비밀번호 재입력"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-fg-secondary">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-point hover:underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
