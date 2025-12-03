-- ============================================
-- 테스트 계정 생성 (test@pos.com / test)
-- Supabase SQL Editor에서 먼저 실행
-- ============================================

-- 기존 테스트 계정이 있으면 삭제
DELETE FROM auth.users WHERE email = 'test@pos.com';

-- 테스트 계정 생성
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@pos.com',
  crypt('test', gen_salt('bf')),  -- 비밀번호: test
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"shop_name": "동대문 패션몰", "owner_name": "홍길동"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- 생성 확인
SELECT id, email, created_at FROM auth.users WHERE email = 'test@pos.com';
