-- ============================================
-- Phase 8: 알림 시스템 (Notification System)
-- 기존 DB에 추가 실행
-- ============================================

-- ============================================
-- 1. ENUM 타입
-- ============================================

-- 알림 타입
CREATE TYPE notification_type AS ENUM (
  'overdue_credit',          -- 미수금 연체 (7일 이상)
  'long_pending_backorder',  -- 미송 장기 대기 (3일 이상)
  'low_stock',               -- 재고 부족 (5개 이하)
  'out_of_stock'             -- 품절 (0개)
);

-- ============================================
-- 2. 알림 해제 테이블 (Notification Dismissals)
-- ============================================
--
-- 설계 철학:
-- - 알림 조건은 실시간으로 계산 (항상 최신 상태)
-- - 사용자가 "확인/해제"한 알림만 저장
-- - 조건이 해소되면 알림 자동 사라짐
-- - reference_id: 관련 엔티티 ID (customer, backorder, variant)
--

CREATE TABLE notification_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  reference_id UUID NOT NULL,  -- customer_id, backorder_id, or variant_id
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  -- 동일 알림 중복 해제 방지
  UNIQUE(user_id, notification_type, reference_id)
);

-- 인덱스
CREATE INDEX idx_notification_dismissals_user
  ON notification_dismissals(user_id);
CREATE INDEX idx_notification_dismissals_lookup
  ON notification_dismissals(user_id, notification_type);

-- RLS 활성화
ALTER TABLE notification_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "notification_dismissals_all"
  ON notification_dismissals
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 3. 알림 조회 함수들 (Notification Query Functions)
-- ============================================

-- 3-1. 연체 미수금 고객 조회 (7일 이상)
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

-- 3-2. 장기 대기 미송 조회 (3일 이상)
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

-- 3-3. 재고 부족 상품 조회 (5개 이하, 0 제외)
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

-- 3-4. 품절 상품 조회 (재고 0)
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

-- 3-5. 전체 알림 카운트 조회 (해제된 것 제외)
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

-- ============================================
-- 4. 해제된 알림 자동 정리 함수 (선택적)
-- ============================================
-- 조건이 해소된 해제 기록 삭제 (정리용)
-- 주기적으로 실행하거나, 필요시 호출

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
-- 완료!
-- ============================================
