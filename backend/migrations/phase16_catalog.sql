-- ============================================
-- Phase 16: 거래처 카탈로그 시스템
-- 도매 사장님이 거래처에게 상품/재고 공유
-- ============================================

-- 1. shop_profiles 테이블 생성 (공개 카탈로그용 매장 프로필)
CREATE TABLE shop_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 식별자
  slug VARCHAR(50) NOT NULL,                 -- 공개 URL: /s/{slug}

  -- 매장 정보
  display_name VARCHAR(100) NOT NULL,        -- 카탈로그에 표시될 이름
  building VARCHAR(100),                     -- 건물 주소 (예: 청평화 2층)
  description TEXT,                          -- 매장 소개

  -- 연락처 (공개용)
  phone VARCHAR(20),                         -- 공개 전화번호
  kakao_id VARCHAR(50),                      -- 카카오톡 ID

  -- 설정
  is_active BOOLEAN DEFAULT false,           -- 카탈로그 활성화 여부
  show_prices BOOLEAN DEFAULT true,          -- 가격 표시 여부

  -- 카테고리 (기존 products 테이블의 category 값들 활용)
  categories JSONB DEFAULT '["전체"]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT shop_profiles_user_unique UNIQUE(user_id),
  CONSTRAINT shop_profiles_slug_unique UNIQUE(slug)
);

-- 2. 인덱스 생성
CREATE INDEX idx_shop_profiles_slug ON shop_profiles(slug) WHERE is_active = true;
CREATE INDEX idx_shop_profiles_user ON shop_profiles(user_id);

-- 3. RLS 정책
ALTER TABLE shop_profiles ENABLE ROW LEVEL SECURITY;

-- 활성화된 카탈로그는 누구나 조회 가능 (공개)
CREATE POLICY "shop_profiles_public_read" ON shop_profiles
  FOR SELECT USING (is_active = true);

-- 본인 매장은 모든 작업 가능
CREATE POLICY "shop_profiles_owner_all" ON shop_profiles
  FOR ALL USING (auth.uid() = user_id);

-- 4. updated_at 트리거
CREATE TRIGGER trg_shop_profiles_updated
  BEFORE UPDATE ON shop_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. products 테이블 확장
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 6. 공개 상품 조회용 RLS 정책 추가
-- 기존 정책은 유지하고, 공개 조회용 정책만 추가
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (
    is_active = true
    AND is_public = true
    AND EXISTS (
      SELECT 1 FROM shop_profiles sp
      WHERE sp.user_id = products.user_id
      AND sp.is_active = true
    )
  );

-- 7. variants 공개 조회용 RLS 정책 추가
CREATE POLICY "variants_public_read" ON product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN shop_profiles sp ON sp.user_id = p.user_id
      WHERE p.id = product_variants.product_id
      AND p.is_active = true
      AND p.is_public = true
      AND sp.is_active = true
    )
  );

-- 8. 카탈로그용 상품 조회 함수 (성능 최적화)
CREATE OR REPLACE FUNCTION get_catalog_products(p_slug VARCHAR)
RETURNS TABLE (
  id UUID,
  name VARCHAR(200),
  code VARCHAR(50),
  category VARCHAR(50),
  sale_price INTEGER,
  image_url TEXT,
  total_stock BIGINT,
  variant_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- slug로 user_id 조회
  SELECT sp.user_id INTO v_user_id
  FROM shop_profiles sp
  WHERE sp.slug = p_slug
    AND sp.is_active = true;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.code,
    p.category,
    p.sale_price,
    p.image_url,
    COALESCE(SUM(pv.stock), 0)::BIGINT AS total_stock,
    COUNT(pv.id)::BIGINT AS variant_count
  FROM products p
  LEFT JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.user_id = v_user_id
    AND p.is_active = true
    AND p.is_public = true
  GROUP BY p.id, p.name, p.code, p.category, p.sale_price, p.image_url
  ORDER BY p.created_at DESC;
END;
$$;

-- 9. 카탈로그용 상품 상세 조회 함수 (variants 포함)
CREATE OR REPLACE FUNCTION get_catalog_product_detail(p_slug VARCHAR, p_product_id UUID)
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR(200),
  product_code VARCHAR(50),
  product_category VARCHAR(50),
  sale_price INTEGER,
  image_url TEXT,
  variant_id UUID,
  color VARCHAR(50),
  size VARCHAR(20),
  stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- slug로 user_id 조회
  SELECT sp.user_id INTO v_user_id
  FROM shop_profiles sp
  WHERE sp.slug = p_slug
    AND sp.is_active = true;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.code AS product_code,
    p.category AS product_category,
    p.sale_price,
    p.image_url,
    pv.id AS variant_id,
    pv.color,
    pv.size,
    pv.stock
  FROM products p
  LEFT JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.user_id = v_user_id
    AND p.id = p_product_id
    AND p.is_active = true
    AND p.is_public = true
  ORDER BY pv.color, pv.size;
END;
$$;

-- 10. 매장 프로필 조회 함수
CREATE OR REPLACE FUNCTION get_shop_profile(p_slug VARCHAR)
RETURNS TABLE (
  id UUID,
  display_name VARCHAR(100),
  building VARCHAR(100),
  description TEXT,
  phone VARCHAR(20),
  kakao_id VARCHAR(50),
  show_prices BOOLEAN,
  categories JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.display_name,
    sp.building,
    sp.description,
    sp.phone,
    sp.kakao_id,
    sp.show_prices,
    sp.categories
  FROM shop_profiles sp
  WHERE sp.slug = p_slug
    AND sp.is_active = true;
END;
$$;

-- ============================================
-- 완료!
-- ============================================
