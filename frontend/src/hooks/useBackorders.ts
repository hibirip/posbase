import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BackorderWithDetails, BackorderStatus } from '@/types/database.types'

// 미송 목록 조회
export function useBackorders(options?: {
  status?: BackorderStatus
  customerId?: string
}) {
  return useQuery({
    queryKey: ['backorders', options],
    queryFn: async () => {
      let query = supabase
        .from('backorders')
        .select(`
          *,
          customer:customers(id, name, phone),
          sale:sales(id, sale_number),
          variant:product_variants(id, stock)
        `)
        .order('created_at', { ascending: false })

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as BackorderWithDetails[]
    },
  })
}

// 대기중인 미송 조회
export function usePendingBackorders() {
  return useBackorders({ status: 'pending' })
}

// 미송 통계
export function useBackorderStats() {
  return useQuery({
    queryKey: ['backorders', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backorders')
        .select('id, quantity, status, customer_id')
        .eq('status', 'pending')

      if (error) throw error

      const pendingCount = data.length
      const totalQuantity = data.reduce((sum, b) => sum + b.quantity, 0)
      const uniqueCustomers = new Set(data.map(b => b.customer_id)).size

      return {
        pendingCount,
        totalQuantity,
        uniqueCustomers,
      }
    },
  })
}

// 미송 생성
export interface CreateBackorderInput {
  sale_id: string
  sale_item_id: string
  customer_id: string
  variant_id: string
  product_name: string
  color?: string
  size?: string
  quantity: number
  memo?: string
}

export function useCreateBackorder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateBackorderInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('backorders')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backorders'] })
    },
  })
}

// 미송 완료 처리 (재고 차감 포함)
export function useCompleteBackorder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 미송 정보 조회
      const { data: backorder, error: fetchError } = await supabase
        .from('backorders')
        .select('*, variant:product_variants(id, stock)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (backorder.status !== 'pending') throw new Error('이미 처리된 미송입니다.')

      // 재고 확인
      const currentStock = backorder.variant?.stock || 0
      if (currentStock < backorder.quantity) {
        throw new Error(`재고가 부족합니다. (현재 재고: ${currentStock}, 필요: ${backorder.quantity})`)
      }

      // 재고 차감
      const { error: stockError } = await supabase
        .from('product_variants')
        .update({ stock: currentStock - backorder.quantity })
        .eq('id', backorder.variant_id)

      if (stockError) throw stockError

      // 재고 로그 기록
      await supabase.from('stock_logs').insert({
        user_id: user.id,
        variant_id: backorder.variant_id,
        change_type: 'sale',
        quantity: -backorder.quantity,
        before_stock: currentStock,
        after_stock: currentStock - backorder.quantity,
        reference_id: backorder.sale_id,
        memo: '미송 출고',
      })

      // 미송 완료 처리
      const { error: updateError } = await supabase
        .from('backorders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backorders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 미송 취소
export function useCancelBackorder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: backorder, error: fetchError } = await supabase
        .from('backorders')
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (backorder.status !== 'pending') throw new Error('이미 처리된 미송입니다.')

      const { error } = await supabase
        .from('backorders')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backorders'] })
    },
  })
}
