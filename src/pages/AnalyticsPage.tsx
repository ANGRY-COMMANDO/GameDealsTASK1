import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Download, Flame, Info, Layers, Percent, PiggyBank } from 'lucide-react'
import { dealTargetUrl } from '@/shared/api/client'
import {
  ANALYTICS_PAGES,
  ANALYTICS_PAGE_OPTIONS,
  normalizeAnalyticsPages,
  useAnalyticsDeals,
  useGameLows,
  usePriceHistory,
  useStores,
} from '@/shared/api/hooks'
import { useBackdropImagesStore } from '@/shared/lib/backdrop'
import { downloadCsv } from '@/shared/lib/csv'
import { useCurrency } from '@/shared/lib/currency'
import { formatPercent, formatPrice, formatRelativeDate } from '@/shared/lib/format'
import { ErrorState, PageHeader, SectionTitle, Skeleton, StatCard } from '@/shared/ui/primitives'
import {
  ChartCard,
  DiscountHistogramChart,
  LowComparisonChart,
  PriceHistoryChart,
  ReleaseTrendChart,
  ScorePriceScatterChart,
  StoreSavingsChart,
} from '@/features/analytics/charts'
import { StoreStatsTable } from '@/features/analytics/StoreStatsTable'
import { TopDealsTable } from '@/features/analytics/TopDealsTable'
import { summaryStats, storeStats } from '@/features/analytics/stats'

const PAGE_SIZE = 60
const TOP_DEALS = 10

