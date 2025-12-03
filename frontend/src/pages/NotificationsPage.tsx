import { Link } from 'react-router-dom'
import {
  useAllNotifications,
  useNotificationCounts,
  useDismissNotification,
  useDismissAllNotifications,
} from '@/hooks/useNotifications'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Package,
  X,
  CheckCheck,
  ExternalLink,
} from 'lucide-react'
import type { NotificationType, Notification } from '@/types/database.types'

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useAllNotifications()
  const { data: counts } = useNotificationCounts()
  const dismissNotification = useDismissNotification()
  const dismissAllNotifications = useDismissAllNotifications()

  const handleDismiss = (type: NotificationType, referenceId: string) => {
    dismissNotification.mutate({ type, referenceId })
  }

  const handleDismissAll = () => {
    if (notifications && notifications.length > 0) {
      if (confirm('모든 알림을 읽음 처리하시겠습니까?')) {
        dismissAllNotifications.mutate(notifications)
      }
    }
  }

  // 알림 타입별 그룹화
  const groupedNotifications = {
    overdue_credit: notifications?.filter(n => n.type === 'overdue_credit') || [],
    long_pending_backorder: notifications?.filter(n => n.type === 'long_pending_backorder') || [],
    out_of_stock: notifications?.filter(n => n.type === 'out_of_stock') || [],
    low_stock: notifications?.filter(n => n.type === 'low_stock') || [],
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">알림</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">
            {counts?.total_count || 0}개의 알림이 있습니다
          </p>
        </div>
        {(notifications?.length || 0) > 0 && (
          <button
            onClick={handleDismissAll}
            disabled={dismissAllNotifications.isPending}
            className="btn btn-ghost flex items-center gap-2"
          >
            <CheckCheck size={16} strokeWidth={1.5} />
            모두 읽음
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} strokeWidth={1.5} className="text-warning" />
            <p className="data-label">미수금 연체</p>
          </div>
          <p className="data-value data-value-lg text-warning">
            {counts?.overdue_credit_count || 0}건
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} strokeWidth={1.5} className="text-point" />
            <p className="data-label">미송 장기 대기</p>
          </div>
          <p className="data-value data-value-lg text-point">
            {counts?.long_pending_backorder_count || 0}건
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} strokeWidth={1.5} className="text-danger" />
            <p className="data-label">품절</p>
          </div>
          <p className="data-value data-value-lg text-danger">
            {counts?.out_of_stock_count || 0}건
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} strokeWidth={1.5} className="text-fg-secondary" />
            <p className="data-label">재고 부족</p>
          </div>
          <p className="data-value data-value-lg">
            {counts?.low_stock_count || 0}건
          </p>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4">
              <div className="skeleton skeleton-text w-1/4 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : (notifications?.length || 0) === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell size={48} strokeWidth={1} className="mx-auto text-fg-tertiary mb-4" />
          <p className="text-fg-tertiary text-lg">알림이 없습니다</p>
          <p className="text-fg-muted text-sm mt-1">모든 상황이 정상입니다</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 미수금 연체 */}
          {groupedNotifications.overdue_credit.length > 0 && (
            <NotificationSection
              title="미수금 연체"
              icon={<AlertTriangle size={18} strokeWidth={1.5} className="text-warning" />}
              badgeClass="badge-warning"
              notifications={groupedNotifications.overdue_credit}
              onDismiss={handleDismiss}
            />
          )}

          {/* 미송 장기 대기 */}
          {groupedNotifications.long_pending_backorder.length > 0 && (
            <NotificationSection
              title="미송 장기 대기"
              icon={<AlertCircle size={18} strokeWidth={1.5} className="text-point" />}
              badgeClass="badge-point"
              notifications={groupedNotifications.long_pending_backorder}
              onDismiss={handleDismiss}
            />
          )}

          {/* 품절 */}
          {groupedNotifications.out_of_stock.length > 0 && (
            <NotificationSection
              title="품절"
              icon={<Package size={18} strokeWidth={1.5} className="text-danger" />}
              badgeClass="badge-danger"
              notifications={groupedNotifications.out_of_stock}
              onDismiss={handleDismiss}
            />
          )}

          {/* 재고 부족 */}
          {groupedNotifications.low_stock.length > 0 && (
            <NotificationSection
              title="재고 부족"
              icon={<Package size={18} strokeWidth={1.5} className="text-fg-secondary" />}
              badgeClass="badge-neutral"
              notifications={groupedNotifications.low_stock}
              onDismiss={handleDismiss}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Notification Section Component
interface NotificationSectionProps {
  title: string
  icon: React.ReactNode
  badgeClass: string
  notifications: Notification[]
  onDismiss: (type: NotificationType, referenceId: string) => void
}

function NotificationSection({
  title,
  icon,
  badgeClass,
  notifications,
  onDismiss,
}: NotificationSectionProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle bg-bg-tertiary/50 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-fg-primary">{title}</h3>
        <span className={`badge ${badgeClass} ml-auto`}>
          {notifications.length}건
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {notifications.map(notification => (
          <NotificationItem
            key={`${notification.type}-${notification.id}`}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  )
}

// Notification Item Component
interface NotificationItemProps {
  notification: Notification
  onDismiss: (type: NotificationType, referenceId: string) => void
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  return (
    <div className="p-4 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg-primary">{notification.message}</p>
          {notification.link && (
            <Link
              to={notification.link}
              className="inline-flex items-center gap-1 text-xs text-point hover:underline mt-2"
            >
              자세히 보기
              <ExternalLink size={12} strokeWidth={1.5} />
            </Link>
          )}
        </div>
        <button
          onClick={() => onDismiss(notification.type, notification.id)}
          className="p-1.5 text-fg-muted hover:text-fg-secondary hover:bg-bg-tertiary rounded-md transition-colors flex-shrink-0"
          title="읽음 처리"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
