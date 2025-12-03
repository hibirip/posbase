import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationCounts } from '@/hooks/useNotifications'
import {
  Wallet,
  Truck,
  RotateCcw,
  BarChart3,
  Bell,
  LogOut,
  ChevronRight,
} from 'lucide-react'

const menuItems = [
  { path: '/payments', label: '입금 관리', icon: Wallet, description: '입금 내역 및 등록' },
  { path: '/backorders', label: '미송 관리', icon: Truck, description: '미송 상품 처리' },
  { path: '/returns', label: '반품 관리', icon: RotateCcw, description: '반품 처리 및 이력' },
  { path: '/stats', label: '통계', icon: BarChart3, description: '매출 및 분석' },
  { path: '/notifications', label: '알림', icon: Bell, description: '알림 확인' },
]

export default function MorePage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { data: notificationCounts } = useNotificationCounts()

  const handleSignOut = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut()
      navigate('/login')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* User Profile Card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-bg-tertiary flex items-center justify-center text-fg-secondary text-xl font-bold">
            {profile?.shop_name?.charAt(0) || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-fg-primary truncate">
              {profile?.shop_name || 'POSBASE'}
            </h2>
            <p className="text-sm text-fg-secondary truncate">
              {profile?.owner_name || '사용자'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="glass-card divide-y divide-border-subtle overflow-hidden">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-4 p-4 hover:bg-bg-hover active:bg-bg-hover transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center">
              <item.icon size={20} strokeWidth={1.5} className="text-fg-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-fg-primary">{item.label}</span>
                {item.path === '/notifications' && (notificationCounts?.total_count || 0) > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-danger text-white rounded-full">
                    {notificationCounts?.total_count}
                  </span>
                )}
              </div>
              <p className="text-sm text-fg-tertiary">{item.description}</p>
            </div>
            <ChevronRight size={18} className="text-fg-muted" />
          </Link>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleSignOut}
        className="w-full glass-card p-4 flex items-center gap-4 hover:bg-bg-hover active:bg-bg-hover transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
          <LogOut size={20} strokeWidth={1.5} className="text-danger" />
        </div>
        <span className="font-medium text-danger">로그아웃</span>
      </button>
    </div>
  )
}
