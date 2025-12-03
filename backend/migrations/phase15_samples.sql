-- ============================================
-- Phase 15: 샘플 관리 기능
-- 촬영용 상품 대여/반납 관리
-- ============================================

-- 1. ENUM 타입 생성
CREATE TYPE sample_status AS ENUM ('out', 'returned', 'cancelled');

-- 알림 타입에 연체 샘플 추가
ALTER TYPE notification_type ADD VALUE 'overdue_sample';

-- 2. samples 테이블 생성
CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_name VARCHAR(200) NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status sample_status NOT NULL DEFAULT 'out',
  deduct_stock BOOLEAN NOT NULL DEFAULT FALSE,  -- 재고 차감 여부
  out_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- 대여일
  return_due DATE NOT NULL,                      -- 반납 예정일
  returned_at TIMESTAMPTZ,                       -- 실제 반납일
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX idx_samples_user ON samples(user_id, status);
CREATE INDEX idx_samples_customer ON samples(customer_id, status);
CREATE INDEX idx_samples_variant ON samples(variant_id) WHERE status = 'out';
CREATE INDEX idx_samples_return_due ON samples(user_id, return_due) WHERE status = 'out';

-- 4. RLS 정책
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "samples_all" ON samples FOR ALL USING (auth.uid() = user_id);

-- 5. updated_at 트리거
CREATE TRIGGER trg_samples_updated
  BEFORE UPDATE ON samples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. 연체 샘플 조회 함수 (반납 예정일 지난 대여중인 샘플)
CREATE OR REPLACE FUNCTION get_overdue_samples(p_user_id UUID)
RETURNS TABLE (
  sample_id UUID,
  customer_name VARCHAR(200),
  product_name VARCHAR(200),
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER,
  out_date DATE,
  return_due DATE,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sample_id,
    c.name AS customer_name,
    s.product_name,
    s.color,
    s.size,
    s.quantity,
    s.out_date,
    s.return_due,
    (CURRENT_DATE - s.return_due)::INTEGER AS days_overdue
  FROM samples s
  JOIN customers c ON c.id = s.customer_id
  WHERE s.user_id = p_user_id
    AND s.status = 'out'
    AND s.return_due < CURRENT_DATE
  ORDER BY days_overdue DESC;
END;
$$;

-- 7. 알림 카운트 함수 업데이트 (연체 샘플 포함)
-- 반환 타입 변경을 위해 기존 함수 삭제
DROP FUNCTION IF EXISTS get_notification_counts(UUID);

CREATE OR REPLACE FUNCTION get_notification_counts(p_user_id UUID)
RETURNS TABLE (
  overdue_credit_count INTEGER,
  long_pending_backorder_count INTEGER,
  low_stock_count INTEGER,
  out_of_stock_count INTEGER,
  overdue_sample_count INTEGER,
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
  v_overdue_sample INTEGER;
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

  -- 연체 샘플 (해제된 것 제외)
  SELECT COUNT(*) INTO v_overdue_sample
  FROM get_overdue_samples(p_user_id) g
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_dismissals nd
    WHERE nd.user_id = p_user_id
      AND nd.notification_type = 'overdue_sample'
      AND nd.reference_id = g.sample_id
  );

  RETURN QUERY SELECT
    v_overdue,
    v_backorder,
    v_low_stock,
    v_out_of_stock,
    v_overdue_sample,
    (v_overdue + v_backorder + v_low_stock + v_out_of_stock + v_overdue_sample);
END;
$$;

-- 8. 해제 알림 정리 함수 업데이트 (연체 샘플 포함)
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

  -- 반납 완료되거나 취소된 샘플의 해제 기록 삭제
  DELETE FROM notification_dismissals nd
  WHERE nd.user_id = p_user_id
    AND nd.notification_type = 'overdue_sample'
    AND NOT EXISTS (
      SELECT 1 FROM samples s
      WHERE s.id = nd.reference_id
        AND s.status = 'out'
        AND s.return_due < CURRENT_DATE
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  RETURN v_deleted;
END;
$$;

-- ============================================
-- 완료!
-- ============================================
