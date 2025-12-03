import { NavLink } from 'react-router-dom'
import { useNotificationCounts } from '@/hooks/useNotifications'
import {
  Home,
  ShoppingCart,
  Package,
  Building2,
  MoreHorizontal,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '홈', icon: Home },
  { path: '/sales', label: '판매', icon: ShoppingCart },
  { path: '/products', label: '상품', icon: Package },
  { path: '/customers', label: '거래처', icon: Building2 },
  { path: '/more', label: '더보기', icon: MoreHorizontal },
]

export default function BottomNav() {
  const { data: notificationCounts } = useNotificationCounts()
  const hasNotifications = (notificationCounts?.total_count || 0) > 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur-lg border-t border-border-subtle z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                isActive
                  ? 'text-point'
                  : 'text-fg-tertiary active:text-fg-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon
                    size={22}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {/* 더보기 탭에 알림 배지 표시 */}
                  {item.path === '/more' && hasNotifications && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
