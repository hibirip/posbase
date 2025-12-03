# POSBASE 거래처 카탈로그 시스템 구현

## 📋 프로젝트 개요

POSBASE(동대문 의류 도매 POS 시스템)에 **거래처용 카탈로그 공유 기능**을 추가합니다.
도매 사장님이 링크 하나로 거래처에게 실시간 재고/상품을 공유하고, 거래처는 카탈로그에서 직접 주문서를 작성해 카카오톡으로 전송할 수 있습니다.

## 🎯 핵심 목표

1. **도매 사장님**: 거래처에게 공유할 수 있는 고유 링크 생성
2. **거래처(소매상)**: 링크 접속 → 상품 탐색 → 장바구니 담기 → 카톡 주문
3. **문화 유지**: 기존 카톡 주문 방식 그대로, 주문서 작성만 편하게

---

## 🔍 작업 전 필수 확인

1. 기존 POSBASE 프로젝트 구조 파악
2. 현재 구현된 스키마 확인 (products, variants, customers 등)
3. 상품 이미지 저장 방식 확인 (Supabase Storage 사용 여부)
4. 기존 인증/라우팅 구조 파악

---

## 📱 UI/UX 요구사항

### 디자인 컨셉
- **핀터레스트/29CM 스타일**: 사진 중심, 텍스트 최소화
- **모바일 퍼스트**: 거래처는 99% 스마트폰으로 접속
- **빠른 주문 플로우**: 탐색 → 탭 → 담기 → 전송 (최소 터치)

### 메인 카탈로그 페이지
```
URL: /s/{shop_slug} (예: posbase.app/s/mimi-fashion)

┌─────────────────────────────────┐
│  🏪 미미패션                     │
│  청평화 2층                      │
│  [📞 전화] [💬 카톡]             │
├─────────────────────────────────┤
│  🔍 검색...                      │
├─────────────────────────────────┤
│  [전체] [아우터] [상의] [하의]    │  ← 가로 스크롤 탭
├─────────────────────────────────┤
│  ┌───────┐ ┌───────┐            │
│  │  📷   │ │  📷   │            │  ← 사진 크게 (Masonry Grid)
│  │       │ │       │            │
│  │───────│ │───────│            │
│  │ 상품명 │ │ 상품명 │            │
│  │₩13,500│ │ ₩품절 │ ← 흐리게   │
│  └───────┘ └───────┘            │
│                                 │
│  ... 무한스크롤 ...              │
│                                 │
├─────────────────────────────────┤
│  🛒 장바구니 (3)       99,500원  │  ← 플로팅
└─────────────────────────────────┘
```

### 상품 상세 (바텀시트)
```
상품 탭 시 바텀시트로 올라옴

┌─────────────────────────────────┐
│ 무지집업                      X │
│ ₩13,500                        │
├─────────────────────────────────┤
│ [컬러/사이즈 매트릭스]          │
│                                 │
│         S      M      L         │
│  검정  [-][5][+] [-][3][+] 품절  │  ← 재고 있으면 바로 수량 입력
│  카키  [-][0][+] [-][0][+] [-][0][+] │
│  흰색   품절     품절    [-][0][+] │
│                                 │
├─────────────────────────────────┤
│ 💬 품절 상품 미송 문의          │  ← 접히는 섹션
│  ┌─────────────────────────────┐│
│  │ 흰색 S [    ] 개            ││
│  │ 흰색 M [    ] 개            ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│        [장바구니 담기]          │
└─────────────────────────────────┘
```

**핵심 포인트:**
- 도매는 "검정M 5개 + 카키L 3개" 한번에 담음
- 소매몰처럼 컬러→사이즈 순차 선택 ❌
- **매트릭스 형태**로 한 눈에 보고 여러 조합 동시 선택 ✅
- 품절 상품은 "미송 문의"로 수량만 적어서 같이 보냄

