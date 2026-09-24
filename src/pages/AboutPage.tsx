import { Link } from 'react-router'
import { Database, Gamepad2, GraduationCap, Layers } from 'lucide-react'
import { PageHeader } from '@/shared/ui/primitives'

const FEATURES = [
  'Каталог: поиск с подсказками, фильтры по магазинам, цене, скидке, Metacritic и тегам, сортировки и бесконечная лента.',
  'Страница игры: предложения магазинов, минимум за всё время, динамика цены и избранное.',
  'Аналитика: KPI, графики по выборке лучших сделок и экспорт данных.',
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="О проекте"
        title="GameDeals"
        description="SPA для поиска скидок на PC-игры на данных CheapShark API. React, TypeScript, Vite."
      />

      <section className="card space-y-2 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <GraduationCap className="size-4 text-accent" aria-hidden />
          Задание
        </p>
        <p className="text-sm text-ink-2">
          Задание 1. Фасттрек по предмету «Кроссплатформенная разработка».
        </p>
        <p className="text-sm text-ink-2">Автор: Дьяченко Антон.</p>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Layers className="size-4 text-accent" aria-hidden />
          Что умеет
        </h2>
        <ul className="card space-y-2 p-5 text-sm text-ink-2">
          {FEATURES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Database className="size-4 text-accent" aria-hidden />
          Данные
        </h2>
        <p className="card p-5 text-sm text-ink-2">
          Цены и магазины — CheapShark API. Теги, владельцы и дневные снапшоты цен собирает GitHub
          Actions. У CheapShark нет истории цен, поэтому графики строятся по собственным снапшотам.
          Цены кэшируются примерно на час и обновляются по мере запросов — это бережёт лимит API.
          Доллары — как в источнике, рубли — ориентировочная конвертация по курсу без учёта
          региональных цен и налогов.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/" viewTransition className="btn btn-primary">
          <Gamepad2 className="size-4" aria-hidden />К скидкам
        </Link>
        <a
          className="btn btn-outline"
          href="https://apidocs.cheapshark.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Документация CheapShark
        </a>
      </div>
    </div>
  )
}
