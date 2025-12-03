# DOMPOS Backend Specification

> 📅 2025년 12월 기준 | Supabase 기반 백엔드
> 
> ⚠️ 이 문서는 완벽하지 않습니다. Claude Code는 개발 진행하면서 부족한 부분을 발견하면 이 문서를 직접 업데이트하며 진행해주세요.

---

## 프로젝트 개요

EOS8을 대체하는 동대문 의류 도매 POS 시스템의 백엔드.
Supabase를 BaaS(Backend as a Service)로 사용하여 별도 서버 없이 운영.

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│              (React + Vite, 별도 레포)                   │
└─────────────────────┬───────────────────────────────────┘
                      │ Supabase Client SDK
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ PostgreSQL  │  │    Auth     │  │ Edge Functions  │ │
│  │   (RLS)     │  │  (JWT기반)   │  │  (복잡한 로직)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │  Realtime   │  │   Storage   │                      │
│  │ (재고 동기화) │  │ (상품 이미지) │                      │
│  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**왜 별도 API 서버가 필요 없는가:**
- Supabase PostgreSQL + RLS로 보안 처리
- 트리거/함수로 비즈니스 로직 처리 (재고 차감, 외상 계산)
- 복잡한 로직은 Edge Functions로 처리
- 프론트에서 Supabase 클라이언트로 직접 CRUD

---

## 기술 스택

```yaml
Database: Supabase PostgreSQL (Pro Plan)
Auth: Supabase Auth (Email/Password)
Realtime: Supabase Realtime (재고 동기화용)
Storage: Supabase Storage (상품 이미지, 선택)
Functions: Supabase Edge Functions (Deno, 필요시)

# 프론트엔드 (별도 레포, 참고용)
Frontend: React 19 + Vite 7 + TypeScript
State: Zustand 또는 Jotai
Data Fetching: TanStack Query v5
Styling: Tailwind CSS v4
```

---

## 데이터베이스 스키마

### ERD 개요

```
profiles (users)
    │
    ├──< products ──< product_variants ──< stock_logs
    │
    ├──< customers ──< payments
    │        │
    │        └──< sales ──< sale_items
    │               │
    │               └──○ payments (sale_id는 선택)

관계 설명:
- profiles 1:N products (한 유저가 여러 상품)
- products 1:N product_variants (한 상품이 여러 옵션)
- profiles 1:N customers (한 유저가 여러 거래처)
- customers 1:N sales (한 거래처가 여러 판매)
- sales 1:N sale_items (한 판매가 여러 상품)
- customers 1:N payments (한 거래처에 여러 입금)
- product_variants 1:N stock_logs (한 옵션에 여러 재고변동)
```

### 테이블 상세

