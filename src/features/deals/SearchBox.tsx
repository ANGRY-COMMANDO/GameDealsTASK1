import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Gamepad2, History, Search, X } from 'lucide-react'
import { useGameSearch } from '@/shared/api/hooks'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { cn } from '@/shared/lib/utils'
import {
  clearSearchHistory,
  loadSearchHistory,
  pushSearchHistory,
} from '@/shared/lib/searchHistory'

type Suggestion =
  | { type: 'history'; id: string; title: string }
  | { type: 'clear-history'; id: string; title: string }
  | { type: 'show-all'; id: string; title: string }
  | { type: 'game'; id: string; title: string }

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

/** Поиск с подсказками: недавние запросы, быстрый переход к игре и полные результаты. */
export function SearchBox({ value, onChange, className }: SearchBoxProps) {
  const navigate = useNavigate()
  const debounced = useDebouncedValue(value, 600)
  const results = useGameSearch(debounced)
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory())
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  const trimmed = value.trim()

  const suggestions = useMemo<Suggestion[]>(() => {
    if (trimmed.length < 4) {
      if (history.length === 0) return []
      return [
        ...history.map((item) => ({
          type: 'history' as const,
          id: `history-${item}`,
          title: item,
        })),
        { type: 'clear-history' as const, id: 'clear-history', title: 'Очистить историю' },
      ]
    }
    const games = (results.data ?? []).map((game) => ({
      type: 'game' as const,
      id: game.gameID,
      title: game.external,
    }))
    return [{ type: 'show-all' as const, id: 'show-all', title: trimmed }, ...games]
  }, [trimmed, history, results.data])

  const close = () => {
    setOpen(false)
    setActive(-1)
  }

  const applySearch = (query: string) => {
    const clean = query.trim()
    onChange(clean)
    setHistory(pushSearchHistory(clean))
    close()
  }

  const openGame = (gameID: string, title: string) => {
    setHistory(pushSearchHistory(title))
    close()
    void navigate(`/game/${gameID}`)
  }

  const select = (item: Suggestion) => {
    if (item.type === 'game') {
      openGame(item.id, item.title)
      return
    }
    if (item.type === 'clear-history') {
      setHistory(clearSearchHistory())
      setActive(-1)
      return
    }
    applySearch(item.title)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, suggestions.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, -1))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const item = suggestions[active]
      if (item) {
        select(item)
        return
      }
      // Точное название из подсказок открывает игру сразу: в каталоге скидок её может не быть.
      const exact = (results.data ?? []).find(
        (game) => game.external.trim().toLowerCase() === trimmed.toLowerCase(),
      )
      if (exact) {
        openGame(exact.gameID, exact.external)
        return
      }
      applySearch(value)
    }
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget))
      return
    close()
  }

  const visible = open && suggestions.length > 0

  return (
    <div ref={rootRef} className={cn('relative', className)} onBlur={handleBlur}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
      <input
        type="search"
        className="input py-2.5 pr-9 pl-9"
        placeholder="Найти игру, например The Witcher"
        value={value}
        role="combobox"
        aria-label="Поиск игр"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-[4px] text-ink-3 transition duration-100 ease-fluent hover:bg-fill-subtle hover:text-ink"
          onClick={() => {
            onChange('')
            close()
          }}
          aria-label="Очистить поиск"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}

      {visible && (
        <ul
          id={listId}
          aria-label="Подсказки поиска"
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border border-stroke bg-surface-solid p-1 shadow-e16"
        >
          {suggestions.map((item, index) => (
            <li key={`${item.type}-${item.id}`}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm transition duration-100 ease-fluent',
                  index === active
                    ? 'bg-fill-subtle text-ink'
                    : 'text-ink-2 hover:bg-fill-subtle hover:text-ink',
                )}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => select(item)}
              >
                {item.type === 'game' ? (
                  <Gamepad2 className="size-4 shrink-0 text-accent" aria-hidden />
                ) : item.type === 'clear-history' ? (
                  <X className="size-4 shrink-0 text-ink-3" aria-hidden />
                ) : item.type === 'history' ? (
                  <History className="size-4 shrink-0 text-ink-3" aria-hidden />
                ) : (
                  <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
                )}
                <span className="truncate">
                  {item.type === 'show-all'
                    ? `Показать все результаты по «${item.title}»`
                    : item.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
