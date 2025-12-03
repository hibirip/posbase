import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Toast 타입
export type ToastType = 'warning' | 'danger' | 'info' | 'success'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
  link?: string
  duration?: number // ms, default 5000
}

// Toast Context
interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => {
      // 최대 3개까지만 유지
      const newToasts = [...prev, { ...toast, id }]
      return newToasts.slice(-3)
    })
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Toast Container
function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

// Toast Item
interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const navigate = useNavigate()
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(onClose, 300) // 애니메이션 후 제거
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.duration, onClose])

  const handleClick = () => {
    if (toast.link) {
      navigate(toast.link)
      onClose()
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExiting(true)
    setTimeout(onClose, 300)
  }

  const typeConfig = {
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-warning/10 border-warning/30',
      iconClass: 'text-warning',
      titleClass: 'text-warning',
    },
    danger: {
      icon: AlertCircle,
      bgClass: 'bg-danger/10 border-danger/30',
      iconClass: 'text-danger',
      titleClass: 'text-danger',
    },
    info: {
      icon: Info,
      bgClass: 'bg-point/10 border-point/30',
      iconClass: 'text-point',
      titleClass: 'text-point',
    },
    success: {
      icon: CheckCircle,
      bgClass: 'bg-success/10 border-success/30',
      iconClass: 'text-success',
      titleClass: 'text-success',
    },
  }

  const config = typeConfig[toast.type]
  const Icon = config.icon

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        ${config.bgClass}
        ${toast.link ? 'cursor-pointer hover:bg-opacity-20' : ''}
        ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
        transition-all duration-300
      `}
      onClick={handleClick}
    >
      <Icon size={20} strokeWidth={1.5} className={`${config.iconClass} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.titleClass}`}>{toast.title}</p>
        <p className="text-sm text-fg-secondary mt-0.5 line-clamp-2">{toast.message}</p>
      </div>
      <button
        onClick={handleClose}
        className="p-1 text-fg-muted hover:text-fg-secondary rounded-md hover:bg-bg-hover transition-colors flex-shrink-0"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}
