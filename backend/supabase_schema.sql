-- ============================================
-- DOMPOS Database Schema
-- 2025년 12월 기준 | Supabase PostgreSQL
-- ============================================
-- 
-- 실행 순서:
-- 1. Supabase Dashboard > SQL Editor
-- 2. 이 파일 전체 복사 > 붙여넣기 > Run
--
-- ============================================

-- ============================================
-- 0. 기존 객체 삭제 (재실행 시)
-- ============================================

-- 테이블 삭제 (CASCADE로 트리거/인덱스 자동 삭제)
DROP TABLE IF EXISTS notification_dismissals CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS stock_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- auth.users 트리거 삭제 (테이블은 삭제하지 않음)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 함수 삭제
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS generate_sale_number(UUID, DATE);
DROP FUNCTION IF EXISTS generate_return_number(UUID, DATE);
DROP FUNCTION IF EXISTS update_balance_on_sale();
DROP FUNCTION IF EXISTS update_balance_on_payment();
DROP FUNCTION IF EXISTS update_stock_on_sale_item();
DROP FUNCTION IF EXISTS process_return_completion();
DROP FUNCTION IF EXISTS get_overdue_credit_customers(UUID);
DROP FUNCTION IF EXISTS get_long_pending_backorders(UUID);
DROP FUNCTION IF EXISTS get_low_stock_variants(UUID);
DROP FUNCTION IF EXISTS get_out_of_stock_variants(UUID);
DROP FUNCTION IF EXISTS get_notification_counts(UUID);
DROP FUNCTION IF EXISTS cleanup_resolved_dismissals(UUID);

-- ENUM 타입 삭제
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS return_status CASCADE;
DROP TYPE IF EXISTS backorder_status CASCADE;
DROP TYPE IF EXISTS stock_change_type CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS sale_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;

-- ============================================
-- 1. ENUM 타입 생성
-- ============================================

CREATE TYPE payment_method AS ENUM ('cash', 'credit', 'card', 'transfer', 'mixed');
CREATE TYPE sale_status AS ENUM ('completed', 'cancelled', 'pending');
CREATE TYPE payment_type AS ENUM ('income', 'refund');
CREATE TYPE stock_change_type AS ENUM ('sale', 'return', 'incoming', 'adjustment', 'cancel');
CREATE TYPE backorder_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE return_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('overdue_credit', 'long_pending_backorder', 'low_stock', 'out_of_stock');

-- ============================================
-- 2. 테이블 생성
-- ============================================

-- 사용자/매장 프로필
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name VARCHAR(100) NOT NULL,
  owner_name VARCHAR(50),
  phone VARCHAR(20),
  business_number VARCHAR(20),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상품
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  cost_price INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상품 옵션 (칼라/사이즈)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color VARCHAR(50) NOT NULL,
  size VARCHAR(20) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  barcode VARCHAR(100),
  sku VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, color, size)
);

-- 거래처
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(50),
  phone VARCHAR(20),
  address TEXT,
  email VARCHAR(100),
  memo TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 판매
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_number VARCHAR(20) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  final_amount INTEGER NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  credit_amount INTEGER NOT NULL DEFAULT 0,
  status sale_status DEFAULT 'completed',
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_amounts CHECK (final_amount = total_amount - discount_amount),
  CONSTRAINT valid_payment CHECK (paid_amount + credit_amount = final_amount)
);

-- 판매 상세
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 입금/결제 기록
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  type payment_type NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재고 변동 로그
CREATE TABLE stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  change_type stock_change_type NOT NULL,
  quantity INTEGER NOT NULL,
  before_stock INTEGER NOT NULL,
  after_stock INTEGER NOT NULL,
  reference_id UUID,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 미송 (재고 부족으로 나중에 보내기로 한 상품)
CREATE TABLE backorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_name VARCHAR(200) NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status backorder_status NOT NULL DEFAULT 'pending',
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 반품
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  return_number VARCHAR(20) NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  refund_amount INTEGER NOT NULL,
  reason VARCHAR(255),
  memo TEXT,
  status return_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 해제 기록 (읽음 처리된 알림)
CREATE TABLE notification_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  reference_id UUID NOT NULL,  -- customer_id, backorder_id, or variant_id
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type, reference_id)
);

-- ============================================
-- 3. 인덱스 생성
-- ============================================

