import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers'
import type { Customer } from '@/types/database.types'

export default function CustomersPage() {
  const { data: customers, isLoading, error } = useCustomers()
  const deleteCustomer = useDeleteCustomer()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  )

  // 통계
  const totalBalance = customers?.reduce((sum, c) => sum + c.balance, 0) || 0
  const customersWithBalance = customers?.filter(c => c.balance > 0).length || 0

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" 거래처를 삭제하시겠습니까?`)) {
      await deleteCustomer.mutateAsync(id)
    }
  }

  if (error) {
    return (
      <div className="p-8 text-center text-danger">
        거래처를 불러오는 중 오류가 발생했습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-fg-primary">거래처 관리</h1>
          <p className="text-sm md:text-base text-fg-secondary mt-1">
            총 {customers?.length || 0}개 거래처
          </p>
        </div>
        <Link to="/customers/new" className="btn btn-primary text-sm md:text-base">
          + 거래처 등록
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <div className="glass-card p-3">
          <p className="data-label">외상 보유 거래처</p>
          <p className="data-value data-value-lg mt-1">{customersWithBalance}개</p>
        </div>
        <div className="glass-card p-3">
          <p className="data-label">총 미수금</p>
          <p className="data-value data-value-lg mt-1 text-warning">
            ₩{totalBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          className="input flex-1"
          placeholder="업체명, 담당자, 연락처로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Customers List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-3">
              <div className="skeleton skeleton-text w-1/3 mb-2" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredCustomers?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-fg-tertiary text-lg">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 거래처가 없습니다.'}
          </p>
          {!searchTerm && (
            <Link to="/customers/new" className="btn btn-primary mt-4">
              첫 거래처 등록하기
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCustomers?.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onDelete={() => handleDelete(customer.id, customer.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Customer Card Component
interface CustomerCardProps {
  customer: Customer
  onDelete: () => void
}

function CustomerCard({ customer, onDelete }: CustomerCardProps) {
  return (
    <div className="glass-card p-3 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* 업체명 */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-fg-primary truncate">
              {customer.name}
            </h3>
            {customer.balance > 0 && (
              <span className="badge badge-warning">외상</span>
            )}
          </div>

          {/* 담당자 & 연락처 */}
          <div className="flex items-center gap-3 mt-2 text-sm text-fg-secondary">
            {customer.contact_name && <span>{customer.contact_name}</span>}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="hover:text-fg-primary">
                {customer.phone}
              </a>
            )}
          </div>

          {/* 주소 */}
          {customer.address && (
            <p className="text-sm text-fg-tertiary mt-1 truncate">
              {customer.address}
            </p>
          )}
        </div>

        {/* 외상 잔액 & 액션 */}
        <div className="flex flex-col items-end gap-3">
          {customer.balance > 0 && (
            <div className="text-right">
              <span className="text-xs text-fg-tertiary">외상 잔액</span>
              <p className="font-mono font-bold text-xl text-warning">
                ₩{customer.balance.toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Link
              to={`/customers/${customer.id}`}
              className="btn btn-ghost btn-sm"
            >
              수정
            </Link>
            <button
              onClick={onDelete}
              className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
