import { useMemo, useState } from 'react'
import { Plus, Search, Tags, X } from 'lucide-react'
import type { TagIndex } from '@/shared/api/schemas'
import { cn } from '@/shared/lib/utils'
import { Sheet } from '@/shared/ui/Sheet'

type TagPickerProps = {
  index?: TagIndex
  selected: string[]
  matchAll: boolean
  onToggle: (tag: string) => void
  onMatchAllChange: (value: boolean) => void
  onClear: () => void
}

export function TagPicker({
  index,
  selected,
  matchAll,
  onToggle,
  onMatchAllChange,
  onClear,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const topTags = useMemo(() => (index?.tags ?? []).slice(0, 18), [index])
  const allTags = useMemo(() => index?.tags ?? [], [index])
  const filteredTags = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return allTags.slice(0, 200)
    return allTags.filter((tag) => tag.label.toLowerCase().includes(normalized)).slice(0, 200)
  }, [allTags, query])

  const available = allTags.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
          <Tags className="size-3.5 text-accent" aria-hidden />
          Теги
        </span>
        {selected.length > 0 && (
          <button type="button" className="link text-xs" onClick={onClear}>
            Сбросить теги
          </button>
        )}
      </div>

      {!available && (
        <p className="text-xs text-ink-2">
          Индекс тегов ещё не собран: выполните{' '}
          <code className="rounded-[4px] bg-fill-subtle px-1">pnpm run data:tags</code>.
        </p>
      )}

      {available && (
        <>
          <ul className="flex flex-wrap gap-1.5">
            {topTags.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className={cn('chip', selected.includes(tag.id) && 'chip-active')}
                  aria-pressed={selected.includes(tag.id)}
                  onClick={() => onToggle(tag.id)}
                >
                  {tag.label}
                </button>
              </li>
            ))}
            {allTags.length > topTags.length && (
              <li>
                <button type="button" className="chip" onClick={() => setOpen(true)}>
                  <Plus className="size-3.5" aria-hidden />
                  Все теги
                </button>
              </li>
            )}
          </ul>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <fieldset
                className="inline-flex overflow-hidden rounded-[4px] border border-stroke-strong bg-surface p-0.5 text-xs"
                aria-label="Логика совпадения тегов"
              >
                <button
                  type="button"
                  className={cn(
                    'rounded-[3px] px-2.5 py-1 transition duration-100 ease-fluent',
                    !matchAll
                      ? 'bg-accent font-semibold text-accent-fg'
                      : 'text-ink-2 hover:bg-fill-subtle',
                  )}
                  aria-pressed={!matchAll}
                  onClick={() => onMatchAllChange(false)}
                >
                  любой
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-[3px] px-2.5 py-1 transition duration-100 ease-fluent',
                    matchAll
                      ? 'bg-accent font-semibold text-accent-fg'
                      : 'text-ink-2 hover:bg-fill-subtle',
                  )}
                  aria-pressed={matchAll}
                  onClick={() => onMatchAllChange(true)}
                >
                  все
                </button>
              </fieldset>
              <span className="text-xs text-ink-3">выбрано: {selected.length}</span>
            </div>
          )}

          {selected.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {selected.map((tag) => {
                const label = allTags.find((item) => item.id === tag)?.label ?? tag
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      className="chip chip-active"
                      onClick={() => onToggle(tag)}
                      aria-label={`Убрать тег ${label}`}
                    >
                      {label}
                      <X className="size-3" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Все теги">
        <label className="relative block">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            className="input pl-9"
            placeholder="Найти тег"
            aria-label="Найти тег"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
          />
        </label>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {filteredTags.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                className={cn('chip', selected.includes(tag.id) && 'chip-active')}
                aria-pressed={selected.includes(tag.id)}
                onClick={() => onToggle(tag.id)}
              >
                {tag.label}
                <span className="opacity-60">{tag.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