-- products
CREATE INDEX idx_products_user ON products(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_search ON products(user_id, name) WHERE is_active = TRUE;
CREATE INDEX idx_products_code ON products(user_id, code) WHERE code IS NOT NULL;

-- product_variants
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_variants_low_stock ON product_variants(product_id, stock) WHERE stock <= 5;

-- customers
CREATE INDEX idx_customers_user ON customers(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_customers_search ON customers(user_id, name) WHERE is_active = TRUE;
CREATE INDEX idx_customers_balance ON customers(user_id, balance) WHERE balance > 0;

-- sales
CREATE INDEX idx_sales_user_date ON sales(user_id, sale_date DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_number ON sales(user_id, sale_number);
CREATE INDEX idx_sales_status ON sales(user_id, status) WHERE status != 'completed';

-- sale_items
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_variant ON sale_items(variant_id) WHERE variant_id IS NOT NULL;

-- payments
CREATE INDEX idx_payments_user_date ON payments(user_id, payment_date DESC);
CREATE INDEX idx_payments_customer ON payments(customer_id);

-- stock_logs
CREATE INDEX idx_stock_logs_variant ON stock_logs(variant_id, created_at DESC);
CREATE INDEX idx_stock_logs_date ON stock_logs(user_id, created_at DESC);

-- backorders
CREATE INDEX idx_backorders_user ON backorders(user_id, status) WHERE status = 'pending';
CREATE INDEX idx_backorders_customer ON backorders(customer_id, status);
CREATE INDEX idx_backorders_sale ON backorders(sale_id);
CREATE INDEX idx_backorders_variant ON backorders(variant_id) WHERE status = 'pending';

-- returns
CREATE INDEX idx_returns_user ON returns(user_id, status);
CREATE INDEX idx_returns_sale ON returns(sale_id);
CREATE INDEX idx_returns_customer ON returns(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_returns_date ON returns(user_id, return_date DESC);

-- notification_dismissals
CREATE INDEX idx_notification_dismissals_user ON notification_dismissals(user_id);
CREATE INDEX idx_notification_dismissals_lookup ON notification_dismissals(user_id, notification_type);

-- ============================================
-- 4. RLS (Row Level Security) 정책
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_dismissals ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- products
CREATE POLICY "products_all" ON products FOR ALL USING (auth.uid() = user_id);

-- product_variants (products 통해 권한 확인)
CREATE POLICY "variants_all" ON product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.user_id = auth.uid())
);

-- customers
CREATE POLICY "customers_all" ON customers FOR ALL USING (auth.uid() = user_id);

-- sales
CREATE POLICY "sales_all" ON sales FOR ALL USING (auth.uid() = user_id);

-- sale_items (sales 통해 권한 확인)
CREATE POLICY "sale_items_all" ON sale_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
);

-- payments
CREATE POLICY "payments_all" ON payments FOR ALL USING (auth.uid() = user_id);

-- stock_logs
CREATE POLICY "stock_logs_all" ON stock_logs FOR ALL USING (auth.uid() = user_id);

-- backorders
CREATE POLICY "backorders_all" ON backorders FOR ALL USING (auth.uid() = user_id);

-- returns
CREATE POLICY "returns_all" ON returns FOR ALL USING (auth.uid() = user_id);

-- notification_dismissals
CREATE POLICY "notification_dismissals_all" ON notification_dismissals FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. 함수 (Functions)
-- ============================================

-- 판매번호 자동생성
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

-- 반품번호 자동생성
CREATE OR REPLACE FUNCTION generate_return_number(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM returns
  WHERE user_id = p_user_id
    AND return_date = p_date;

  RETURN 'R' || TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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

-- 판매 시 재고 차감
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

  SELECT user_id INTO v_user_id FROM sales WHERE id = NEW.sale_id;
  SELECT stock INTO v_before FROM product_variants WHERE id = NEW.variant_id;
  
  UPDATE product_variants 
  SET stock = stock - NEW.quantity
  WHERE id = NEW.variant_id
  RETURNING stock INTO v_after;
  
  INSERT INTO stock_logs (user_id, variant_id, change_type, quantity, before_stock, after_stock, reference_id)
  VALUES (v_user_id, NEW.variant_id, 'sale', -NEW.quantity, v_before, v_after, NEW.sale_id);
  
  RETURN NEW;
END;
$$;

-- 회원가입 시 프로필 자동 생성
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

-- 반품 완료 시 재고 복원 및 외상 조정
CREATE OR REPLACE FUNCTION process_return_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_before INTEGER;
  v_after INTEGER;
  v_sale_credit INTEGER;
BEGIN
  -- 상태가 completed로 변경될 때만 처리
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- 1. 재고 복원
    IF NEW.variant_id IS NOT NULL THEN
      SELECT stock INTO v_before FROM product_variants WHERE id = NEW.variant_id;

      UPDATE product_variants
      SET stock = stock + NEW.quantity
      WHERE id = NEW.variant_id
      RETURNING stock INTO v_after;

      -- stock_logs 기록
      INSERT INTO stock_logs (user_id, variant_id, change_type, quantity, before_stock, after_stock, reference_id, memo)
      VALUES (NEW.user_id, NEW.variant_id, 'return', NEW.quantity, v_before, v_after, NEW.id, '반품: ' || NEW.return_number);
    END IF;

    -- 2. 외상 조정 (거래처가 있고 원래 외상 판매였던 경우)
    IF NEW.customer_id IS NOT NULL THEN
      SELECT credit_amount INTO v_sale_credit FROM sales WHERE id = NEW.sale_id;
      IF v_sale_credit > 0 THEN
        UPDATE customers
        SET balance = balance - NEW.refund_amount
        WHERE id = NEW.customer_id;
      END IF;
    END IF;

    -- 3. completed_at 설정
    NEW.completed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 5-1. 알림 조회 함수들 (Notification Functions)
-- ============================================

-- 연체 미수금 고객 조회 (7일 이상)
CREATE OR REPLACE FUNCTION get_overdue_credit_customers(p_user_id UUID)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR(200),
  balance INTEGER,
  oldest_credit_date DATE,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.balance,
    MIN(s.sale_date)::DATE AS oldest_credit_date,
    (CURRENT_DATE - MIN(s.sale_date)::DATE)::INTEGER AS days_overdue
  FROM customers c
  JOIN sales s ON s.customer_id = c.id
    AND s.credit_amount > 0
    AND s.status = 'completed'
  WHERE c.user_id = p_user_id
    AND c.balance > 0
    AND c.is_active = true
  GROUP BY c.id, c.name, c.balance
  HAVING (CURRENT_DATE - MIN(s.sale_date)::DATE) >= 7
  ORDER BY days_overdue DESC;
END;
$$;

-- 장기 대기 미송 조회 (3일 이상)
CREATE OR REPLACE FUNCTION get_long_pending_backorders(p_user_id UUID)
RETURNS TABLE (
  backorder_id UUID,
  customer_name VARCHAR(200),
  product_name VARCHAR(200),
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER,
  created_date DATE,
  days_pending INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS backorder_id,
    c.name AS customer_name,
    b.product_name,
    b.color,
    b.size,
    b.quantity,
    b.created_at::DATE AS created_date,
    (CURRENT_DATE - b.created_at::DATE)::INTEGER AS days_pending
  FROM backorders b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.user_id = p_user_id
    AND b.status = 'pending'
    AND (CURRENT_DATE - b.created_at::DATE) >= 3
  ORDER BY days_pending DESC;
END;
$$;

-- 재고 부족 상품 조회 (5개 이하, 0 제외)
CREATE OR REPLACE FUNCTION get_low_stock_variants(p_user_id UUID)
RETURNS TABLE (
  variant_id UUID,
  product_id UUID,
  product_name VARCHAR(200),
  color VARCHAR(50),
  size VARCHAR(20),
  stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.id AS variant_id,
    p.id AS product_id,
    p.name AS product_name,
    pv.color,
    pv.size,
    pv.stock
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.user_id = p_user_id
    AND p.is_active = true
    AND pv.stock > 0
    AND pv.stock <= 5
  ORDER BY pv.stock ASC, p.name ASC;
END;
$$;

-- 품절 상품 조회 (재고 0)
CREATE OR REPLACE FUNCTION get_out_of_stock_variants(p_user_id UUID)
RETURNS TABLE (
  variant_id UUID,
  product_id UUID,
  product_name VARCHAR(200),
  color VARCHAR(50),
  size VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.id AS variant_id,
    p.id AS product_id,
    p.name AS product_name,
    pv.color,
    pv.size
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.user_id = p_user_id
    AND p.is_active = true
    AND pv.stock = 0
  ORDER BY p.name ASC;
END;
$$;

-- 전체 알림 카운트 조회 (해제된 것 제외)
CREATE OR REPLACE FUNCTION get_notification_counts(p_user_id UUID)
RETURNS TABLE (
  overdue_credit_count INTEGER,
  long_pending_backorder_count INTEGER,
  low_stock_count INTEGER,
  out_of_stock_count INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_overdue INTEGER;
  v_backorder INTEGER;
  v_low_stock INTEGER;
  v_out_of_stock INTEGER;
BEGIN
  -- 연체 미수금 (해제된 것 제외)
  SELECT COUNT(*) INTO v_overdue
  FROM get_overdue_credit_customers(p_user_id) g
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_dismissals nd
    WHERE nd.user_id = p_user_id
      AND nd.notification_type = 'overdue_credit'
      AND nd.reference_id = g.customer_id
  );

  -- 장기 대기 미송 (해제된 것 제외)
  SELECT COUNT(*) INTO v_backorder
  FROM get_long_pending_backorders(p_user_id) g
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_dismissals nd
    WHERE nd.user_id = p_user_id
      AND nd.notification_type = 'long_pending_backorder'
      AND nd.reference_id = g.backorder_id
  );

  -- 재고 부족 (해제된 것 제외)
  SELECT COUNT(*) INTO v_low_stock
  FROM get_low_stock_variants(p_user_id) g
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_dismissals nd
    WHERE nd.user_id = p_user_id
      AND nd.notification_type = 'low_stock'
      AND nd.reference_id = g.variant_id
  );

  -- 품절 (해제된 것 제외)
  SELECT COUNT(*) INTO v_out_of_stock
  FROM get_out_of_stock_variants(p_user_id) g
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_dismissals nd
    WHERE nd.user_id = p_user_id
      AND nd.notification_type = 'out_of_stock'
      AND nd.reference_id = g.variant_id
  );

  RETURN QUERY SELECT
    v_overdue,
    v_backorder,
    v_low_stock,
    v_out_of_stock,
    (v_overdue + v_backorder + v_low_stock + v_out_of_stock);
END;
$$;

-- 해제된 알림 정리 함수 (조건이 해소된 것 삭제)
CREATE OR REPLACE FUNCTION cleanup_resolved_dismissals(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_count INTEGER;
BEGIN
  -- 외상이 해소된 고객의 해제 기록 삭제
  DELETE FROM notification_dismissals nd
  WHERE nd.user_id = p_user_id
    AND nd.notification_type = 'overdue_credit'
    AND NOT EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = nd.reference_id
        AND c.balance > 0
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  -- 완료/취소된 미송의 해제 기록 삭제
  DELETE FROM notification_dismissals nd
  WHERE nd.user_id = p_user_id
    AND nd.notification_type = 'long_pending_backorder'
    AND NOT EXISTS (
      SELECT 1 FROM backorders b
      WHERE b.id = nd.reference_id
        AND b.status = 'pending'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  -- 재고가 충분해진 상품의 해제 기록 삭제
  DELETE FROM notification_dismissals nd
  WHERE nd.user_id = p_user_id
    AND nd.notification_type IN ('low_stock', 'out_of_stock')
    AND NOT EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = nd.reference_id
        AND p.is_active = true
        AND pv.stock <= 5
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  RETURN v_deleted;
END;
$$;

-- ============================================
-- 6. 트리거 (Triggers)
-- ============================================

-- updated_at 트리거
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_backorders_updated BEFORE UPDATE ON backorders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 비즈니스 로직 트리거
CREATE TRIGGER trg_sale_balance AFTER INSERT ON sales FOR EACH ROW EXECUTE FUNCTION update_balance_on_sale();
CREATE TRIGGER trg_payment_balance AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION update_balance_on_payment();
CREATE TRIGGER trg_sale_item_stock AFTER INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale_item();
CREATE TRIGGER trg_return_completion BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION process_return_completion();

-- 회원가입 트리거
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 완료!
-- ============================================

-- 테스트: 아래 쿼리로 테이블 확인
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
