import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Нижний лист на нативном <dialog>: бесплатный focus-trap, инертный фон
 * и закрытие по Esc — без сторонних зависимостей. Оформлен как Fluent Dialog.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('cancel', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
      dialog.removeEventListener('cancel', handleClose)
    }
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      closedby="any"
      className="m-0 max-h-none max-w-none bg-transparent p-0 text-inherit backdrop:bg-black/30 dark:backdrop:bg-black/50 open:fixed open:inset-0 open:flex open:items-end sm:open:items-center sm:open:justify-center"
    >
      <div
        className="glass-strong animate-rise flex max-h-[92dvh] w-full flex-col rounded-t-xl sm:max-w-lg sm:rounded-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <span
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-fill-active sm:hidden"
        />
        <header className="flex items-center justify-between gap-4 px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-[4px] text-ink-2 transition duration-100 ease-fluent hover:bg-fill-subtle hover:text-ink active:bg-fill-active"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto px-4 pb-5">{children}</div>
      </div>
    </dialog>
  )
}
