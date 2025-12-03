import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  NotificationType,
  NotificationCounts,
  Notification,
  OverdueCreditNotification,
  LongPendingBackorderNotification,
  LowStockNotification,
  OutOfStockNotification,
  OverdueSampleNotification,
} from '@/types/database.types'

// 알림 카운트 조회
export function useNotificationCounts() {
  return useQuery({
    queryKey: ['notifications', 'counts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('get_notification_counts', {
        p_user_id: user.id,
      })

      if (error) throw error
      return (data?.[0] || {
        overdue_credit_count: 0,
        long_pending_backorder_count: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        overdue_sample_count: 0,
        total_count: 0,
      }) as NotificationCounts
    },
    refetchInterval: 5 * 60 * 1000, // 5분마다 갱신
  })
}

// 연체 미수금 조회
export function useOverdueCreditNotifications() {
  return useQuery({
    queryKey: ['notifications', 'overdue_credit'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('get_overdue_credit_customers', {
        p_user_id: user.id,
      })

      if (error) throw error

      // 해제된 알림 필터링
      const { data: dismissals } = await supabase
        .from('notification_dismissals')
        .select('reference_id')
        .eq('user_id', user.id)
        .eq('notification_type', 'overdue_credit')

      const dismissedIds = new Set(dismissals?.map(d => d.reference_id) || [])

      return (data as OverdueCreditNotification[]).filter(
        item => !dismissedIds.has(item.customer_id)
      )
    },
  })
}

// 장기 대기 미송 조회
export function useLongPendingBackorderNotifications() {
  return useQuery({
    queryKey: ['notifications', 'long_pending_backorder'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('get_long_pending_backorders', {
        p_user_id: user.id,
      })

      if (error) throw error

      // 해제된 알림 필터링
      const { data: dismissals } = await supabase
        .from('notification_dismissals')
        .select('reference_id')
        .eq('user_id', user.id)
        .eq('notification_type', 'long_pending_backorder')

      const dismissedIds = new Set(dismissals?.map(d => d.reference_id) || [])

      return (data as LongPendingBackorderNotification[]).filter(
        item => !dismissedIds.has(item.backorder_id)
      )
    },
  })
}

// 재고 부족 조회
export function useLowStockNotifications() {
  return useQuery({
    queryKey: ['notifications', 'low_stock'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('get_low_stock_variants', {
        p_user_id: user.id,
      })

      if (error) throw error

      // 해제된 알림 필터링
      const { data: dismissals } = await supabase
        .from('notification_dismissals')
        .select('reference_id')
        .eq('user_id', user.id)
        .eq('notification_type', 'low_stock')

      const dismissedIds = new Set(dismissals?.map(d => d.reference_id) || [])

      return (data as LowStockNotification[]).filter(
        item => !dismissedIds.has(item.variant_id)
      )
    },
  })
}

// 품절 조회
export function useOutOfStockNotifications() {
  return useQuery({
    queryKey: ['notifications', 'out_of_stock'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('get_out_of_stock_variants', {
        p_user_id: user.id,
      })

      if (error) throw error

      // 해제된 알림 필터링
      const { data: dismissals } = await supabase
        .from('notification_dismissals')
        .select('reference_id')
        .eq('user_id', user.id)
        .eq('notification_type', 'out_of_stock')

      const dismissedIds = new Set(dismissals?.map(d => d.reference_id) || [])

      return (data as OutOfStockNotification[]).filter(
        item => !dismissedIds.has(item.variant_id)
      )
    },
  })
}

// 연체 샘플 조회
export function useOverdueSampleNotifications() {
  return useQuery({
    queryKey: ['notifications', 'overdue_sample'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('get_overdue_samples', {
        p_user_id: user.id,
      })

      if (error) throw error

      // 해제된 알림 필터링
      const { data: dismissals } = await supabase
        .from('notification_dismissals')
        .select('reference_id')
        .eq('user_id', user.id)
        .eq('notification_type', 'overdue_sample')

      const dismissedIds = new Set(dismissals?.map(d => d.reference_id) || [])

      return (data as OverdueSampleNotification[]).filter(
        item => !dismissedIds.has(item.sample_id)
      )
    },
  })
}

