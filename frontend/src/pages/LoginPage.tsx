import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isLoading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    const { error } = await signIn(email, password)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
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
          <p className="text-fg-secondary mt-2">동대문 의류 도매 POS</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="data-label block mb-2">이메일</label>
            <input
              type="email"
              className="input"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="data-label block mb-2">비밀번호</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center text-sm text-fg-secondary">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-point hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}
