import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

interface ToastCtx { showToast: (msg: string) => void }

const Ctx = createContext<ToastCtx>({ showToast: () => {} })

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((message: string) => {
    setMsg(message)
    setVisible(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 2800)
  }, [])

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 99999,
        transition: 'opacity .25s, transform .25s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#1e293b', color: '#f1f5f9',
          padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(15,23,42,.35)',
          maxWidth: 360, lineHeight: 1.4,
        }}>
          {msg}
        </div>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