### 장바구니/주문서
```
┌─────────────────────────────────┐
│ 주문서                        X │
├─────────────────────────────────┤
│ 🛒 주문 상품                    │
│ ┌─────────────────────────────┐ │
│ │ 무지집업 검정 M x 5  65,000 │ │
│ │ 와이드팬츠 베이지 66 x 3    │ │
│ │                     34,500 │ │
│ └─────────────────────────────┘ │
│                                 │
│ 📋 미송 문의                    │
│ ┌─────────────────────────────┐ │
│ │ 무지집업 흰색 L x 3개 문의  │ │
│ │ 곰돌이자켓 검정 M x 2개 문의│ │
│ └─────────────────────────────┘ │
│                                 │
│ ─────────────────────────────── │
│ 주문 합계: 99,500원             │
├─────────────────────────────────┤
│     [📱 카카오톡으로 주문]      │
└─────────────────────────────────┘
```

### 카카오톡 메시지 생성
```
[주문요청] 홍길동상회

🛒 주문
• 무지집업 검정 M x 5
• 와이드팬츠 베이지 66 x 3
합계: 99,500원

📋 미송 문의
• 무지집업 흰색 L x 3개 가능할까요?
• 곰돌이자켓 검정 M x 2개 가능할까요?

확인 부탁드립니다 🙏
```

---

## 🗄️ 데이터베이스 스키마

### 신규 테이블

```sql
-- 매장 공개 프로필 (카탈로그용)
CREATE TABLE shop_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  shop_name VARCHAR(100) NOT NULL,        -- 매장명
  slug VARCHAR(50) UNIQUE NOT NULL,       -- URL용 (mimi-fashion)
  building VARCHAR(100),                  -- 건물 (청평화 2층)
  description TEXT,                       -- 매장 소개
  
  -- 연락처
  phone VARCHAR(20),
  kakao_id VARCHAR(50),                   -- 카카오톡 ID
  
  -- 설정
  is_active BOOLEAN DEFAULT true,         -- 카탈로그 공개 여부
  show_price BOOLEAN DEFAULT true,        -- 가격 공개 여부
  show_stock BOOLEAN DEFAULT false,       -- 재고 수량 공개 여부 (품절만 vs 숫자)
  
  -- 카테고리 설정 (JSON)
  categories JSONB DEFAULT '["전체"]',    -- ["전체", "아우터", "상의", "하의"]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)  -- 1 user = 1 shop
);

-- 상품 이미지 (기존 products/variants에 추가 또는 별도 테이블)
-- 기존 구조 확인 후 결정

-- 상품 카테고리 매핑 (기존 구조 확인 후)
-- products 테이블에 category 컬럼 추가 또는 별도 테이블
```

### 기존 테이블 수정 (확인 필요)

```sql
-- products 테이블에 추가 (없다면)
ALTER TABLE products ADD COLUMN IF NOT EXISTS 
  image_url TEXT,                         -- 대표 이미지
  category VARCHAR(50),                   -- 카테고리
  is_public BOOLEAN DEFAULT true;         -- 카탈로그 공개 여부

-- variants 테이블 (재고 조회용 - 기존 구조 활용)
-- color, size, stock, price 등 확인
```

---

## 🛠️ 기술 구현

### 라우팅 구조

```
/s/[slug]                    → 카탈로그 메인 (공개, 인증 불필요)
/s/[slug]/product/[id]       → 상품 상세 (선택사항, 바텀시트로 대체 가능)

/dashboard/catalog           → 사장님용 카탈로그 관리
/dashboard/catalog/settings  → 매장 프로필 설정
```

### 주요 컴포넌트

