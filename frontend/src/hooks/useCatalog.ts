import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProductWithVariants, ShopProfile } from '@/types/database.types'
import type { CatalogProduct, CatalogShopInfo } from '@/types/catalog.types'

// 공개 매장 프로필 조회 (slug로)
export function useShopProfile(slug: string | undefined) {
  return useQuery({
    queryKey: ['catalog', slug, 'profile'],
    queryFn: async () => {
      if (!slug) return null

      // RPC 함수 사용 (보안 정책 우회)
      const { data, error } = await supabase.rpc('get_shop_profile', {
        p_slug: slug,
      })

      if (error) throw error
      if (!data || data.length === 0) return null

      return data[0] as CatalogShopInfo
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 카탈로그 상품 목록 조회
export function useCatalogProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ['catalog', slug, 'products'],
    queryFn: async () => {
      if (!slug) return []

      // RPC 함수 사용
      const { data, error } = await supabase.rpc('get_catalog_products', {
        p_slug: slug,
      })

      if (error) throw error
      return (data || []) as CatalogProduct[]
    },
    enabled: !!slug,
    staleTime: 60 * 1000, // 1분
  })
}

// 카탈로그 상품 상세 조회 (variants 포함)
export function useCatalogProductDetail(slug: string | undefined, productId: string | undefined) {
  return useQuery({
    queryKey: ['catalog', slug, 'products', productId],
    queryFn: async () => {
      if (!slug || !productId) return null

      const { data, error } = await supabase.rpc('get_catalog_product_detail', {
        p_slug: slug,
        p_product_id: productId,
      })

      if (error) throw error
      if (!data || data.length === 0) return null

      // RPC 결과를 ProductWithVariants 형태로 변환
      const firstRow = data[0]
      const variants = data
        .filter((row: any) => row.variant_id) // null variant 제외
        .map((row: any) => ({
          id: row.variant_id,
          product_id: row.product_id,
          color: row.color,
          size: row.size,
          stock: row.stock,
          barcode: null,
          sku: null,
          created_at: '',
          updated_at: '',
        }))

      return {
        id: firstRow.product_id,
        user_id: '',
        code: firstRow.product_code,
        name: firstRow.product_name,
        category: firstRow.product_category,
        cost_price: 0,
        sale_price: firstRow.sale_price,
        memo: null,
        is_active: true,
        image_url: firstRow.image_url,
        is_public: true,
        created_at: '',
        updated_at: '',
        variants,
      } as ProductWithVariants
    },
    enabled: !!slug && !!productId,
    staleTime: 30 * 1000, // 30초
  })
}

// ============================================
// 사장님용 카탈로그 관리 훅
// ============================================

// 내 매장 프로필 조회
export function useMyShopProfile() {
  return useQuery({
    queryKey: ['my-shop-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('shop_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as ShopProfile | null
    },
  })
}

// 매장 프로필 생성
interface CreateShopProfileInput {
  slug: string
  display_name: string
  building?: string
  description?: string
  phone?: string
  kakao_id?: string
  categories?: string[]
}

export function useCreateShopProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateShopProfileInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('shop_profiles')
        .insert({
          user_id: user.id,
          slug: input.slug,
          display_name: input.display_name,
          building: input.building,
          description: input.description,
          phone: input.phone,
          kakao_id: input.kakao_id,
          categories: input.categories || ['전체'],
          is_active: false, // 처음에는 비활성화
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-profile'] })
    },
  })
}

// 매장 프로필 수정
interface UpdateShopProfileInput {
  slug?: string
  display_name?: string
  building?: string
  description?: string
  phone?: string
  kakao_id?: string
  is_active?: boolean
  show_prices?: boolean
  categories?: string[]
}

export function useUpdateShopProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateShopProfileInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('shop_profiles')
        .update(input)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop-profile'] })
    },
  })
}

// slug 중복 체크
export function useCheckSlugAvailable() {
  return useMutation({
    mutationFn: async (slug: string) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('shop_profiles')
        .select('id, user_id')
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error

      // 없거나, 본인 것이면 사용 가능
      return !data || data.user_id === user?.id
    },
  })
}
