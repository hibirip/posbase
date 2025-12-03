import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Payment, PaymentMethod, PaymentType } from '@/types/database.types'

// 입금 목록 조회
export function usePayments(options?: { customerId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['payments', options],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          customer:customers(id, name)
        `)
        .order('created_at', { ascending: false })

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      if (options?.startDate) {
        query = query.gte('payment_date', options.startDate)
      }

      if (options?.endDate) {
        query = query.lte('payment_date', options.endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as (Payment & { customer: { id: string; name: string } })[]
    },
  })
}

// 입금 생성
interface CreatePaymentInput {
  customer_id: string
  type: PaymentType
  amount: number
  method: PaymentMethod
  memo?: string
}

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('payments')
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
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 거래처별 입금 내역
export function useCustomerPayments(customerId: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'customer', customerId],
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Payment[]
    },
    enabled: !!customerId,
  })
}
