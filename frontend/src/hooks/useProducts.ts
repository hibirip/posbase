import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProductWithVariants } from '@/types/database.types'

// 상품 목록 조회
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ProductWithVariants[]
    },
  })
}

// 단일 상품 조회
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as ProductWithVariants
    },
    enabled: !!id,
  })
}

// 상품 생성
interface CreateProductInput {
  name: string
  code?: string
  category?: string
  cost_price: number
  sale_price: number
  memo?: string
  image_url?: string
  variants: { color: string; size: string; stock: number }[]
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 상품 생성
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: input.name,
          code: input.code,
          category: input.category,
          cost_price: input.cost_price,
          sale_price: input.sale_price,
          memo: input.memo,
          image_url: input.image_url,
        })
        .select()
        .single()

      if (productError) throw productError

      // 옵션(variants) 생성
      if (input.variants.length > 0) {
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(
            input.variants.map(v => ({
              product_id: product.id,
              color: v.color,
              size: v.size,
              stock: v.stock,
            }))
          )

        if (variantsError) throw variantsError
      }

      return product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 상품 수정
interface UpdateProductInput {
  id: string
  name?: string
  code?: string
  category?: string
  cost_price?: number
  sale_price?: number
  memo?: string
  image_url?: string
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      const { id, ...updateData } = input

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] })
    },
  })
}

// 상품 삭제 (soft delete)
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 옵션 추가
export function useAddVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { product_id: string; color: string; size: string; stock: number }) => {
      const { data, error } = await supabase
        .from('product_variants')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', data.product_id] })
    },
  })
}

// 옵션 수정
export function useUpdateVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; color?: string; size?: string; stock?: number }) => {
      const { id, ...updateData } = input

      const { data, error } = await supabase
        .from('product_variants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 옵션 삭제
export function useDeleteVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 여러 옵션 재고 일괄 수정
export function useBatchUpdateVariants() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: { id: string; stock: number }[]) => {
      // 변경된 항목만 필터링
      if (updates.length === 0) return

      // 병렬로 업데이트
      const promises = updates.map(({ id, stock }) =>
        supabase
          .from('product_variants')
          .update({ stock })
          .eq('id', id)
      )

      const results = await Promise.all(promises)

      // 에러 체크
      const error = results.find((r) => r.error)?.error
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
