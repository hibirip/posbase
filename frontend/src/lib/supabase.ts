import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Supabase 타입 생성이 완료되면 다시 제네릭 추가
// export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
