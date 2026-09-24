import { useMemo, type ReactNode } from 'react'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { Bar, Line, Scatter } from 'react-chartjs-2'
import type { Deal, PriceHistory, Store } from '@/shared/api/schemas'
import { formatPrice } from '@/shared/lib/format'
import { useCurrency } from '@/shared/lib/currency'
import { useIsDarkMode } from '@/shared/lib/useIsDarkMode'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/primitives'
import {
  discountHistogram,
  releaseYearStats,
  scorePricePoints,
  storeStats,
  type LowComparisonItem,
} from './stats'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

ChartJS.defaults.font.family =
  "'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"

const BRAND = '#7c3aed'
const BRAND_DARK = '#a78bfa'
const BRAND_SOFT = 'rgba(124, 58, 237, 0.45)'
const BRAND_FILL = 'rgba(124, 58, 237, 0.14)'
const TEAL = '#038387'
const TEAL_DARK = '#4cc2c4'
const SUCCESS = '#0f7b0f'
const SUCCESS_DARK = '#6ccb5f'
const SUCCESS_SOFT = 'rgba(15, 123, 15, 0.3)'
const CAUTION = '#c19c00'
const CAUTION_DARK = '#fce100'

const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

type ChartTheme = ReturnType<typeof useChartTheme>

function useChartTheme() {
  const isDark = useIsDarkMode()
  const currency = useCurrency()
  return useMemo(
    () => ({
      isDark,
      currency,
      money: (value: number) => formatPrice(value),
      priceAxis: currency === 'RUB' ? 'Цена, ₽' : 'Цена, $',
      text: isDark ? '#c7c7c7' : '#5c5c5c',
      grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      brand: isDark ? BRAND_DARK : BRAND,
      brandSoft: isDark ? 'rgba(167, 139, 250, 0.45)' : BRAND_SOFT,
      brandFill: isDark ? 'rgba(167, 139, 250, 0.14)' : BRAND_FILL,
      teal: isDark ? TEAL_DARK : TEAL,
      success: isDark ? SUCCESS_DARK : SUCCESS,
      successSoft: isDark ? 'rgba(108, 203, 95, 0.3)' : SUCCESS_SOFT,
      caution: isDark ? CAUTION_DARK : CAUTION,
      tooltip: {
        backgroundColor: isDark ? '#2b2b2b' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#1b1b1b',
        bodyColor: isDark ? '#c7c7c7' : '#5c5c5c',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        displayColors: false,
      },
    }),
    [isDark, currency],
  )
}

/** Общие для всех графиков настройки и цвета темы. */
function baseOptions() {
  return { responsive: true, maintainAspectRatio: false }
}

function legendOptions(theme: ChartTheme) {
  return { labels: { color: theme.text, usePointStyle: true, boxWidth: 8 } }
}

function themeTooltip<T extends object>(theme: ChartTheme, extra?: T) {
  return { ...theme.tooltip, ...extra }
}

function priceTicks(theme: ChartTheme) {
  return { color: theme.text, callback: (value: string | number) => theme.money(Number(value)) }
}

export function ChartCard({
  title,
  subtitle,
  isLoading = false,
  children,
  className,
}: {
  title: string
  subtitle?: string
  isLoading?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('card p-4', className)}>
      <header className="mb-3">
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-ink-2">{subtitle}</p>}
      </header>
      <div className="relative h-64 sm:h-72">
        {isLoading ? <Skeleton className="h-full" /> : children}
      </div>
    </section>
  )
}

export function DiscountHistogramChart({ deals }: { deals: Deal[] }) {
  const theme = useChartTheme()
  const buckets = useMemo(() => discountHistogram(deals), [deals])

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      ...baseOptions(),
      plugins: {
        legend: { display: false },
        tooltip: themeTooltip(theme, {
          callbacks: { label: (ctx: TooltipItem<'bar'>) => `${ctx.parsed.y} предложений` },
        }),
      },
      scales: {
        x: { ticks: { color: theme.text, maxRotation: 0 }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: theme.text, precision: 0 },
          grid: { color: theme.grid },
        },
      },
    }),
    [theme],
  )

  const data = useMemo(
    () => ({
      labels: buckets.map((bucket) => bucket.label),
      datasets: [
        {
          label: 'Предложений',
          data: buckets.map((bucket) => bucket.count),
          backgroundColor: theme.brandSoft,
          hoverBackgroundColor: theme.brand,
          borderRadius: 6,
        },
      ],
    }),
    [buckets, theme],
  )

  return <Bar options={options} data={data} />
}

export function StoreSavingsChart({ deals, stores }: { deals: Deal[]; stores: Store[] }) {
  const theme = useChartTheme()
  const stats = useMemo(() => storeStats(deals, stores).slice(0, 10), [deals, stores])

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      ...baseOptions(),
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: themeTooltip(theme, {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              const stat = stats[ctx.dataIndex]
              return stat ? `Средняя скидка ${stat.avgSavings.toFixed(1)}% · ${stat.count} шт.` : ''
            },
          },
        }),
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: { color: theme.text, callback: (value: string | number) => `${value}%` },
          grid: { color: theme.grid },
        },
        y: { ticks: { color: theme.text }, grid: { display: false } },
      },
    }),
    [theme, stats],
  )

  const data = useMemo(
    () => ({
      labels: stats.map((stat) => stat.name),
      datasets: [
        {
          label: 'Средняя скидка',
          data: stats.map((stat) => Number(stat.avgSavings.toFixed(1))),
          backgroundColor: theme.successSoft,
          hoverBackgroundColor: theme.success,
          borderRadius: 6,
        },
      ],
    }),
    [stats, theme],
  )

  return <Bar options={options} data={data} />
}

