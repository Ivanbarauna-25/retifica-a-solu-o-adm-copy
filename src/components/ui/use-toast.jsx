// ... keep existing code (imports and most of the file) ...

// ✅ CORREÇÃO: Configurar duração padrão e permitir fechar toasts
export function useToast() {
  const [toasts, setToasts] = React.useState([])

  const toast = React.useCallback(
    ({ duration = 4000, ...props }) => {
      const id = Math.random().toString(36).substring(2, 9)
      
      setToasts((prev) => [...prev, { id, duration, ...props }])

      // Auto-remover após duração
      if (duration && duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }

      return id
    },
    []
  )

  const dismiss = React.useCallback((toastId) => {
    setToasts((prev) => {
      if (toastId) {
        return prev.filter((t) => t.id !== toastId)
      }
      return []
    })
  }, [])

  return {
    toasts,
    toast,
    dismiss,
  }
}