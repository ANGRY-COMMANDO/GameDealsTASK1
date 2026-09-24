import type { ReactNode } from 'react'
import { AlertTriangle, SearchX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <output
      aria-label="Загрузка"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-fill-active border-t-accent',
        className,
      )}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />
}

function DealCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[460/215] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  )
}

/** Сетка скелетонов: первый экран ленты и fallback ленивого маршрута. */
export function DealsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <DealCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn('card flex flex-col items-center gap-4 p-8 text-center', className)}
    >
      <span className="grid size-11 place-items-center rounded-lg bg-caution-tint">
        <AlertTriangle className="size-5 text-caution" aria-hidden />
      </span>
      <p className="max-w-md text-sm text-ink-2">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('card flex flex-col items-center gap-3 p-10 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-lg bg-fill-subtle">
        <SearchX className="size-5 text-ink-3" aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-2">{description}</p>}
      {action}
    </div>
  )
}

const TONE_STYLES = {
  default: 'text-ink',
  accent: 'text-accent',
  positive: 'text-success',
} as const

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'accent' | 'positive'
  icon?: ReactNode
}) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-ink-2">{label}</p>
        {icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-accent-tint text-accent">
            {icon}
          </span>
        )}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tabular-nums', TONE_STYLES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

export function SectionTitle({
  title,
  subtitle,
  right,
  eyebrow,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1.5">
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-ink-2">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

/** Единая шапка страницы в духе Fluent: метка раздела, заголовок и слот действий. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="animate-fade-in space-y-3">
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
          {description && <p className="max-w-3xl text-sm text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
