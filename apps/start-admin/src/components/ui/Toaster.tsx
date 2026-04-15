import { useToastStore, type Toast } from '@/lib/stores/toast-store'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t: Toast) => (
        <div
          key={t.id}
          className={`flex items-center justify-between gap-4 rounded-md p-4 text-sm font-medium shadow-lg transition-all ${
            t.type === 'error'
              ? 'bg-red-500 text-white'
              : t.type === 'success'
                ? 'bg-emerald-500 text-white'
                : t.type === 'info'
                  ? 'bg-teal-600 text-white'
                  : t.type === 'warning'
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-800 text-white'
          }`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            className="text-white/80 hover:text-white"
            onClick={() => removeToast(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
