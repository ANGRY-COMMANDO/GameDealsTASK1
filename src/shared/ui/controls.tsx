import { useState, type CSSProperties } from 'react'
import { cn } from '@/shared/lib/utils'

/** Fluent ToggleSwitch. */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[4px] px-2 py-2 text-[13px] transition duration-100 ease-fluent hover:bg-fill-subtle"
    >
      <span className="font-medium text-ink">{label}</span>
      <span
        className={cn(
          'relative h-5 w-10 shrink-0 rounded-full border transition duration-150 ease-fluent',
          checked ? 'border-accent bg-accent' : 'border-stroke-strong bg-transparent',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-3 rounded-full transition-all duration-150 ease-fluent',
            checked ? 'left-[22px] bg-accent-fg' : 'left-[3px] bg-ink-2',
          )}
        />
      </span>
    </button>
  )
}

/** Числовое поле с локальным вводом: можно стереть значение, не «прыгая» в ноль. */
export function NumberField({
  ariaLabel,
  value,
  min,
  max,
  fallback,
  onCommit,
}: {
  ariaLabel: string
  value: number
  min: number
  max: number
  fallback: number
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(value))

  const commit = () => {
    const parsed = Number(text.replace(',', '.'))
    if (text.trim() === '' || !Number.isFinite(parsed)) {
      setText(String(fallback))
      onCommit(fallback)
      return
    }
    const next = Math.min(max, Math.max(min, parsed))
    setText(String(next))
    onCommit(next)
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      className="input tabular-nums"
      min={min}
      max={max}
      value={text}
      aria-label={ariaLabel}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
      }}
    />
  )
}

/** Двойной слайдер цены: тянется мышью/пальцем, точные значения — в полях рядом. */
export function PriceRange({
  max,
  value,
  onCommit,
}: {
  max: number
  value: [number, number]
  onCommit: (next: [number, number]) => void
}) {
  const [dragging, setDragging] = useState<[number, number] | null>(null)
  const [lower, upper] = dragging ?? value

  const commit = () => {
    if (!dragging) return
    setDragging(null)
    onCommit(dragging)
  }

  const percent = (part: number) => (part / max) * 100

  return (
    <div className="relative mt-1 h-5">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-fill-active"
      />
      <div
        aria-hidden
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${percent(lower)}%`, right: `${100 - percent(upper)}%` }}
      />
      <input
        type="range"
        min={0}
        max={max}
        value={lower}
        aria-label="Цена от"
        className="range-dual absolute inset-0 h-5 w-full appearance-none bg-transparent"
        style={{ '--range-fill': 'transparent' } as CSSProperties}
        onChange={(event) => setDragging([Math.min(Number(event.target.value), upper), upper])}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <input
        type="range"
        min={0}
        max={max}
        value={upper}
        aria-label="Цена до"
        className="range-dual absolute inset-0 h-5 w-full appearance-none bg-transparent"
        style={{ '--range-fill': 'transparent' } as CSSProperties}
        onChange={(event) => setDragging([lower, Math.max(Number(event.target.value), lower)])}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </div>
  )
}
