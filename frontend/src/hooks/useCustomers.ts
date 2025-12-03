import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database.types'

// 거래처 목록 조회
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Customer[]
    },
  })
}

// 단일 거래처 조회
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })
}

// 거래처 생성
interface CreateCustomerInput {
  name: string
  contact_name?: string
  phone?: string
  address?: string
  email?: string
  memo?: string
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('customers')
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
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 거래처 수정
interface UpdateCustomerInput {
  id: string
  name?: string
  contact_name?: string
  phone?: string
  address?: string
  email?: string
  memo?: string
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateCustomerInput) => {
      const { id, ...updateData } = input

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] })
    },
  })
}

// 거래처 삭제 (soft delete)
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 외상 있는 거래처 조회
export function useCustomersWithBalance() {
  return useQuery({
    queryKey: ['customers', 'with-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .gt('balance', 0)
        .order('balance', { ascending: false })

      if (error) throw error
      return data as Customer[]
    },
  })
}