```
/components/catalog/
  ├── CatalogHeader.tsx       # 매장 정보, 연락처
  ├── CategoryTabs.tsx        # 카테고리 필터 탭
  ├── ProductGrid.tsx         # Masonry 그리드
  ├── ProductCard.tsx         # 상품 카드 (사진 중심)
  ├── ProductBottomSheet.tsx  # 상품 상세 + 수량 선택
  ├── VariantMatrix.tsx       # 컬러x사이즈 매트릭스
  ├── MisongInquiry.tsx       # 품절 상품 미송 문의
  ├── CartFloating.tsx        # 플로팅 장바구니 버튼
  ├── CartSheet.tsx           # 장바구니/주문서
  └── KakaoOrderButton.tsx    # 카카오톡 전송 버튼
```

### 상태 관리

```typescript
// 장바구니 상태 (로컬 스토리지 + 상태관리)
interface CartItem {
  productId: string;
  productName: string;
  variantId: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

interface MisongInquiry {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  inquiries: MisongInquiry[];
}
```

### 카카오톡 연동

```typescript
// 카카오톡 공유 (웹 공유 API 또는 카카오 SDK)
const shareToKakao = (message: string, kakaoId: string) => {
  // 옵션 1: 카카오톡 채널 메시지 (사업자용)
  // 옵션 2: 웹 공유 API → 카카오톡 선택
  // 옵션 3: 클립보드 복사 + 카카오톡 열기
  
  // 가장 심플한 방식: 클립보드 복사 후 카톡 딥링크
  navigator.clipboard.writeText(message);
  window.location.href = `kakaoopen://friend/${kakaoId}`;
};
```

---

## 📋 구현 단계

### Phase 1: 기반 구축
1. [ ] 기존 POSBASE 프로젝트 구조 분석
2. [ ] shop_profiles 테이블 생성
3. [ ] products 테이블 이미지/카테고리 컬럼 확인 및 추가
4. [ ] 공개 카탈로그 라우팅 설정 (/s/[slug])

### Phase 2: 카탈로그 UI
5. [ ] CatalogHeader 컴포넌트
6. [ ] CategoryTabs 컴포넌트
7. [ ] ProductGrid + ProductCard (Masonry)
8. [ ] 이미지 최적화 (lazy load, placeholder)

### Phase 3: 주문 플로우
9. [ ] ProductBottomSheet + VariantMatrix
10. [ ] 장바구니 상태 관리
11. [ ] MisongInquiry 컴포넌트
12. [ ] CartSheet (주문서)
13. [ ] 카카오톡 메시지 생성 및 전송

### Phase 4: 사장님 관리 페이지
14. [ ] 매장 프로필 설정 UI
15. [ ] 상품별 카탈로그 공개/비공개 설정
16. [ ] 카테고리 관리
17. [ ] 내 카탈로그 링크 복사/공유

### Phase 5: 마무리
18. [ ] 모바일 반응형 최적화
19. [ ] 로딩/에러 상태 처리
20. [ ] SEO 메타태그 (공유 시 미리보기)
21. [ ] 테스트

---

## ⚠️ 주의사항

1. **인증 분리**: 카탈로그 페이지는 비로그인 공개, 관리 페이지는 인증 필요
2. **성능**: 이미지 많으므로 lazy loading, 이미지 최적화 필수
3. **재고 실시간성**: 주문 시점과 재고 차이 발생 가능 → 안내 문구 필요
4. **카카오톡 연동**: 딥링크 방식이 가장 심플하나, iOS/Android 동작 테스트 필요
5. **기존 코드 스타일**: 프로젝트의 기존 컴포넌트/스타일 패턴 따라갈 것

---

## 📎 참고 UI 레퍼런스

- 핀터레스트 (Masonry Grid)
- 29CM (사진 중심 상품 카드)
- W컨셉 (모바일 쇼핑 UX)
- 신상마켓/셀업 (동대문 B2B 플로우)

---

## 🚀 시작하기

1. 먼저 기존 POSBASE 프로젝트 구조를 파악해주세요
2. 현재 스키마와 위 설계의 차이점을 확인해주세요
3. 구현 계획을 세우고 확인받은 후 작업을 시작해주세요
