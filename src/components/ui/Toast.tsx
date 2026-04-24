'use client'
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-full pointer-events-auto',
              'animate-in slide-in-from-bottom-2 duration-200',
              t.type === 'success' && 'bg-emerald-500 text-white',
              t.type === 'error' && 'bg-red-500 text-white',
              t.type === 'info' && 'bg-blue-500 text-white',
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
            {t.type === 'info' && <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
