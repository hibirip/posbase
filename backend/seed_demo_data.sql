-- ============================================
-- 데모 계정 및 더미 데이터 시드
-- Supabase SQL Editor에서 실행
-- ============================================
--
-- 주의: 이 스크립트는 test@pos.com 계정에만 데이터를 추가합니다.
-- 기존 계정 데이터는 영향받지 않습니다.
--
-- 실행 전: Supabase Dashboard > Authentication > Users에서
-- test@pos.com / test 계정을 먼저 생성하세요.
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_product_ids UUID[] := ARRAY[]::UUID[];
  v_variant_ids UUID[] := ARRAY[]::UUID[];
  v_customer_ids UUID[] := ARRAY[]::UUID[];
  v_sale_id UUID;
  v_sale_item_id UUID;
  v_product_id UUID;
  v_variant_id UUID;
  v_customer_id UUID;
  v_sale_number VARCHAR(20);
  v_sale_date DATE;
  v_total_amount INTEGER;
  v_paid_amount INTEGER;
  v_credit_amount INTEGER;
  v_payment_method payment_method;
  v_random_qty INTEGER;
  v_unit_price INTEGER;
  v_item_amount INTEGER;
  i INTEGER;
  j INTEGER;
  k INTEGER;
BEGIN
  -- 테스트 유저 ID 찾기
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'test@pos.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '테스트 계정(test@pos.com)을 먼저 생성해주세요.';
  END IF;

  -- 기존 테스트 데이터 삭제 (해당 유저만)
  DELETE FROM returns WHERE user_id = v_user_id;
  DELETE FROM backorders WHERE user_id = v_user_id;
  DELETE FROM payments WHERE user_id = v_user_id;
  DELETE FROM stock_logs WHERE user_id = v_user_id;
  DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = v_user_id);
  DELETE FROM sales WHERE user_id = v_user_id;
  DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE user_id = v_user_id);
  DELETE FROM products WHERE user_id = v_user_id;
  DELETE FROM customers WHERE user_id = v_user_id;
  DELETE FROM notification_dismissals WHERE user_id = v_user_id;

  -- 프로필 업데이트
  UPDATE profiles SET
    shop_name = '동대문 패션몰',
    owner_name = '홍길동',
    phone = '010-1234-5678'
  WHERE id = v_user_id;

  RAISE NOTICE '기존 데이터 삭제 완료, 새 데이터 생성 시작...';

  -- ============================================
  -- 1. 상품 20개 생성
  -- ============================================

  -- 상품 데이터 배열
  DECLARE
    product_names TEXT[] := ARRAY[
      '오버핏 후드티', '슬림핏 청바지', '롱 패딩', '니트 가디건', '면 티셔츠',
      '린넨 셔츠', '와이드 슬랙스', '미니 스커트', '롱 원피스', '데님 자켓',
      '트렌치 코트', '플리스 집업', '조거 팬츠', '크롭 맨투맨', '체크 셔츠',
      '울 코트', '레깅스', '블라우스', '반팔 폴로', '캐시미어 니트'
    ];
    categories TEXT[] := ARRAY[
      '상의', '하의', '아우터', '상의', '상의',
      '상의', '하의', '하의', '원피스', '아우터',
      '아우터', '아우터', '하의', '상의', '상의',
      '아우터', '하의', '상의', '상의', '상의'
    ];
    cost_prices INTEGER[] := ARRAY[
      15000, 20000, 45000, 18000, 8000,
      12000, 22000, 15000, 25000, 30000,
      50000, 25000, 18000, 16000, 14000,
      80000, 10000, 20000, 12000, 40000
    ];
    sale_prices INTEGER[] := ARRAY[
      29000, 39000, 89000, 35000, 15000,
      25000, 45000, 29000, 49000, 59000,
      99000, 49000, 35000, 32000, 28000,
      159000, 19000, 39000, 25000, 79000
    ];
    colors TEXT[] := ARRAY['블랙', '화이트', '네이비', '그레이', '베이지', '카키', '브라운'];
    sizes TEXT[] := ARRAY['S', 'M', 'L', 'XL'];
  BEGIN
    FOR i IN 1..20 LOOP
      v_product_id := gen_random_uuid();
      v_product_ids := array_append(v_product_ids, v_product_id);

      INSERT INTO products (id, user_id, code, name, category, cost_price, sale_price, is_active)
      VALUES (
        v_product_id,
        v_user_id,
        'P' || LPAD(i::TEXT, 3, '0'),
        product_names[i],
        categories[i],
        cost_prices[i],
        sale_prices[i],
        true
      );

      -- 각 상품당 2-4개 옵션 생성
      FOR j IN 1..((i % 3) + 2) LOOP
        FOR k IN 1..((i % 2) + 2) LOOP
          v_variant_id := gen_random_uuid();
          v_variant_ids := array_append(v_variant_ids, v_variant_id);

          INSERT INTO product_variants (id, product_id, color, size, stock)
          VALUES (
            v_variant_id,
            v_product_id,
            colors[((i + j - 1) % 7) + 1],
            sizes[((i + k - 1) % 4) + 1],
            (RANDOM() * 20 + 5)::INTEGER  -- 5~25개 재고
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END;

  RAISE NOTICE '상품 20개 생성 완료';

  -- ============================================
  -- 2. 거래처 10개 생성
  -- ============================================

  DECLARE
    customer_names TEXT[] := ARRAY[
      '명동패션', '강남스타일', '홍대마켓', '신촌부티크', '이대의류',
      '압구정샵', '청담몰', '가로수길옷장', '성수스토어', '건대패션'
    ];
    contact_names TEXT[] := ARRAY[
      '김영희', '이철수', '박민지', '최준호', '정수연',
      '강민수', '윤서영', '임동훈', '한지원', '오승민'
    ];
    phones TEXT[] := ARRAY[
      '010-1111-1111', '010-2222-2222', '010-3333-3333', '010-4444-4444', '010-5555-5555',
      '010-6666-6666', '010-7777-7777', '010-8888-8888', '010-9999-9999', '010-0000-0000'
    ];
  BEGIN
    FOR i IN 1..10 LOOP
      v_customer_id := gen_random_uuid();
      v_customer_ids := array_append(v_customer_ids, v_customer_id);

      INSERT INTO customers (id, user_id, name, contact_name, phone, balance, is_active)
      VALUES (
        v_customer_id,
        v_user_id,
        customer_names[i],
        contact_names[i],
        phones[i],
        0,  -- 초기 잔액 0
        true
      );
    END LOOP;
  END;

  RAISE NOTICE '거래처 10개 생성 완료';

  -- ============================================
  -- 3. 최근 30일 판매 50건 생성
  -- ============================================
  -- 임시 테이블로 판매 항목 저장 후 일괄 삽입

  CREATE TEMP TABLE temp_sale_items (
    id UUID,
    sale_id UUID,
    product_id UUID,
    variant_id UUID,
    product_name VARCHAR(200),
    color VARCHAR(50),
    size VARCHAR(20),
    quantity INTEGER,
    unit_price INTEGER,
    amount INTEGER
  ) ON COMMIT DROP;

  FOR i IN 1..50 LOOP
    -- 랜덤 날짜 (최근 30일)
    v_sale_date := CURRENT_DATE - (RANDOM() * 29)::INTEGER;

    -- 판매번호 생성
    SELECT COUNT(*) + 1 INTO j FROM sales
    WHERE user_id = v_user_id AND sale_date = v_sale_date;
    v_sale_number := TO_CHAR(v_sale_date, 'YYYYMMDD') || '-' || LPAD(j::TEXT, 3, '0');

    -- 거래처 선택 (80%는 거래처, 20%는 일반고객)
    IF RANDOM() < 0.8 THEN
      v_customer_id := v_customer_ids[((RANDOM() * 9)::INTEGER) + 1];
    ELSE
      v_customer_id := NULL;
    END IF;

    -- 결제 방식 결정
    IF RANDOM() < 0.3 AND v_customer_id IS NOT NULL THEN
      v_payment_method := 'credit';  -- 30% 외상
    ELSIF RANDOM() < 0.5 THEN
      v_payment_method := 'cash';
    ELSIF RANDOM() < 0.7 THEN
      v_payment_method := 'card';
    ELSE
      v_payment_method := 'transfer';
    END IF;

    v_sale_id := gen_random_uuid();
    v_total_amount := 0;

    -- 임시 테이블 초기화
    DELETE FROM temp_sale_items;

    -- 판매 항목 1~4개 (임시 테이블에 저장)
    FOR j IN 1..((RANDOM() * 3)::INTEGER + 1) LOOP
      -- 랜덤 상품/옵션 선택
      v_variant_id := v_variant_ids[((RANDOM() * (array_length(v_variant_ids, 1) - 1))::INTEGER) + 1];

      SELECT pv.id, p.id, p.sale_price INTO v_variant_id, v_product_id, v_unit_price
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id;

      v_random_qty := (RANDOM() * 4 + 1)::INTEGER;  -- 1~5개
      v_item_amount := v_unit_price * v_random_qty;
      v_total_amount := v_total_amount + v_item_amount;
      v_sale_item_id := gen_random_uuid();

      -- 임시 테이블에 저장
      INSERT INTO temp_sale_items (id, sale_id, product_id, variant_id, product_name, color, size, quantity, unit_price, amount)
      SELECT
        v_sale_item_id,
        v_sale_id,
        p.id,
        pv.id,
        p.name,
        pv.color,
        pv.size,
        v_random_qty,
        v_unit_price,
        v_item_amount
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id;
    END LOOP;

    -- 할인 적용 (20% 확률로 5~15% 할인)
    DECLARE
      v_discount INTEGER := 0;
      v_final_amount INTEGER;
    BEGIN
      IF RANDOM() < 0.2 THEN
        v_discount := (v_total_amount * (RANDOM() * 0.1 + 0.05))::INTEGER;
      END IF;
      v_final_amount := v_total_amount - v_discount;

      -- 외상 금액 계산
      IF v_payment_method = 'credit' THEN
        v_paid_amount := 0;
        v_credit_amount := v_final_amount;
      ELSE
        v_paid_amount := v_final_amount;
        v_credit_amount := 0;
      END IF;

      -- 1. 판매 레코드 먼저 생성 (FK 제약조건 충족)
      INSERT INTO sales (id, user_id, customer_id, sale_number, sale_date, total_amount, discount_amount, final_amount, payment_method, paid_amount, credit_amount, status)
      VALUES (
        v_sale_id,
        v_user_id,
        v_customer_id,
        v_sale_number,
        v_sale_date,
        v_total_amount,
        v_discount,
        v_final_amount,
        v_payment_method,
        v_paid_amount,
        v_credit_amount,
        'completed'
      );

      -- 2. 판매 항목 삽입 (sales 레코드 존재 후)
      INSERT INTO sale_items (id, sale_id, product_id, variant_id, product_name, color, size, quantity, unit_price, amount)
      SELECT id, sale_id, product_id, variant_id, product_name, color, size, quantity, unit_price, amount
      FROM temp_sale_items;

      -- 3. 재고 차감
      UPDATE product_variants pv
      SET stock = GREATEST(0, pv.stock - t.quantity)
      FROM temp_sale_items t
      WHERE pv.id = t.variant_id;

      -- 외상이면 거래처 잔액 증가
      IF v_credit_amount > 0 AND v_customer_id IS NOT NULL THEN
        UPDATE customers SET balance = balance + v_credit_amount WHERE id = v_customer_id;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE '판매 50건 생성 완료';

  -- ============================================
  -- 4. 미송 5건 생성
  -- ============================================

  FOR i IN 1..5 LOOP
    -- 랜덤 판매에서 미송 생성
    SELECT s.id, si.id, s.customer_id, si.variant_id, si.product_name, si.color, si.size
    INTO v_sale_id, v_sale_item_id, v_customer_id, v_variant_id
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    WHERE s.user_id = v_user_id
      AND s.customer_id IS NOT NULL
      AND si.variant_id IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      INSERT INTO backorders (user_id, sale_id, sale_item_id, customer_id, variant_id, product_name, color, size, quantity, status, created_at)
      SELECT
        v_user_id,
        v_sale_id,
        v_sale_item_id,
        v_customer_id,
        si.variant_id,
        si.product_name,
        si.color,
        si.size,
        (RANDOM() * 3 + 1)::INTEGER,
        (CASE WHEN i <= 3 THEN 'pending' ELSE 'completed' END)::backorder_status,
        CURRENT_DATE - (RANDOM() * 10)::INTEGER  -- 0~10일 전
      FROM sale_items si WHERE si.id = v_sale_item_id;
    END IF;
  END LOOP;

  RAISE NOTICE '미송 5건 생성 완료';

  -- ============================================
  -- 5. 반품 3건 생성
  -- ============================================

  FOR i IN 1..3 LOOP
    SELECT s.id, si.id, s.customer_id, si.variant_id
    INTO v_sale_id, v_sale_item_id, v_customer_id, v_variant_id
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    WHERE s.user_id = v_user_id
      AND s.status = 'completed'
    ORDER BY RANDOM()
    LIMIT 1;

    DECLARE
      v_return_qty INTEGER := 1;
      v_return_number VARCHAR(20);
      v_return_date DATE := CURRENT_DATE - (RANDOM() * 7)::INTEGER;
    BEGIN
      SELECT COUNT(*) + 1 INTO j FROM returns WHERE user_id = v_user_id AND return_date = v_return_date;
      v_return_number := 'R' || TO_CHAR(v_return_date, 'YYYYMMDD') || '-' || LPAD(j::TEXT, 3, '0');

      INSERT INTO returns (user_id, sale_id, sale_item_id, customer_id, variant_id, product_name, color, size, return_number, return_date, quantity, unit_price, refund_amount, reason, status)
      SELECT
        v_user_id,
        v_sale_id,
        v_sale_item_id,
        v_customer_id,
        si.variant_id,
        si.product_name,
        si.color,
        si.size,
        v_return_number,
        v_return_date,
        v_return_qty,
        si.unit_price,
        si.unit_price * v_return_qty,
        CASE i
          WHEN 1 THEN '사이즈 교환'
          WHEN 2 THEN '불량'
          ELSE '단순 변심'
        END,
        (CASE WHEN i = 1 THEN 'pending' ELSE 'completed' END)::return_status
      FROM sale_items si WHERE si.id = v_sale_item_id;
    END;
  END LOOP;

  RAISE NOTICE '반품 3건 생성 완료';

  -- ============================================
  -- 6. 입금 내역 생성 (외상 일부 수금)
  -- ============================================

  -- 외상 거래처 중 일부에 입금 처리
  FOR i IN 1..3 LOOP
    SELECT id, balance INTO v_customer_id, v_paid_amount
    FROM customers
    WHERE user_id = v_user_id AND balance > 0
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_customer_id IS NOT NULL AND v_paid_amount > 0 THEN
      DECLARE
        v_payment_amount INTEGER := (v_paid_amount * (RANDOM() * 0.5 + 0.3))::INTEGER;  -- 30~80% 입금
      BEGIN
        INSERT INTO payments (user_id, customer_id, type, amount, method, payment_date, memo)
        VALUES (
          v_user_id,
          v_customer_id,
          'income'::payment_type,
          v_payment_amount,
          (CASE WHEN RANDOM() < 0.5 THEN 'cash' ELSE 'transfer' END)::payment_method,
          CURRENT_DATE - (RANDOM() * 7)::INTEGER,
          '외상 수금'
        );

        UPDATE customers SET balance = balance - v_payment_amount WHERE id = v_customer_id;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE '입금 내역 생성 완료';

  -- ============================================
  -- 7. 재고 일부 품절/부족 설정 (알림 테스트용)
  -- ============================================

  -- 3개 품절
  UPDATE product_variants SET stock = 0
  WHERE id IN (
    SELECT pv.id FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE p.user_id = v_user_id
    ORDER BY RANDOM()
    LIMIT 3
  );

  -- 5개 재고 부족 (1~5개)
  UPDATE product_variants SET stock = (RANDOM() * 4 + 1)::INTEGER
  WHERE id IN (
    SELECT pv.id FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE p.user_id = v_user_id AND pv.stock > 5
    ORDER BY RANDOM()
    LIMIT 5
  );

  RAISE NOTICE '재고 조정 완료';
  RAISE NOTICE '============================================';
  RAISE NOTICE '데모 데이터 생성 완료!';
  RAISE NOTICE '- 상품: 20개 (옵션 포함)';
  RAISE NOTICE '- 거래처: 10개';
  RAISE NOTICE '- 판매: 50건';
  RAISE NOTICE '- 미송: 5건';
  RAISE NOTICE '- 반품: 3건';
  RAISE NOTICE '- 품절/재고부족 상품 포함';
  RAISE NOTICE '============================================';

END $$;
