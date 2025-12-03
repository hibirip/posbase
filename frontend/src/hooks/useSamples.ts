import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SampleWithDetails, SampleStatus } from '@/types/database.types'

// 샘플 목록 조회
export function useSamples(options?: {
  status?: SampleStatus
  customerId?: string
}) {
  return useQuery({
    queryKey: ['samples', options],
    queryFn: async () => {
      let query = supabase
        .from('samples')
        .select(`
          *,
          customer:customers(id, name, phone),
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
      return data as SampleWithDetails[]
    },
  })
}

// 대여중인 샘플 조회
export function useOutSamples() {
  return useSamples({ status: 'out' })
}

// 샘플 통계
export function useSampleStats() {
  return useQuery({
    queryKey: ['samples', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('samples')
        .select('id, quantity, status, customer_id, return_due')

      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const outSamples = data.filter(s => s.status === 'out')

      const outCount = outSamples.length
      const totalQuantity = outSamples.reduce((sum, s) => sum + s.quantity, 0)
      const uniqueCustomers = new Set(outSamples.map(s => s.customer_id)).size
      const overdueCount = outSamples.filter(s => s.return_due < today).length

      return {
        outCount,
        totalQuantity,
        uniqueCustomers,
        overdueCount,
      }
    },
  })
}

// 샘플 대여 생성
export interface CreateSampleInput {
  customer_id: string
  variant_id: string
  product_name: string
  color?: string
  size?: string
  quantity: number
  return_due: string
  deduct_stock?: boolean
  memo?: string
}

export function useCreateSample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSampleInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 재고 차감 옵션이 켜져 있으면 재고 확인 및 차감
      if (input.deduct_stock) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock')
          .eq('id', input.variant_id)
          .single()

        if (variantError) throw variantError

        const currentStock = variant.stock
        if (currentStock < input.quantity) {
          throw new Error(`재고가 부족합니다. (현재 재고: ${currentStock}, 필요: ${input.quantity})`)
        }

        // 재고 차감
        const { error: stockError } = await supabase
          .from('product_variants')
          .update({ stock: currentStock - input.quantity })
          .eq('id', input.variant_id)

        if (stockError) throw stockError

        // 재고 로그 기록
        await supabase.from('stock_logs').insert({
          user_id: user.id,
          variant_id: input.variant_id,
          change_type: 'adjustment',
          quantity: -input.quantity,
          before_stock: currentStock,
          after_stock: currentStock - input.quantity,
          memo: '샘플 대여',
        })
      }

      const { data, error } = await supabase
        .from('samples')
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
      queryClient.invalidateQueries({ queryKey: ['samples'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// 샘플 반납 처리
export function useReturnSample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 샘플 정보 조회
      const { data: sample, error: fetchError } = await supabase
        .from('samples')
        .select('*, variant:product_variants(id, stock)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (sample.status !== 'out') throw new Error('이미 처리된 샘플입니다.')

      // 재고 차감했던 경우 재고 복원
      if (sample.deduct_stock) {
        const currentStock = sample.variant?.stock || 0

        const { error: stockError } = await supabase
          .from('product_variants')
          .update({ stock: currentStock + sample.quantity })
          .eq('id', sample.variant_id)

        if (stockError) throw stockError

        // 재고 로그 기록
        await supabase.from('stock_logs').insert({
          user_id: user.id,
          variant_id: sample.variant_id,
          change_type: 'adjustment',
          quantity: sample.quantity,
          before_stock: currentStock,
          after_stock: currentStock + sample.quantity,
          memo: '샘플 반납',
        })
      }

      // 샘플 반납 처리
      const { error: updateError } = await supabase
        .from('samples')
        .update({
          status: 'returned',
          returned_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// 샘플 취소
export function useCancelSample() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: sample, error: fetchError } = await supabase
        .from('samples')
        .select('*, variant:product_variants(id, stock)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (sample.status !== 'out') throw new Error('이미 처리된 샘플입니다.')

      // 재고 차감했던 경우 재고 복원
      if (sample.deduct_stock) {
        const currentStock = sample.variant?.stock || 0

        const { error: stockError } = await supabase
          .from('product_variants')
          .update({ stock: currentStock + sample.quantity })
          .eq('id', sample.variant_id)

        if (stockError) throw stockError

        // 재고 로그 기록
        await supabase.from('stock_logs').insert({
          user_id: user.id,
          variant_id: sample.variant_id,
          change_type: 'adjustment',
          quantity: sample.quantity,
          before_stock: currentStock,
          after_stock: currentStock + sample.quantity,
          memo: '샘플 대여 취소',
        })
      }

      const { error } = await supabase
        .from('samples')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