export function ReleaseTrendChart({ deals }: { deals: Deal[] }) {
  const theme = useChartTheme()
  const stats = useMemo(() => releaseYearStats(deals), [deals])

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      ...baseOptions(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legendOptions(theme),
        tooltip: themeTooltip(theme, { displayColors: true }),
      },
      scales: {
        x: { ticks: { color: theme.text }, grid: { display: false } },
        y: {
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: theme.priceAxis, color: theme.text },
          ticks: priceTicks(theme),
          grid: { color: theme.grid },
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          max: 100,
          title: { display: true, text: 'Средняя скидка, %', color: theme.text },
          ticks: { color: theme.text },
          grid: { display: false },
        },
      },
    }),
    [theme],
  )

  const data = useMemo(
    () => ({
      labels: stats.map((stat) => stat.year),
      datasets: [
        {
          label: 'Средняя цена',
          data: stats.map((stat) => Number(stat.avgPrice.toFixed(2))),
          borderColor: theme.brand,
          backgroundColor: theme.brandFill,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          yAxisID: 'y',
        },
        {
          label: 'Средняя скидка',
          data: stats.map((stat) => Number(stat.avgSavings.toFixed(1))),
          borderColor: theme.teal,
          backgroundColor: 'transparent',
          tension: 0.35,
          pointRadius: 3,
          borderDash: [6, 4],
          yAxisID: 'y1',
        },
      ],
    }),
    [stats, theme],
  )

  return <Line options={options} data={data} />
}

export function ScorePriceScatterChart({ deals }: { deals: Deal[] }) {
  const theme = useChartTheme()
  const points = useMemo(() => scorePricePoints(deals), [deals])

  const options = useMemo<ChartOptions<'scatter'>>(
    () => ({
      ...baseOptions(),
      plugins: {
        legend: { display: false },
        tooltip: themeTooltip(theme, {
          callbacks: {
            label: (ctx: TooltipItem<'scatter'>) => {
              const raw = ctx.raw as { label?: string; x: number; y: number }
              return `${raw.label ?? ''}: MC ${raw.x}, ${theme.money(raw.y)}`
            },
          },
        }),
      },
      scales: {
        x: {
          min: 40,
          max: 100,
          title: { display: true, text: 'Metacritic', color: theme.text },
          ticks: { color: theme.text },
          grid: { color: theme.grid },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: theme.priceAxis, color: theme.text },
          ticks: priceTicks(theme),
          grid: { color: theme.grid },
        },
      },
    }),
    [theme],
  )

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Игры',
          data: points,
          backgroundColor: 'rgba(139, 92, 246, 0.45)',
          borderColor: theme.brand,
          borderWidth: 1,
        },
      ],
    }),
    [points, theme],
  )

  return <Scatter options={options} data={data} />
}

export function LowComparisonChart({ items }: { items: LowComparisonItem[] }) {
  const theme = useChartTheme()

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      ...baseOptions(),
      plugins: {
        legend: legendOptions(theme),
        tooltip: themeTooltip(theme, {
          displayColors: true,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              `${ctx.dataset.label}: ${theme.money(ctx.parsed.y ?? 0)}`,
          },
        }),
      },
      scales: {
        x: {
          ticks: {
            color: theme.text,
            callback(value) {
              const label = String(this.getLabelForValue(Number(value)))
              return label.length > 18 ? `${label.slice(0, 17)}…` : label
            },
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: priceTicks(theme),
          grid: { color: theme.grid },
        },
      },
    }),
    [theme],
  )

  const data = useMemo(
    () => ({
      labels: items.map((item) => item.title),
      datasets: [
        {
          label: 'Сейчас',
          data: items.map((item) => Number(item.current.toFixed(2))),
          backgroundColor: theme.brand,
          borderRadius: 6,
        },
        {
          label: 'Исторический минимум',
          data: items.map((item) => Number(item.low.toFixed(2))),
          backgroundColor: theme.successSoft,
          borderRadius: 6,
        },
      ],
    }),
    [items, theme],
  )

  return <Bar options={options} data={data} />
}

export function PriceHistoryChart({ history }: { history: PriceHistory }) {
  const theme = useChartTheme()
  const points = history.points

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      ...baseOptions(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legendOptions(theme),
        tooltip: themeTooltip(theme, {
          displayColors: true,
          callbacks: {
            label: (ctx: TooltipItem<'line'>) =>
              ctx.datasetIndex === 0
                ? `${ctx.dataset.label}: ${theme.money(ctx.parsed.y ?? 0)}`
                : `${ctx.dataset.label}: ${ctx.parsed.y ?? 0}%`,
          },
        }),
      },
      scales: {
        x: { ticks: { color: theme.text, maxRotation: 0 }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: priceTicks(theme),
          grid: { color: theme.grid },
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          max: 100,
          ticks: { color: theme.text, callback: (value: string | number) => `${value}%` },
          grid: { display: false },
        },
      },
    }),
    [theme],
  )

  const data = useMemo(
    () => ({
      labels: points.map((point) =>
        point.date ? dayLabel.format(new Date(`${point.date}T00:00:00`)) : point.date,
      ),
      datasets: [
        {
          label: 'Средняя цена скидки',
          data: points.map((point) => point.avgPrice),
          borderColor: theme.brand,
          backgroundColor: theme.brandFill,
          fill: true,
          tension: 0.35,
          yAxisID: 'y',
        },
        {
          label: 'Медианная скидка, %',
          data: points.map((point) => point.medianSavings),
          borderColor: theme.caution,
          borderDash: [6, 4],
          tension: 0.35,
          yAxisID: 'y1',
        },
      ],
    }),
    [points, theme],
  )

  return <Line options={options} data={data} />
}