#### 1. profiles (사용자/매장 정보)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name VARCHAR(100) NOT NULL,        -- 매장명
  owner_name VARCHAR(50),                 -- 대표자명
  phone VARCHAR(20),                      -- 연락처
  business_number VARCHAR(20),            -- 사업자번호 (선택)
  address TEXT,                           -- 주소 (선택)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. products (상품)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(50),                       -- 품번 (자동/수동)
  name VARCHAR(200) NOT NULL,             -- 품명
  category VARCHAR(50),                   -- 카테고리
  cost_price INTEGER NOT NULL DEFAULT 0,  -- 원가 (입고가)
  sale_price INTEGER NOT NULL DEFAULT 0,  -- 판매가 (도매가)
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_products_user ON products(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_search ON products(user_id, name) WHERE is_active = TRUE;
CREATE INDEX idx_products_code ON products(user_id, code) WHERE code IS NOT NULL;
```

#### 3. product_variants (상품 옵션)
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color VARCHAR(50) NOT NULL,             -- 칼라
  size VARCHAR(20) NOT NULL,              -- 사이즈
  stock INTEGER NOT NULL DEFAULT 0,       -- 현재고
  barcode VARCHAR(100),                   -- 바코드 (선택)
  sku VARCHAR(100),                       -- SKU (선택)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, color, size)
);

-- 인덱스
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_variants_low_stock ON product_variants(product_id, stock) WHERE stock <= 5;
```

#### 4. customers (거래처)
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,             -- 업체명
  contact_name VARCHAR(50),               -- 담당자명
  phone VARCHAR(20),                      -- 연락처
  address TEXT,
  email VARCHAR(100),
  memo TEXT,
  balance INTEGER NOT NULL DEFAULT 0,     -- 외상잔액 (양수=받을돈)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_customers_user ON customers(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_customers_search ON customers(user_id, name) WHERE is_active = TRUE;
CREATE INDEX idx_customers_balance ON customers(user_id, balance) WHERE balance > 0;
```

#### 5. sales (판매)
```sql
-- ENUM 타입
CREATE TYPE payment_method AS ENUM ('cash', 'credit', 'card', 'transfer', 'mixed');
CREATE TYPE sale_status AS ENUM ('completed', 'cancelled', 'pending');

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- 판매 정보
  sale_number VARCHAR(20) NOT NULL,       -- 판매번호 (YYYYMMDD-NNN)
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- 금액
  total_amount INTEGER NOT NULL DEFAULT 0,    -- 총액
  discount_amount INTEGER NOT NULL DEFAULT 0, -- 할인
  final_amount INTEGER NOT NULL DEFAULT 0,    -- 최종금액
  
  -- 결제
  payment_method payment_method NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,     -- 받은금액
  credit_amount INTEGER NOT NULL DEFAULT 0,   -- 외상금액
  
  -- 상태
  status sale_status DEFAULT 'completed',
  memo TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT valid_amounts CHECK (final_amount = total_amount - discount_amount),
  CONSTRAINT valid_payment CHECK (paid_amount + credit_amount = final_amount)
);

-- 인덱스
CREATE INDEX idx_sales_user_date ON sales(user_id, sale_date DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_number ON sales(user_id, sale_number);
CREATE INDEX idx_sales_status ON sales(user_id, status) WHERE status != 'completed';
```

#### 6. sale_items (판매 상세)
```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  
  -- 판매 시점 스냅샷 (상품 변경되어도 기록 유지)
  product_name VARCHAR(200) NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  
  -- 수량/금액
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  amount INTEGER NOT NULL,                -- quantity * unit_price
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_variant ON sale_items(variant_id) WHERE variant_id IS NOT NULL;
```

#### 7. payments (입금 기록)
```sql
CREATE TYPE payment_type AS ENUM ('income', 'refund');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  
  type payment_type NOT NULL,             -- income: 입금, refund: 환불
  amount INTEGER NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_payments_user_date ON payments(user_id, payment_date DESC);
CREATE INDEX idx_payments_customer ON payments(customer_id);
```

#### 8. stock_logs (재고 변동 기록)
```sql
CREATE TYPE stock_change_type AS ENUM (
  'sale',        -- 판매
  'return',      -- 반품
  'incoming',    -- 입고
  'adjustment',  -- 재고 조정
  'cancel'       -- 판매 취소
);

CREATE TABLE stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  
  change_type stock_change_type NOT NULL,
  quantity INTEGER NOT NULL,              -- 변동량 (판매=-N, 입고=+N)
  before_stock INTEGER NOT NULL,
  after_stock INTEGER NOT NULL,
  
  reference_id UUID,                      -- 관련 sale_id 등
  memo TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_stock_logs_variant ON stock_logs(variant_id, created_at DESC);
CREATE INDEX idx_stock_logs_date ON stock_logs(user_id, created_at DESC);
```

---

## RLS (Row Level Security) 정책

모든 테이블에 RLS 적용. 사용자는 자신의 데이터만 접근 가능.

```sql
-- 모든 테이블 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

-- profiles: 본인 데이터만
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- products: user_id 기반
CREATE POLICY "products_all" ON products FOR ALL USING (auth.uid() = user_id);

-- product_variants: products 통해 user_id 확인
CREATE POLICY "variants_all" ON product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = auth.uid())
);

-- customers: user_id 기반
CREATE POLICY "customers_all" ON customers FOR ALL USING (auth.uid() = user_id);

-- sales: user_id 기반
CREATE POLICY "sales_all" ON sales FOR ALL USING (auth.uid() = user_id);

-- sale_items: sales 통해 user_id 확인
CREATE POLICY "sale_items_all" ON sale_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
);

-- payments: user_id 기반
CREATE POLICY "payments_all" ON payments FOR ALL USING (auth.uid() = user_id);

