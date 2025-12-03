import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Eye, EyeOff, Store } from 'lucide-react'
import { useMyShopProfile, useCreateShopProfile, useUpdateShopProfile, useCheckSlugAvailable } from '@/hooks/useCatalog'
import { useToast } from '@/components/Toast'

export default function CatalogSettingsPage() {
  const { addToast } = useToast()
  const { data: profile, isLoading } = useMyShopProfile()
  const createProfile = useCreateShopProfile()
  const updateProfile = useUpdateShopProfile()
  const checkSlug = useCheckSlugAvailable()

  // 폼 상태
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [building, setBuilding] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [kakaoId, setKakaoId] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [showPrices, setShowPrices] = useState(true)
  const [categories, setCategories] = useState<string[]>(['전체'])

  // 새 카테고리 입력
  const [newCategory, setNewCategory] = useState('')

  // 복사 상태
  const [isCopied, setIsCopied] = useState(false)

  // slug 유효성
  const [slugError, setSlugError] = useState('')

  // 프로필 로드 시 폼 초기화
  useEffect(() => {
    if (profile) {
      setSlug(profile.slug)
      setDisplayName(profile.display_name)
      setBuilding(profile.building || '')
      setDescription(profile.description || '')
      setPhone(profile.phone || '')
      setKakaoId(profile.kakao_id || '')
      setIsActive(profile.is_active)
      setShowPrices(profile.show_prices)
      setCategories(profile.categories || ['전체'])
    }
  }, [profile])

  // slug 형식 검증
  const validateSlug = (value: string) => {
    const regex = /^[a-z0-9-]+$/
    if (!value) return '주소를 입력해주세요.'
    if (value.length < 3) return '3자 이상 입력해주세요.'
    if (value.length > 30) return '30자 이하로 입력해주세요.'
    if (!regex.test(value)) return '영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.'
    return ''
  }

  const handleSlugChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(formatted)
    setSlugError(validateSlug(formatted))
  }

  const handleSlugBlur = async () => {
    const error = validateSlug(slug)
    if (error) {
      setSlugError(error)
      return
    }

    // 중복 체크
    const isAvailable = await checkSlug.mutateAsync(slug)
    if (!isAvailable) {
      setSlugError('이미 사용 중인 주소입니다.')
    }
  }

  const handleAddCategory = () => {
    if (!newCategory.trim()) return
    if (categories.includes(newCategory.trim())) {
      addToast({ type: 'danger', title: '중복 카테고리', message: '이미 존재하는 카테고리입니다' })
      return
    }
    setCategories([...categories, newCategory.trim()])
    setNewCategory('')
  }

  const handleRemoveCategory = (category: string) => {
    if (category === '전체') return // '전체'는 삭제 불가
    setCategories(categories.filter((c) => c !== category))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검증
    const error = validateSlug(slug)
    if (error) {
      setSlugError(error)
      return
    }

    if (!displayName.trim()) {
      addToast({ type: 'danger', title: '입력 오류', message: '매장명을 입력해주세요' })
      return
    }

    try {
      if (profile) {
        // 수정
        await updateProfile.mutateAsync({
          slug,
          display_name: displayName,
          building: building || undefined,
          description: description || undefined,
          phone: phone || undefined,
          kakao_id: kakaoId || undefined,
          is_active: isActive,
          show_prices: showPrices,
          categories,
        })
        addToast({ type: 'success', title: '저장 완료', message: '카탈로그 설정이 저장되었습니다' })
      } else {
        // 생성
        await createProfile.mutateAsync({
          slug,
          display_name: displayName,
          building: building || undefined,
          description: description || undefined,
          phone: phone || undefined,
          kakao_id: kakaoId || undefined,
          categories,
        })
        addToast({ type: 'success', title: '생성 완료', message: '카탈로그가 생성되었습니다' })
      }
    } catch (error: unknown) {
      addToast({
        type: 'danger',
        title: '저장 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      })
    }
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/s/${slug}`
    await navigator.clipboard.writeText(link)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    addToast({ type: 'success', title: '복사 완료', message: '링크가 클립보드에 복사되었습니다' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-point border-t-transparent" />
      </div>
    )
  }

  const catalogUrl = `${window.location.origin}/s/${slug}`

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">카탈로그 설정</h1>
          <p className="text-sm text-fg-secondary mt-1">
            거래처에게 공유할 상품 카탈로그를 설정합니다
          </p>
        </div>
      </div>

      {/* 카탈로그 링크 (프로필이 있을 때만) */}
      {profile && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-point/10 flex items-center justify-center flex-shrink-0">
              <Store size={20} className="text-point" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg-secondary">내 카탈로그 링크</p>
              <p className="text-fg-primary font-mono text-sm truncate">{catalogUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg bg-bg-tertiary text-fg-secondary hover:text-fg-primary hover:bg-bg-hover transition-colors"
                title="링크 복사"
              >
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <a
                href={catalogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-bg-tertiary text-fg-secondary hover:text-fg-primary hover:bg-bg-hover transition-colors"
                title="카탈로그 열기"
              >
                <ExternalLink size={18} />
              </a>
            </div>
          </div>

          {/* 활성화 상태 */}
          <div className="mt-3 flex items-center gap-2">
            {isActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                <Eye size={12} />
                공개 중
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-fg-muted/10 text-fg-muted">
                <EyeOff size={12} />
                비공개
              </span>
            )}
          </div>
        </div>
      )}

      {/* 설정 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="text-base font-semibold text-fg-primary">기본 정보</h2>

          {/* 카탈로그 주소 */}
          <div>
            <label className="data-label block mb-1.5">카탈로그 주소 *</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-tertiary">/s/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={handleSlugBlur}
                placeholder="my-shop"
                className="input flex-1"
                disabled={!!profile} // 생성 후에는 변경 불가
              />
            </div>
            {slugError && (
              <p className="text-xs text-danger mt-1">{slugError}</p>
            )}
            <p className="text-xs text-fg-tertiary mt-1">
              영문 소문자, 숫자, 하이픈(-) 사용 가능. 생성 후 변경 불가
            </p>
          </div>

          {/* 매장명 */}
          <div>
            <label className="data-label block mb-1.5">매장명 *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="미미패션"
              className="input w-full"
            />
          </div>

          {/* 위치 */}
          <div>
            <label className="data-label block mb-1.5">위치 (건물/층)</label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="청평화 2층"
              className="input w-full"
            />
          </div>

          {/* 소개 */}
          <div>
            <label className="data-label block mb-1.5">매장 소개</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="매장을 간단히 소개해주세요"
              className="input w-full min-h-[80px] resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* 연락처 */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="text-base font-semibold text-fg-primary">연락처</h2>

          <div>
            <label className="data-label block mb-1.5">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="input w-full"
            />
          </div>

          <div>
            <label className="data-label block mb-1.5">카카오톡 ID</label>
            <input
              type="text"
              value={kakaoId}
              onChange={(e) => setKakaoId(e.target.value)}
              placeholder="kakaoid123"
              className="input w-full"
            />
            <p className="text-xs text-fg-tertiary mt-1">
              거래처가 카카오톡으로 바로 연락할 수 있습니다
            </p>
          </div>
        </div>

        {/* 공개 설정 */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="text-base font-semibold text-fg-primary">공개 설정</h2>

          {/* 카탈로그 공개 */}
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg-primary">카탈로그 공개</p>
              <p className="text-xs text-fg-tertiary">링크로 접속 가능하도록 설정</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isActive ? 'bg-point' : 'bg-bg-tertiary'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isActive ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </label>

          {/* 가격 공개 */}
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg-primary">가격 표시</p>
              <p className="text-xs text-fg-tertiary">상품 가격을 거래처에게 공개</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrices(!showPrices)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                showPrices ? 'bg-point' : 'bg-bg-tertiary'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showPrices ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* 카테고리 설정 */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="text-base font-semibold text-fg-primary">카테고리</h2>

          {/* 현재 카테고리 목록 */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  category === '전체'
                    ? 'bg-point/10 text-point'
                    : 'bg-bg-tertiary text-fg-secondary'
                }`}
              >
                {category}
                {category !== '전체' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    className="ml-1 text-fg-muted hover:text-danger"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* 카테고리 추가 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCategory()
                }
              }}
              placeholder="새 카테고리"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="btn btn-secondary"
            >
              추가
            </button>
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          type="submit"
          disabled={createProfile.isPending || updateProfile.isPending}
          className="btn btn-primary w-full"
        >
          {createProfile.isPending || updateProfile.isPending
            ? '저장 중...'
            : profile
            ? '설정 저장'
            : '카탈로그 생성'}
        </button>
      </form>
    </div>
  )
}
