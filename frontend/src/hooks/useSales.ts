import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sale, SaleItem, SaleWithItems, PaymentMethod } from '@/types/database.types'

// 판매 목록 조회
export function useSales(options?: { date?: string; customerId?: string }) {
  return useQuery({
    queryKey: ['sales', options],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name),
          items:sale_items(*)
        `)
        .order('created_at', { ascending: false })

      if (options?.date) {
        query = query.eq('sale_date', options.date)
      }

      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as (Sale & { customer: { id: string; name: string } | null; items: SaleItem[] })[]
    },
  })
}

// 오늘 판매 목록
export function useTodaySales() {
  const today = new Date().toISOString().split('T')[0]
  return useSales({ date: today })
}

// 단일 판매 조회
export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, phone),
          items:sale_items(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as SaleWithItems & { customer: { id: string; name: string; phone: string } | null }
    },
    enabled: !!id,
  })
}

// 판매 생성
export interface SaleItemInput {
  variant_id?: string
  product_id?: string
  product_name: string
  color?: string
  size?: string
  quantity: number
  unit_price: number
}

export interface CreateSaleInput {
  customer_id?: string
  items: SaleItemInput[]
  discount_amount?: number
  payment_method: PaymentMethod
  paid_amount: number
  memo?: string
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 금액 계산
      const total_amount = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      )
      const discount_amount = input.discount_amount || 0
      const final_amount = total_amount - discount_amount
      const credit_amount = final_amount - input.paid_amount

      // 판매번호 생성
      const { data: saleNumber, error: saleNumberError } = await supabase
        .rpc('generate_sale_number', { p_user_id: user.id })

      if (saleNumberError) throw saleNumberError

      // 판매 저장
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          customer_id: input.customer_id || null,
          sale_number: saleNumber,
          total_amount,
          discount_amount,
          final_amount,
          payment_method: input.payment_method,
          paid_amount: input.paid_amount,
          credit_amount,
          memo: input.memo,
        })
        .select()
        .single()

      if (saleError) throw saleError

      // 판매 상세 저장 (트리거가 재고 차감 처리)
      const saleItems = input.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id || null,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        color: item.color || null,
        size: item.size || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) {
        // 롤백: 판매 삭제
        await supabase.from('sales').delete().eq('id', sale.id)
        throw itemsError
      }

      return sale
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 판매 취소
export function useCancelSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 판매 정보 가져오기
      const { data: sale, error: fetchError } = await supabase
        .from('sales')
        .select('*, items:sale_items(*)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (sale.status === 'cancelled') throw new Error('이미 취소된 판매입니다.')

      // 재고 복원
      for (const item of sale.items) {
        if (item.variant_id) {
          // 현재 재고 조회
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.variant_id)
            .single()

          if (variant) {
            const beforeStock = variant.stock
            const afterStock = beforeStock + item.quantity

            // 재고 복원
            const { error: stockError } = await supabase
              .from('product_variants')
              .update({ stock: afterStock })
              .eq('id', item.variant_id)

            if (stockError) throw stockError

            // 재고 로그 기록
            await supabase.from('stock_logs').insert({
              user_id: user.id,
              variant_id: item.variant_id,
              change_type: 'cancel',
              quantity: item.quantity,
              before_stock: beforeStock,
              after_stock: afterStock,
              reference_id: id,
              memo: '판매 취소',
            })
          }
        }
      }

      // 외상 복원 (외상이었던 경우)
      if (sale.credit_amount > 0 && sale.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('balance')
          .eq('id', sale.customer_id)
          .single()

        if (customer) {
          await supabase
            .from('customers')
            .update({
              balance: customer.balance - sale.credit_amount
            })
            .eq('id', sale.customer_id)
        }
      }

      // 판매 상태 변경
      const { error: updateError } = await supabase
        .from('sales')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 오늘 매출 통계
export function useTodayStats() {
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['stats', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('final_amount, paid_amount, credit_amount')
        .eq('sale_date', today)
        .eq('status', 'completed')

      if (error) throw error

      const totalSales = data.reduce((sum, s) => sum + s.final_amount, 0)
      const totalPaid = data.reduce((sum, s) => sum + s.paid_amount, 0)
      const totalCredit = data.reduce((sum, s) => sum + s.credit_amount, 0)
      const orderCount = data.length

      return {
        totalSales,
        totalPaid,
        totalCredit,
        orderCount,
      }
    },
  })
}
