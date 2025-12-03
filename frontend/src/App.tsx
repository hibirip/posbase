import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Layouts
import DashboardLayout from '@/components/layouts/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

// Pages
import LoginPage from '@/pages/LoginPage'
import SignUpPage from '@/pages/SignUpPage'
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import ProductFormPage from '@/pages/ProductFormPage'
import CustomersPage from '@/pages/CustomersPage'
import CustomerFormPage from '@/pages/CustomerFormPage'
import SalesPage from '@/pages/SalesPage'
import NewSalePage from '@/pages/NewSalePage'
import PaymentsPage from '@/pages/PaymentsPage'
import BackordersPage from '@/pages/BackordersPage'
import ReturnsPage from '@/pages/ReturnsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import StatsPage from '@/pages/StatsPage'

function App() {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />

        {/* 상품 */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id" element={<ProductFormPage />} />

        {/* 거래처 */}
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id" element={<CustomerFormPage />} />

        {/* 판매 */}
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/new" element={<NewSalePage />} />

        {/* 입금 */}
        <Route path="/payments" element={<PaymentsPage />} />

        {/* 미송 */}
        <Route path="/backorders" element={<BackordersPage />} />

        {/* 반품 */}
        <Route path="/returns" element={<ReturnsPage />} />

        {/* 알림 */}
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* 통계 */}
        <Route path="/stats" element={<StatsPage />} />
      </Route>
    </Routes>
  )
}

export default App
