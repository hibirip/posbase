import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  // 초기화 중이면 로딩 표시
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-point border-t-transparent rounded-full animate-spin" />
          <p className="text-fg-secondary text-sm">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인 안됐으면 로그인 페이지로
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
