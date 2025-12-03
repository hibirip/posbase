import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DailyStats {
  date: string
  totalSales: number
  totalPaid: number
  totalCredit: number
  orderCount: number
}

// 기간별 판매 통계
export function useSalesStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['stats', 'sales', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('sale_date, final_amount, paid_amount, credit_amount')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .eq('status', 'completed')

      if (error) throw error

      // 일별 그룹화
      const dailyMap = new Map<string, DailyStats>()

      data.forEach((sale) => {
        const existing = dailyMap.get(sale.sale_date) || {
          date: sale.sale_date,
          totalSales: 0,
          totalPaid: 0,
          totalCredit: 0,
          orderCount: 0,
        }

        existing.totalSales += sale.final_amount
        existing.totalPaid += sale.paid_amount
        existing.totalCredit += sale.credit_amount
        existing.orderCount += 1

        dailyMap.set(sale.sale_date, existing)
      })

      // 날짜 순 정렬
      const dailyStats = Array.from(dailyMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // 합계
      const totals = {
        totalSales: data.reduce((sum, s) => sum + s.final_amount, 0),
        totalPaid: data.reduce((sum, s) => sum + s.paid_amount, 0),
        totalCredit: data.reduce((sum, s) => sum + s.credit_amount, 0),
        orderCount: data.length,
      }

      return { dailyStats, totals }
    },
  })
}

// 상품별 판매 통계
export function useProductStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['stats', 'products', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          product_name,
          quantity,
          amount,
          sale:sales!inner(sale_date, status)
        `)
        .gte('sale.sale_date', startDate)
        .lte('sale.sale_date', endDate)
        .eq('sale.status', 'completed')

      if (error) throw error

      // 상품별 그룹화
      const productMap = new Map<string, { name: string; quantity: number; amount: number }>()

      data.forEach((item) => {
        const existing = productMap.get(item.product_name) || {
          name: item.product_name,
          quantity: 0,
          amount: 0,
        }

        existing.quantity += item.quantity
        existing.amount += item.amount

        productMap.set(item.product_name, existing)
      })

      // 금액 순 정렬
      return Array.from(productMap.values()).sort((a, b) => b.amount - a.amount)
    },
  })
}

// 거래처별 판매 통계
export function useCustomerStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['stats', 'customers', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          customer_id,
          final_amount,
          paid_amount,
          credit_amount,
          customer:customers(name)
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .eq('status', 'completed')
        .not('customer_id', 'is', null)

      if (error) throw error

      // 거래처별 그룹화
      const customerMap = new Map<string, {
        id: string
        name: string
        totalSales: number
        totalPaid: number
        totalCredit: number
        orderCount: number
      }>()

      data.forEach((sale) => {
        if (!sale.customer_id || !sale.customer) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customerData = sale.customer as any
        const customerName = Array.isArray(customerData) ? customerData[0]?.name : customerData?.name

        const existing = customerMap.get(sale.customer_id) || {
          id: sale.customer_id,
          name: customerName || '알 수 없음',
          totalSales: 0,
          totalPaid: 0,
          totalCredit: 0,
          orderCount: 0,
        }

        existing.totalSales += sale.final_amount
        existing.totalPaid += sale.paid_amount
        existing.totalCredit += sale.credit_amount
        existing.orderCount += 1

        customerMap.set(sale.customer_id, existing)
      })

      // 금액 순 정렬
      return Array.from(customerMap.values()).sort((a, b) => b.totalSales - a.totalSales)
    },
  })
}

// 입금 통계
export function usePaymentStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['stats', 'payments', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('type, amount, method, payment_date')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)

      if (error) throw error

      const deposits = data.filter(p => p.type === 'deposit')
      const refunds = data.filter(p => p.type === 'refund')

      return {
        totalDeposits: deposits.reduce((sum, p) => sum + p.amount, 0),
        totalRefunds: refunds.reduce((sum, p) => sum + p.amount, 0),
        depositCount: deposits.length,
        refundCount: refunds.length,
        byMethod: {
          cash: data.filter(p => p.method === 'cash' && p.type === 'deposit').reduce((sum, p) => sum + p.amount, 0),
          card: data.filter(p => p.method === 'card' && p.type === 'deposit').reduce((sum, p) => sum + p.amount, 0),
          transfer: data.filter(p => p.method === 'transfer' && p.type === 'deposit').reduce((sum, p) => sum + p.amount, 0),
        },
      }
    },
  })
}
