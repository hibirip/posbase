import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ReturnWithDetails, ReturnStatus } from '@/types/database.types'

// 반품 목록 조회
export function useReturns(options?: {
  status?: ReturnStatus
  customerId?: string
  saleId?: string
}) {
  return useQuery({
    queryKey: ['returns', options],
    queryFn: async () => {
      let query = supabase
        .from('returns')
        .select(`
          *,
          customer:customers(id, name, phone),
          sale:sales(id, sale_number, sale_date),
          variant:product_variants(id, stock)
        `)
        .order('created_at', { ascending: false })

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      if (options?.saleId) {
        query = query.eq('sale_id', options.saleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ReturnWithDetails[]
    },
  })
}

// 특정 판매의 반품 내역 조회
export function useSaleReturns(saleId: string | undefined) {
  return useQuery({
    queryKey: ['returns', 'sale', saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          customer:customers(id, name, phone),
          variant:product_variants(id, stock)
        `)
        .eq('sale_id', saleId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ReturnWithDetails[]
    },
  })
}

// 대기중인 반품 조회
export function usePendingReturns() {
  return useReturns({ status: 'pending' })
}

// 반품 통계
export function useReturnStats() {
  return useQuery({
    queryKey: ['returns', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('id, quantity, refund_amount, status, return_date')

      if (error) throw error

      const pending = data.filter(r => r.status === 'pending')
      const completed = data.filter(r => r.status === 'completed')

      // 이번 달 완료된 반품
      const now = new Date()
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const thisMonthCompleted = completed.filter(r => r.return_date.startsWith(thisMonth))

      return {
        pendingCount: pending.length,
        pendingQuantity: pending.reduce((sum, r) => sum + r.quantity, 0),
        totalRefunded: completed.reduce((sum, r) => sum + r.refund_amount, 0),
        thisMonthCount: thisMonthCompleted.length,
        thisMonthRefunded: thisMonthCompleted.reduce((sum, r) => sum + r.refund_amount, 0),
      }
    },
  })
}

// 반품 생성
export interface CreateReturnInput {
  sale_id: string
  sale_item_id: string
  customer_id?: string
  variant_id?: string
  product_name: string
  color?: string
  size?: string
  quantity: number
  unit_price: number
  reason?: string
  memo?: string
}

export function useCreateReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateReturnInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 반품번호 생성
      const { data: returnNumber, error: rpcError } = await supabase.rpc(
        'generate_return_number',
        { p_user_id: user.id }
      )

      if (rpcError) {
        // RPC 함수가 없으면 클라이언트에서 생성
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const { count } = await supabase
          .from('returns')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('return_date', new Date().toISOString().slice(0, 10))

        const generatedNumber = `R${today}-${String((count || 0) + 1).padStart(3, '0')}`

        const refundAmount = input.quantity * input.unit_price

        const { data, error } = await supabase
          .from('returns')
          .insert({
            user_id: user.id,
            return_number: generatedNumber,
            refund_amount: refundAmount,
            ...input,
          })
          .select()
          .single()

        if (error) throw error
        return data
      }

      const refundAmount = input.quantity * input.unit_price

      const { data, error } = await supabase
        .from('returns')
        .insert({
          user_id: user.id,
          return_number: returnNumber,
          refund_amount: refundAmount,
          ...input,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

// 반품 완료 처리 (트리거가 재고 복원, 외상 차감 자동 처리)
export function useCompleteReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // 반품 정보 조회
      const { data: returnData, error: fetchError } = await supabase
        .from('returns')
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (returnData.status !== 'pending') throw new Error('이미 처리된 반품입니다.')

      // 반품 완료 처리 (트리거가 재고 복원 및 외상 차감 자동 처리)
      const { error: updateError } = await supabase
        .from('returns')
        .update({ status: 'completed' })
        .eq('id', id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 반품 취소
export function useCancelReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: returnData, error: fetchError } = await supabase
        .from('returns')
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (returnData.status !== 'pending') throw new Error('이미 처리된 반품입니다.')

      const { error } = await supabase
        .from('returns')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] })
    },
  })
}