export default function AnalyticsPage() {
  // Подписка на смену валюты: KPI, таблицы и графики пересчитываются.
  useCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const pages = normalizeAnalyticsPages(Number(searchParams.get('pages')))
  const sampleSize = pages * PAGE_SIZE
  const dealsQuery = useAnalyticsDeals(pages)
  const storesQuery = useStores()
  const historyQuery = usePriceHistory()
  const publishBackdrop = useBackdropImagesStore()

  const deals = useMemo(() => dealsQuery.data ?? [], [dealsQuery.data])
  const stats = useMemo(() => summaryStats(deals), [deals])
  const lows = useGameLows(deals, 3)
  const storeRows = useMemo(
    () => storeStats(deals, storesQuery.data ?? []).filter((row) => row.count > 0),
    [deals, storesQuery.data],
  )
  const storesById = useMemo(
    () => new Map((storesQuery.data ?? []).map((store) => [store.storeID, store.storeName])),
    [storesQuery.data],
  )

  const exportCsv = () => {
    const header = [
      'title',
      'storeID',
      'storeName',
      'salePrice',
      'normalPrice',
      'savings',
      'dealRating',
      'link',
    ]
    const rows = deals.map((deal) => [
      deal.title,
      deal.storeID,
      storesById.get(deal.storeID) ?? '',
      deal.salePrice,
      deal.normalPrice,
      deal.savings,
      deal.dealRating,
      dealTargetUrl(deal),
    ])
    downloadCsv(`gamedeals-${new Date().toISOString().slice(0, 10)}.csv`, header, rows)
  }

  const changeSampleSize = (next: number) => {
    setSearchParams(next === ANALYTICS_PAGES ? {} : { pages: String(next) }, {
      replace: true,
      preventScrollReset: true,
    })
  }

  useEffect(() => {
    publishBackdrop(deals.slice(0, 8).map((deal) => deal.thumb))
  }, [deals, publishBackdrop])

  const lowItems = useMemo(
    () =>
      lows
        .filter((item) => item.low !== undefined && item.low > 0)
        .map((item) => ({ title: item.deal.title, current: item.deal.salePrice, low: item.low! })),
    [lows],
  )

  const history = historyQuery.data
  const hasHistory = (history?.points.length ?? 0) >= 2
  const isLoading = dealsQuery.isPending
  const isLoadingLows = isLoading || lows.some((item) => item.isLoading)

  if (dealsQuery.isError && deals.length === 0) {
    return (
      <ErrorState
        message={
          dealsQuery.error instanceof Error
            ? dealsQuery.error.message
            : 'Не удалось загрузить данные'
        }
        onRetry={() => void dealsQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Аналитика"
        title="Аналитика скидок"
        description={
          <>
            Выборка из <strong className="tabular-nums">{deals.length || sampleSize}</strong> лучших
            предложений по рейтингу сделки. Данные CheapShark, обновлено{' '}
            {dealsQuery.dataUpdatedAt ? formatRelativeDate(dealsQuery.dataUpdatedAt) : '—'}.
          </>
        }
        actions={
          <label className="flex items-center gap-2 text-xs text-ink-2">
            Выборка
            <select
              className="input w-auto py-1.5"
              value={pages}
              onChange={(event) => changeSampleSize(Number(event.target.value))}
            >
              {ANALYTICS_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option * PAGE_SIZE} сделок
                </option>
              ))}
            </select>
          </label>
        }
      />

      {dealsQuery.isError && deals.length > 0 && (
        <p className="rounded-lg border border-caution/30 bg-caution-tint px-3 py-2 text-xs text-caution">
          Часть данных не удалось обновить: показана последняя загруженная выборка.
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Предложений в выборке"
            value={stats.count.toLocaleString('ru-RU')}
            hint="Лучшие сделки по рейтингу CheapShark"
            icon={<Layers className="size-4" aria-hidden />}
          />
          <StatCard
            label="Средняя скидка"
            value={formatPercent(stats.avgSavings, 1)}
            tone="positive"
            hint={`Медиана ${formatPercent(stats.medianSavings, 1)}`}
            icon={<Percent className="size-4" aria-hidden />}
          />
          <StatCard
            label="Максимальная скидка"
            value={formatPercent(stats.maxSavings)}
            tone="accent"
            icon={<Flame className="size-4" aria-hidden />}
          />
          <StatCard
            label="Суммарная экономия"
            value={formatPrice(stats.totalSaving, { compact: true })}
            hint="Разница цен до и после скидки"
            icon={<PiggyBank className="size-4" aria-hidden />}
          />
        </div>
      )}

      {!isLoading && deals.length > 0 && (
        <section className="card overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Flame className="size-4 text-accent" aria-hidden />
              Топ-{TOP_DEALS} сделок
            </h2>
            <button type="button" className="btn btn-outline h-7 px-2 text-xs" onClick={exportCsv}>
              <Download className="size-3.5" aria-hidden />
              Экспорт CSV
            </button>
          </header>
          <TopDealsTable deals={deals} storesById={storesById} limit={TOP_DEALS} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Распределение скидок"
          subtitle="Сколько предложений попадает в каждую корзину"
          isLoading={isLoading}
        >
          <DiscountHistogramChart deals={deals} />
        </ChartCard>

        <ChartCard
          title="Средняя скидка по магазинам"
          subtitle="Топ-10 магазинов по числу предложений"
          isLoading={isLoading}
        >
          <StoreSavingsChart deals={deals} stores={storesQuery.data ?? []} />
        </ChartCard>

        <ChartCard
          title="Тенденции по годам выхода"
          subtitle="Средняя цена со скидкой и средний размер скидки"
          className="lg:col-span-2"
          isLoading={isLoading}
        >
          <ReleaseTrendChart deals={deals} />
        </ChartCard>

        <ChartCard
          title="Оценка Metacritic и цена"
          subtitle="Размер точки — число отзывов в Steam"
          isLoading={isLoading}
        >
          <ScorePriceScatterChart deals={deals} />
        </ChartCard>

        <ChartCard
          title="Текущая цена против исторического минимума"
          subtitle="Чем ближе текущая цена к историческому минимуму, тем удачнее момент покупки"
          isLoading={isLoadingLows}
        >
          {lowItems.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-ink-2">
              Недостаточно данных
            </p>
          ) : (
            <LowComparisonChart items={lowItems} />
          )}
        </ChartCard>
      </div>

      <section className="space-y-3">
        <SectionTitle
          eyebrow="Динамика"
          title="Динамика цен"
          subtitle="Ежедневные снапшоты, которые собирает GitHub Actions проекта"
          right={
            history?.updatedAt ? (
              <span className="text-xs text-ink-2">Обновлено {history.updatedAt}</span>
            ) : null
          }
        />
        {hasHistory ? (
          <ChartCard
            title="Средняя цена и медианная скидка по дням"
            subtitle="История собирается с запуска проекта"
          >
            <PriceHistoryChart history={history!} />
          </ChartCard>
        ) : (
          <div className="card flex items-start gap-3 p-4 text-sm text-ink-2">
            <Info className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">История цен ещё собирается</p>
              <p className="text-ink-2">
                У CheapShark нет истории цен, поэтому проект сохраняет свои снапшоты. График
                появится после нескольких дней.
              </p>
            </div>
          </div>
        )}
      </section>

      <StoreStatsTable rows={storeRows} />
    </div>
  )
}
