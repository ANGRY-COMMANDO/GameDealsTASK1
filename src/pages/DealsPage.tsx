import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { BarChart3, Filter, Share2, SlidersHorizontal } from 'lucide-react'
import { DEALS_PAGE_SIZE } from '@/shared/api/client'
import { useDealsInfinite, useStores, useTagIndex } from '@/shared/api/hooks'
import type { Deal } from '@/shared/api/schemas'
import { useBackdropImagesStore } from '@/shared/lib/backdrop'
import { useCurrency } from '@/shared/lib/currency'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'
import { plural } from '@/shared/lib/format'
import { shareUrl } from '@/shared/lib/share'
import { cn } from '@/shared/lib/utils'
import {
  DealsGridSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from '@/shared/ui/primitives'
import { Sheet } from '@/shared/ui/Sheet'
import { CurrencyToggle } from '@/shared/ui/CurrencyToggle'
import { RefreshButton } from '@/shared/ui/RefreshButton'
import { ActiveFilters } from '@/features/deals/ActiveFilters'
import { DealCard } from '@/features/deals/DealCard'
import { FiltersPanel } from '@/features/deals/FiltersPanel'
import { QuickFilters } from '@/features/deals/QuickFilters'
import { SearchBox } from '@/features/deals/SearchBox'
import { useDealColumns } from '@/features/deals/useDealColumns'
import {
  activeFilterCount,
  defaultFilters,
  filterDeals,
  hasClientFilters,
  sortByRelevance,
  toApiQuery,
  useFilters,
} from '@/features/deals/filters'

const MAX_AUTO_PAGES = 10
const ROW_HEIGHT_ESTIMATE = 440

export default function DealsPage() {
  const { filters, setFilters, resetFilters, applyPreset, toggleTag } = useFilters()
  const currency = useCurrency()
  const [search, setSearch] = useState(filters.title)
  const debouncedSearch = useDebouncedValue(search, 400)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const publishBackdrop = useBackdropImagesStore()

  const shareFilters = async () => {
    const result = await shareUrl(window.location.href, 'GameDeals — скидки на PC-игры')
    if (result === 'copied') {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  // Двусторонняя синхронизация поиска и URL. `lastPushed` хранит последнее
  // значение, которое мы сами записали в URL: внешние изменения (пресет, сброс)
  // не должны перебиваться «догоняющим» debounce-значением.
  const lastPushedRef = useRef(filters.title)

  useEffect(() => {
    if (debouncedSearch === lastPushedRef.current) return
    lastPushedRef.current = debouncedSearch
    setFilters({ title: debouncedSearch })
  }, [debouncedSearch, setFilters])

  useEffect(() => {
    if (filters.title === lastPushedRef.current) return
    lastPushedRef.current = filters.title
    setSearch(filters.title)
  }, [filters.title])

  const apiQuery = useMemo(() => toApiQuery(filters), [filters])
  const dealsQuery = useDealsInfinite(apiQuery)
  const storesQuery = useStores()
  const tagIndexQuery = useTagIndex()

  const stores = useMemo(() => storesQuery.data ?? [], [storesQuery.data])
  const tagIndex = tagIndexQuery.data
  const storesById = useMemo(() => new Map(stores.map((store) => [store.storeID, store])), [stores])

  const loadedDeals = useMemo(() => {
    // Между запросами страниц выдача CheapShark может сдвинуться — убираем дубликаты по dealID.
    const seen = new Set<string>()
    const deals: Deal[] = []
    for (const deal of dealsQuery.data?.pages.flatMap((page) => page.deals) ?? []) {
      if (seen.has(deal.dealID)) continue
      seen.add(deal.dealID)
      deals.push(deal)
    }
    return deals
  }, [dealsQuery.data])

  useEffect(() => {
    publishBackdrop(loadedDeals.slice(0, 8).map((deal) => deal.thumb))
  }, [loadedDeals, publishBackdrop])

  const visibleDeals = useMemo(() => {
    const filtered = filterDeals(loadedDeals, filters, tagIndex)
    // При поиске поднимаем самые релевантные совпадения, если сортировка не выбрана вручную.
    if (filters.title && filters.sortBy === defaultFilters.sortBy) {
      return sortByRelevance(filtered, filters.title)
    }
    return filtered
  }, [loadedDeals, filters, tagIndex])

  const pageCount = dealsQuery.data?.pages.length ?? 0
  const totalPages = dealsQuery.data?.pages[0]?.totalPages ?? 0
  const totalEstimate = totalPages * DEALS_PAGE_SIZE
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = dealsQuery

  // Подгружаем страницы, пока клиентские фильтры (магазины/скидка/теги) не дадут достаточно результатов.
  useEffect(() => {
    if (!hasClientFilters(filters)) return
    if (visibleDeals.length >= 12) return
    if (!hasNextPage || isFetchingNextPage) return
    if (pageCount >= MAX_AUTO_PAGES) return
    void fetchNextPage()
  }, [filters, visibleDeals.length, hasNextPage, isFetchingNextPage, pageCount, fetchNextPage])

  const columns = useDealColumns()
  const rows = useMemo(() => {
    const result: Deal[][] = []
    for (let index = 0; index < visibleDeals.length; index += columns) {
      result.push(visibleDeals.slice(index, index + columns))
    }
    return result
  }, [visibleDeals, columns])

  // Виртуализируем окно: список начинается ниже шапки, поэтому нужен scrollMargin.
  const listRef = useRef<HTMLUListElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  // Список появляется только после загрузки данных — меряем отступ в этот момент.
  const attachList = useCallback((node: HTMLUListElement | null) => {
    listRef.current = node
    if (node) setScrollMargin(node.offsetTop)
  }, [])

  useEffect(() => {
    const update = () => {
      const node = listRef.current
      if (node) setScrollMargin(node.offsetTop)
    }
    const observer = new ResizeObserver(update)
    observer.observe(document.body)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 4,
    scrollMargin,
  })
  const virtualItems = virtualizer.getVirtualItems()

  // Догрузка следующей страницы, когда виртуализатор доходит до конца списка.
  useEffect(() => {
    const last = virtualItems.at(-1)
    if (!last) return
    if (last.index < rows.length - 2) return
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [virtualItems, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  const activeCount = activeFilterCount(filters)
  const clientFiltered = hasClientFilters(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Витрина скидок"
        title="Скидки на PC-игры"
        description={
          <span aria-live="polite">
            {filters.title ? (
              <>
                Найдено <strong className="tabular-nums">{loadedDeals.length}</strong>{' '}
                {plural(loadedDeals.length, 'предложение', 'предложения', 'предложений')} по запросу
                «{filters.title}»
              </>
            ) : totalEstimate > 0 ? (
              <>
                Около{' '}
                <strong className="tabular-nums">{totalEstimate.toLocaleString('ru-RU')}</strong>{' '}
                предложений по выбранным фильтрам
              </>
            ) : (
              'Данные CheapShark обновляются каждые несколько минут'
            )}
          </span>
        }
        actions={
          <Link to="/analytics" viewTransition className="btn btn-outline">
            <BarChart3 className="size-4" aria-hidden />
            Аналитика скидок
          </Link>
        }
      />

      <div className="flex gap-2">
        <SearchBox
          value={search}
          onChange={(next) => {
            setSearch(next)
            // Очистка поиска применяется сразу, без дебаунса.
            if (!next.trim()) setFilters({ title: '' })
          }}
          className="flex-1"
        />
        <button
          type="button"
          className="btn btn-outline lg:hidden"
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Фильтры
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto p-4">
            <FiltersPanel
              filters={filters}
              stores={stores}
              tagIndex={tagIndex}
              setFilters={setFilters}
              resetFilters={resetFilters}
              applyPreset={applyPreset}
              toggleTag={toggleTag}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <QuickFilters filters={filters} setFilters={setFilters} />
            <div className="ml-auto flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <RefreshButton />
                <button type="button" className="chip" onClick={() => void shareFilters()}>
                  <Share2 className="size-3.5" aria-hidden />
                  {copied ? 'Ссылка скопирована' : 'Поделиться'}
                </button>
                <CurrencyToggle />
              </div>
              {currency === 'RUB' && (
                <p className="text-[11px] text-ink-3">
                  Конвертация ориентировочная: без учёта региональных цен и налогов.
                </p>
              )}
            </div>
            <span className="sr-only" aria-live="polite">
              {copied ? 'Ссылка на фильтры скопирована' : ''}
            </span>
          </div>

          <ActiveFilters
            filters={filters}
            stores={stores}
            setFilters={setFilters}
            resetFilters={resetFilters}
            toggleTag={toggleTag}
          />

          {filters.title && filters.onSale && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-stroke bg-fill-subtle px-3 py-2 text-xs text-ink-2">
              Ищем только среди скидок.
              <button type="button" className="link" onClick={() => setFilters({ onSale: false })}>
                Показать все цены
              </button>
            </p>
          )}

          {clientFiltered && (
            <p className="rounded-lg border border-caution/30 bg-caution-tint px-3 py-2 text-xs text-caution">
              Фильтры «магазины», «скидка» и «теги» применяются к загруженным страницам — прокрутите
              список, чтобы догрузить ещё.
            </p>
          )}

          {dealsQuery.isError && loadedDeals.length === 0 && (
            <ErrorState
              message={
                dealsQuery.error instanceof Error ? dealsQuery.error.message : 'Ошибка загрузки'
              }
              onRetry={() => void dealsQuery.refetch()}
            />
          )}

          {dealsQuery.isError && loadedDeals.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-caution/30 bg-caution-tint px-3 py-2 text-xs text-caution">
              Не удалось обновить данные — показаны последние загруженные предложения.
              <button type="button" className="link" onClick={() => void dealsQuery.refetch()}>
                Повторить
              </button>
            </p>
          )}

          {dealsQuery.isPending && <DealsGridSkeleton />}

          {!dealsQuery.isPending && !dealsQuery.isError && visibleDeals.length === 0 && (
            <EmptyState
              title="Ничего не найдено"
              description="Попробуйте ослабить фильтры: увеличить максимальную цену, убрать теги или снизить минимальную скидку."
              action={
                <button type="button" className="btn btn-primary" onClick={resetFilters}>
                  <Filter className="size-4" aria-hidden />
                  Сбросить фильтры
                </button>
              }
            />
          )}

          {rows.length > 0 && (
            <ul
              ref={attachList}
              className="relative"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualItems.map((item) => (
                <li
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute inset-x-0 top-0 grid gap-4 pb-4 sm:grid-cols-2 xl:grid-cols-3"
                  style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
                >
                  {(rows[item.index] ?? []).map((deal, column) => (
                    <DealCard
                      key={deal.dealID}
                      deal={deal}
                      store={storesById.get(deal.storeID)}
                      index={tagIndex}
                      priority={item.index * columns + column < 6}
                    />
                  ))}
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-center pb-4">
            {dealsQuery.isFetchingNextPage && <Spinner />}
            {!dealsQuery.isFetchingNextPage && dealsQuery.hasNextPage && rows.length > 0 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void dealsQuery.fetchNextPage()}
              >
                Показать ещё
              </button>
            )}
            {!dealsQuery.hasNextPage && visibleDeals.length > 0 && (
              <p className="text-xs text-ink-2">Это все найденные предложения</p>
            )}
          </div>
        </section>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Фильтры">
        <FiltersPanel
          filters={filters}
          stores={stores}
          tagIndex={tagIndex}
          setFilters={setFilters}
          resetFilters={resetFilters}
          applyPreset={applyPreset}
          toggleTag={toggleTag}
          showTitle={false}
          className={cn('pb-6')}
        />
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => setSheetOpen(false)}
        >
          Показать результаты
        </button>
      </Sheet>
    </div>
  )
}
