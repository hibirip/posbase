// Supabase에서 자동 생성된 타입 (npx supabase gen types)
// 임시로 수동 정의, 나중에 자동 생성으로 대체

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PaymentMethod = 'cash' | 'credit' | 'card' | 'transfer' | 'mixed'
export type SaleStatus = 'completed' | 'cancelled' | 'pending'
export type PaymentType = 'deposit' | 'refund'
export type StockChangeType = 'sale' | 'return' | 'incoming' | 'adjustment' | 'cancel'
export type BackorderStatus = 'pending' | 'completed' | 'cancelled'
export type ReturnStatus = 'pending' | 'completed' | 'cancelled'
export type NotificationType = 'overdue_credit' | 'long_pending_backorder' | 'low_stock' | 'out_of_stock'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          shop_name: string
          owner_name: string | null
          phone: string | null
          business_number: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          shop_name: string
          owner_name?: string | null
          phone?: string | null
          business_number?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_name?: string
          owner_name?: string | null
          phone?: string | null
          business_number?: string | null
          address?: string | null
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          code: string | null
          name: string
          category: string | null
          cost_price: number
          sale_price: number
          memo: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code?: string | null
          name: string
          category?: string | null
          cost_price?: number
          sale_price?: number
          memo?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string | null
          name?: string
          category?: string | null
          cost_price?: number
          sale_price?: number
          memo?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          color: string
          size: string
          stock: number
          barcode: string | null
          sku: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          color: string
          size: string
          stock?: number
          barcode?: string | null
          sku?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          color?: string
          size?: string
          stock?: number
          barcode?: string | null
          sku?: string | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          contact_name: string | null
          phone: string | null
          address: string | null
          email: string | null
          memo: string | null
          balance: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          contact_name?: string | null
          phone?: string | null
          address?: string | null
          email?: string | null
          memo?: string | null
          balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          contact_name?: string | null
          phone?: string | null
          address?: string | null
          email?: string | null
          memo?: string | null
          balance?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          sale_number: string
          sale_date: string
          total_amount: number
          discount_amount: number
          final_amount: number
          payment_method: PaymentMethod
          paid_amount: number
          credit_amount: number
          status: SaleStatus
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          sale_number: string
          sale_date?: string
          total_amount?: number
          discount_amount?: number
          final_amount?: number
          payment_method: PaymentMethod
          paid_amount?: number
          credit_amount?: number
          status?: SaleStatus
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          sale_number?: string
          sale_date?: string
          total_amount?: number
          discount_amount?: number
          final_amount?: number
          payment_method?: PaymentMethod
          paid_amount?: number
          credit_amount?: number
          status?: SaleStatus
          memo?: string | null
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          variant_id: string | null
          product_name: string
          color: string | null
          size: string | null
          quantity: number
          unit_price: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id?: string | null
          variant_id?: string | null
          product_name: string
          color?: string | null
          size?: string | null
          quantity?: number
          unit_price: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string | null
          variant_id?: string | null
          product_name?: string
          color?: string | null
          size?: string | null
          quantity?: number
          unit_price?: number
          amount?: number
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          sale_id: string | null
          type: PaymentType
          amount: number
          method: PaymentMethod
          payment_date: string
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          sale_id?: string | null
          type: PaymentType
          amount: number
          method: PaymentMethod
          payment_date?: string
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          sale_id?: string | null
          type?: PaymentType
          amount?: number
          method?: PaymentMethod
          payment_date?: string
          memo?: string | null
        }
      }
      stock_logs: {
        Row: {
          id: string
          user_id: string
          variant_id: string
          change_type: StockChangeType
          quantity: number
          before_stock: number
          after_stock: number
          reference_id: string | null
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          variant_id: string
          change_type: StockChangeType
          quantity: number
          before_stock: number
          after_stock: number
          reference_id?: string | null
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          variant_id?: string
          change_type?: StockChangeType
          quantity?: number
          before_stock?: number
          after_stock?: number
          reference_id?: string | null
          memo?: string | null
        }
      }
      backorders: {
        Row: {
          id: string
          user_id: string
          sale_id: string
          sale_item_id: string
          customer_id: string
          variant_id: string
          product_name: string
          color: string | null
          size: string | null
          quantity: number
          status: BackorderStatus
          memo: string | null
          created_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sale_id: string
          sale_item_id: string
          customer_id: string
          variant_id: string
          product_name: string
          color?: string | null
          size?: string | null
          quantity: number
          status?: BackorderStatus
          memo?: string | null
          created_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sale_id?: string
          sale_item_id?: string
          customer_id?: string
          variant_id?: string
          product_name?: string
          color?: string | null
          size?: string | null
          quantity?: number
          status?: BackorderStatus
          memo?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      returns: {
        Row: {
          id: string
          user_id: string
          sale_id: string
          sale_item_id: string
          customer_id: string | null
          variant_id: string | null
          product_name: string
          color: string | null
          size: string | null
          return_number: string
          return_date: string
          quantity: number
          unit_price: number
          refund_amount: number
          reason: string | null
          memo: string | null
          status: ReturnStatus
          created_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sale_id: string
          sale_item_id: string
          customer_id?: string | null
          variant_id?: string | null
          product_name: string
          color?: string | null
          size?: string | null
          return_number: string
          return_date?: string
          quantity: number
          unit_price: number
          refund_amount: number
          reason?: string | null
          memo?: string | null
          status?: ReturnStatus
          created_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sale_id?: string
          sale_item_id?: string
          customer_id?: string | null
          variant_id?: string | null
          product_name?: string
          color?: string | null
          size?: string | null
          return_number?: string
          return_date?: string
          quantity?: number
          unit_price?: number
          refund_amount?: number
          reason?: string | null
          memo?: string | null
          status?: ReturnStatus
          completed_at?: string | null
          updated_at?: string
        }
      }
      notification_dismissals: {
        Row: {
          id: string
          user_id: string
          notification_type: NotificationType
          reference_id: string
          dismissed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: NotificationType
          reference_id: string
          dismissed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: NotificationType
          reference_id?: string
          dismissed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_sale_number: {
        Args: {
          p_user_id: string
          p_date?: string
        }
        Returns: string
      }
      generate_return_number: {
        Args: {
          p_user_id: string
          p_date?: string
        }
        Returns: string
      }
      get_notification_counts: {
        Args: {
          p_user_id: string
        }
        Returns: {
          overdue_credit_count: number
          long_pending_backorder_count: number
          low_stock_count: number
          out_of_stock_count: number
          total_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 편의 타입
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// 자주 사용하는 타입 별칭
export type Profile = Tables<'profiles'>
export type Product = Tables<'products'>
export type ProductVariant = Tables<'product_variants'>
export type Customer = Tables<'customers'>
export type Sale = Tables<'sales'>
export type SaleItem = Tables<'sale_items'>
export type Payment = Tables<'payments'>
export type StockLog = Tables<'stock_logs'>
export type Backorder = Tables<'backorders'>
export type Return = Tables<'returns'>

// 확장 타입 (관계 포함)
export type ProductWithVariants = Product & {
  variants: ProductVariant[]
}

export type SaleWithItems = Sale & {
  items: SaleItem[]
  customer?: Customer | null
}

export type BackorderWithDetails = Backorder & {
  customer?: { id: string; name: string; phone?: string | null } | null
  sale?: { id: string; sale_number: string } | null
  variant?: { id: string; stock: number } | null
}

export type ReturnWithDetails = Return & {
  customer?: { id: string; name: string; phone?: string | null } | null
  sale?: { id: string; sale_number: string; sale_date: string } | null
  variant?: { id: string; stock: number } | null
}

export type NotificationDismissal = Tables<'notification_dismissals'>

// 알림 관련 타입
export interface NotificationCounts {
  overdue_credit_count: number
  long_pending_backorder_count: number
  low_stock_count: number
  out_of_stock_count: number
  total_count: number
}

export interface OverdueCreditNotification {
  customer_id: string
  customer_name: string
  balance: number
  oldest_credit_date: string
  days_overdue: number
}

export interface LongPendingBackorderNotification {
  backorder_id: string
  customer_name: string
  product_name: string
  color: string | null
  size: string | null
  quantity: number
  created_date: string
  days_pending: number
}

export interface LowStockNotification {
  variant_id: string
  product_id: string
  product_name: string
  color: string
  size: string
  stock: number
}

export interface OutOfStockNotification {
  variant_id: string
  product_id: string
  product_name: string
  color: string
  size: string
}

// 통합 알림 타입
export interface Notification {
  id: string  // reference_id
  type: NotificationType
  title: string
  message: string
  link?: string
  data: OverdueCreditNotification | LongPendingBackorderNotification | LowStockNotification | OutOfStockNotification
}