-- stock_logs: user_id 기반
CREATE POLICY "stock_logs_all" ON stock_logs FOR ALL USING (auth.uid() = user_id);
```

---

## Database Functions & Triggers

### 1. 판매번호 자동생성
```sql
CREATE OR REPLACE FUNCTION generate_sale_number(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM sales
  WHERE user_id = p_user_id 
    AND sale_date = p_date;
  
  RETURN TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;
```

### 2. updated_at 자동 갱신
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 트리거 적용
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3. 외상잔액 자동 업데이트
```sql
-- 판매 시 외상 추가
CREATE OR REPLACE FUNCTION update_balance_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.credit_amount > 0 AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers 
    SET balance = balance + NEW.credit_amount 
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_balance
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_on_sale();

-- 입금 시 외상 차감
CREATE OR REPLACE FUNCTION update_balance_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.type = 'income' THEN
    UPDATE customers SET balance = balance - NEW.amount WHERE id = NEW.customer_id;
  ELSIF NEW.type = 'refund' THEN
    UPDATE customers SET balance = balance + NEW.amount WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_balance
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_on_payment();
```

### 4. 재고 자동 차감 (판매 시)
```sql
CREATE OR REPLACE FUNCTION update_stock_on_sale_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_before INTEGER;
  v_after INTEGER;
BEGIN
  IF NEW.variant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- user_id 조회
  SELECT user_id INTO v_user_id FROM sales WHERE id = NEW.sale_id;
  
  -- 현재 재고
  SELECT stock INTO v_before FROM product_variants WHERE id = NEW.variant_id;
  
  -- 재고 차감
  UPDATE product_variants 
  SET stock = stock - NEW.quantity
  WHERE id = NEW.variant_id
  RETURNING stock INTO v_after;
  
  -- 로그 기록
  INSERT INTO stock_logs (user_id, variant_id, change_type, quantity, before_stock, after_stock, reference_id)
  VALUES (v_user_id, NEW.variant_id, 'sale', -NEW.quantity, v_before, v_after, NEW.sale_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_item_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_sale_item();
```

### 5. 회원가입 시 프로필 자동 생성
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, shop_name, owner_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'shop_name', '내 매장'),
    NEW.raw_user_meta_data->>'owner_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## 복잡한 비즈니스 로직 (Edge Functions 후보)

간단한 CRUD는 프론트에서 Supabase 클라이언트로 직접 처리.
아래 케이스는 Edge Function으로 처리 권장:

### 1. 판매 처리 (트랜잭션 필요)
```typescript
// supabase/functions/create-sale/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface SaleInput {
  customer_id?: string
  items: {
    variant_id: string
    product_name: string
    color: string
    size: string
    quantity: number
    unit_price: number
  }[]
  discount_amount?: number
  payment_method: 'cash' | 'credit' | 'card' | 'transfer' | 'mixed'
  paid_amount: number
  memo?: string
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // JWT에서 user_id 추출
  const authHeader = req.headers.get('Authorization')!
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const input: SaleInput = await req.json()
  
  // 금액 계산
  const total_amount = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const discount_amount = input.discount_amount || 0
  const final_amount = total_amount - discount_amount
  const credit_amount = final_amount - input.paid_amount

  // 판매번호 생성
  const { data: saleNumber } = await supabase.rpc('generate_sale_number', { p_user_id: user.id })

  // 판매 저장
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      customer_id: input.customer_id,
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

  if (saleError) {
    return new Response(JSON.stringify({ error: saleError.message }), { status: 500 })
  }

  // 판매 상세 저장 (트리거가 재고/외상 처리)
  const saleItems = input.items.map(item => ({
    sale_id: sale.id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.quantity * item.unit_price,
  }))

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems)

  if (itemsError) {
    // 롤백 필요 시 sale 삭제
    await supabase.from('sales').delete().eq('id', sale.id)
    return new Response(JSON.stringify({ error: itemsError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ data: sale }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### 2. 판매 취소 (반품)
```typescript
// supabase/functions/cancel-sale/index.ts
// 판매 취소 시:
// 1. sale.status = 'cancelled'
// 2. 재고 복원
// 3. 외상 차감 (외상이었던 경우)
```

### 3. 일괄 입고
```typescript
// supabase/functions/bulk-incoming/index.ts
// 여러 상품 동시 입고 처리
```

---

## 프론트엔드 연동 가이드

### Supabase 클라이언트 설정
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### 타입 생성
```bash
# Supabase CLI로 타입 자동 생성
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

### 쿼리 예시
```typescript
// 상품 목록 (variants 포함)
const { data: products } = await supabase
  .from('products')
  .select(`
    *,
    variants:product_variants(*)
  `)
  .eq('is_active', true)
  .order('created_at', { ascending: false })

// 거래처 검색 (외상 있는 것만)
const { data: customers } = await supabase
  .from('customers')
  .select('*')
  .eq('is_active', true)
  .gt('balance', 0)
  .ilike('name', `%${search}%`)

// 오늘 매출 통계
const today = new Date().toISOString().split('T')[0]
const { data: stats } = await supabase
  .from('sales')
  .select('final_amount, paid_amount, credit_amount')
  .eq('sale_date', today)
  .eq('status', 'completed')

// Edge Function 호출 (판매 처리)
const { data, error } = await supabase.functions.invoke('create-sale', {
  body: { customer_id, items, payment_method, paid_amount }
})
```

### Realtime 구독 (재고 동기화)
```typescript
// 재고 변동 실시간 감지
const channel = supabase
  .channel('stock-changes')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'product_variants' },
    (payload) => {
      console.log('재고 변동:', payload.new)
      // 화면 갱신
    }
  )
  .subscribe()
```

---

## 환경변수

```env
# Supabase (필수)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx

# Edge Functions 배포 시 (자동 설정됨)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 개발 순서

### Phase 1: DB 셋업
```
□ Supabase 프로젝트 생성
□ supabase_schema.sql 실행
□ RLS 정책 적용
□ 트리거/함수 적용
□ 테스트 데이터 입력
```

### Phase 2: Auth
```
□ Supabase Auth 설정 (Email/Password)
□ 회원가입 시 프로필 자동 생성 확인
□ 프론트에서 로그인/로그아웃 테스트
```

### Phase 3: CRUD 테스트
```
□ 프론트에서 상품 CRUD
□ 프론트에서 거래처 CRUD
□ RLS 동작 확인 (다른 유저 데이터 접근 불가)
```

### Phase 4: 판매 로직
```
□ Edge Function: create-sale 작성
□ 재고 자동 차감 확인
□ 외상 자동 업데이트 확인
□ 판매번호 자동 생성 확인
```

### Phase 5: 정산
```
□ 입금 처리 테스트
□ 외상 잔액 업데이트 확인
□ 매출 통계 쿼리 작성
```

### Phase 6: 반품
```
□ Edge Function: cancel-sale 작성
□ 재고 복원 확인
□ 외상 차감 확인
```

---

## 문서 보완 가이드라인

> **Claude Code에게:** 이 문서는 완벽하지 않습니다. 개발 진행하면서 아래 상황 발생 시 이 문서를 직접 업데이트해주세요.

### 문서 업데이트가 필요한 경우
1. 스키마 변경 필요 시 → 테이블/컬럼 추가/수정 내용 반영
2. 새로운 RLS 정책 필요 시 → 정책 추가
3. 새로운 트리거/함수 필요 시 → 코드 추가
4. Edge Function 추가 시 → 코드/설명 추가
5. 예상치 못한 비즈니스 로직 발견 시 → 문서화

### 업데이트 방법
```markdown
<!-- 변경 이력을 상단에 추가 -->
## 변경 이력
- 2025-12-XX: [변경 내용]
```

### 프론트엔드와 동기화
- 스키마 변경 시 `npx supabase gen types` 재실행
- Edge Function 추가 시 프론트엔드 팀에 알림

---

## 체크리스트

### MVP
- [x] 테이블 생성 완료
- [x] RLS 정책 적용
- [x] 트리거/함수 동작 확인
- [x] Auth 연동
- [x] 상품 CRUD
- [x] 거래처 CRUD
- [x] 판매 처리 (프론트엔드 + DB 트리거)
- [x] 재고 자동 차감 (DB 트리거)
- [x] 외상 관리 (DB 트리거)
- [ ] 입금 처리

### v1.0
- [ ] 반품 처리
- [x] 판매 취소
- [ ] 매출 통계

### v1.5
- [ ] 입고 관리
- [ ] 재고 조정
- [ ] 미송 관리 (스키마 추가 필요)

### v2.0
- [ ] 바코드 연동
- [ ] 세금계산서 (외부 API)