// 모든 알림 통합 조회
export function useAllNotifications() {
  const { data: overdueCredit, isLoading: loadingOverdue } = useOverdueCreditNotifications()
  const { data: backorders, isLoading: loadingBackorders } = useLongPendingBackorderNotifications()
  const { data: lowStock, isLoading: loadingLowStock } = useLowStockNotifications()
  const { data: outOfStock, isLoading: loadingOutOfStock } = useOutOfStockNotifications()
  const { data: overdueSamples, isLoading: loadingOverdueSamples } = useOverdueSampleNotifications()

  const isLoading = loadingOverdue || loadingBackorders || loadingLowStock || loadingOutOfStock || loadingOverdueSamples

  const notifications: Notification[] = []

  // 연체 미수금 알림
  overdueCredit?.forEach(item => {
    notifications.push({
      id: item.customer_id,
      type: 'overdue_credit',
      title: '미수금 연체',
      message: `${item.customer_name}님의 미수금 ₩${item.balance.toLocaleString()}이 ${item.days_overdue}일 경과했습니다.`,
      link: `/customers/${item.customer_id}`,
      data: item,
    })
  })

  // 장기 대기 미송 알림
  backorders?.forEach(item => {
    notifications.push({
      id: item.backorder_id,
      type: 'long_pending_backorder',
      title: '미송 장기 대기',
      message: `${item.customer_name}님의 ${item.product_name} 미송이 ${item.days_pending}일 경과했습니다.`,
      link: '/backorders',
      data: item,
    })
  })

  // 재고 부족 알림
  lowStock?.forEach(item => {
    notifications.push({
      id: item.variant_id,
      type: 'low_stock',
      title: '재고 부족',
      message: `${item.product_name} (${item.color}/${item.size}) 재고가 ${item.stock}개 남았습니다.`,
      link: `/products/${item.product_id}`,
      data: item,
    })
  })

  // 품절 알림
  outOfStock?.forEach(item => {
    notifications.push({
      id: item.variant_id,
      type: 'out_of_stock',
      title: '품절',
      message: `${item.product_name} (${item.color}/${item.size}) 재고가 소진되었습니다.`,
      link: `/products/${item.product_id}`,
      data: item,
    })
  })

  // 연체 샘플 알림
  overdueSamples?.forEach(item => {
    notifications.push({
      id: item.sample_id,
      type: 'overdue_sample',
      title: '샘플 연체',
      message: `${item.customer_name}님의 ${item.product_name} 샘플이 ${item.days_overdue}일 연체되었습니다.`,
      link: '/samples',
      data: item,
    })
  })

  return {
    data: notifications,
    isLoading,
  }
}

// 알림 해제 (읽음 처리)
export function useDismissNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      type,
      referenceId,
    }: {
      type: NotificationType
      referenceId: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('notification_dismissals')
        .upsert({
          user_id: user.id,
          notification_type: type,
          reference_id: referenceId,
        }, {
          onConflict: 'user_id,notification_type,reference_id',
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// 모든 알림 해제
export function useDismissAllNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notifications: Notification[]) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const dismissals = notifications.map(n => ({
        user_id: user.id,
        notification_type: n.type,
        reference_id: n.id,
      }))

      const { error } = await supabase
        .from('notification_dismissals')
        .upsert(dismissals, {
          onConflict: 'user_id,notification_type,reference_id',
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// 해제된 알림 정리 (조건이 해소된 것)
export function useCleanupDismissals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('cleanup_resolved_dismissals', {
        p_user_id: user.id,
      })

      if (error) throw error
      return data as number
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
