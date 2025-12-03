import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationCounts } from '@/hooks/useNotifications'
import BottomNav from '@/components/BottomNav'
import {
  Home,
  ShoppingCart,
  Package,
  Boxes,
  Building2,
  Wallet,
  Truck,
  RotateCcw,
  Camera,
  BarChart3,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '홈', icon: Home },
  { path: '/sales', label: '판매', icon: ShoppingCart },
  { path: '/products', label: '상품', icon: Package },
  { path: '/inventory', label: '재고', icon: Boxes },
  { path: '/customers', label: '거래처', icon: Building2 },
  { path: '/payments', label: '입금', icon: Wallet },
  { path: '/backorders', label: '미송', icon: Truck },
  { path: '/returns', label: '반품', icon: RotateCcw },
  { path: '/samples', label: '샘플', icon: Camera },
  { path: '/stats', label: '통계', icon: BarChart3 },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { data: notificationCounts } = useNotificationCounts()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar - Desktop Only */}
      <aside
        className={`fixed left-0 top-0 h-full bg-bg-secondary border-r border-border-subtle z-40 transition-all duration-300 hidden md:block ${
          isSidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-border-subtle">
          {isSidebarOpen && (
            <Link to="/" className="text-lg font-bold text-fg-primary">
              POS<span className="text-point">BASE</span>
            </Link>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-fg-muted hover:text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={16} strokeWidth={1.5} /> : <ChevronRight size={16} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-1.5 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-bg-hover text-fg-primary'
                    : 'text-fg-tertiary hover:bg-bg-hover hover:text-fg-secondary'
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.5} />
              {isSidebarOpen && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 border-t border-border-subtle">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-bg-tertiary flex items-center justify-center text-fg-secondary text-sm font-medium">
                {profile?.shop_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg-primary truncate">
                  {profile?.shop_name || '매장'}
                </p>
                <p className="text-xs text-fg-muted truncate">
                  {profile?.owner_name || '미설정'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-fg-muted hover:text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
                title="로그아웃"
              >
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full p-2 text-fg-muted hover:text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
              title="로그아웃"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'md:ml-60' : 'md:ml-16'
        }`}
      >
        {/* Header - Mobile */}
        <header className="h-12 bg-bg-secondary/95 backdrop-blur-lg border-b border-border-subtle sticky top-0 z-30 md:hidden">
          <div className="h-full px-3 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold text-fg-primary">
              POS<span className="text-point">BASE</span>
            </Link>

            <Link
              to="/notifications"
              className="relative p-2 text-fg-muted hover:text-fg-secondary rounded-md transition-colors"
            >
              <Bell size={20} strokeWidth={1.5} />
              {(notificationCounts?.total_count || 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
              )}
            </Link>
          </div>
        </header>

        {/* Header - Desktop */}
        <header className="h-12 bg-bg-secondary/80 backdrop-blur-sm border-b border-border-subtle sticky top-0 z-30 hidden md:block">
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 빈 공간 또는 브레드크럼 */}
            </div>

            <div className="flex items-center gap-3">
              {/* 알림 벨 아이콘 */}
              <Link
                to="/notifications"
                className="relative p-2 text-fg-muted hover:text-fg-secondary hover:bg-bg-hover rounded-md transition-colors"
                title="알림"
              >
                <Bell size={18} strokeWidth={1.5} />
                {(notificationCounts?.total_count || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-danger text-white text-xs font-bold rounded-full">
                    {(notificationCounts?.total_count || 0) > 99 ? '99+' : notificationCounts?.total_count}
                  </span>
                )}
              </Link>

              {/* 오늘 날짜 */}
              <div className="text-sm text-fg-secondary">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 md:p-4 pb-20 md:pb-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  )
}
