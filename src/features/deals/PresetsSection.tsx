import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BookmarkPlus, X } from 'lucide-react'
import { describeFilters, type Filters } from './filters'
import { loadPresets, removePreset, savePreset, type FilterPreset } from './presets'

type PresetsSectionProps = {
  filters: Filters
  applyPreset: (search: string) => void
  /** Вызывается перед применением: сбрасывает локальный ввод числовых полей. */
  onApply: () => void
}

/** Сохранённые пользователем наборы фильтров. */
export function PresetsSection({ filters, applyPreset, onApply }: PresetsSectionProps) {
  const [searchParams] = useSearchParams()
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets())

  const saveCurrent = () => {
    setPresets(
      savePreset({
        id: crypto.randomUUID(),
        name: describeFilters(filters),
        search: searchParams.toString(),
      }),
    )
  }

  const apply = (preset: FilterPreset) => {
    onApply()
    applyPreset(preset.search)
  }

  return (
    <section className="space-y-2 border-t border-stroke pt-3">
      <span className="text-xs font-semibold text-ink-2">Мои пресеты</span>
      {presets.length === 0 ? (
        <p className="text-xs text-ink-3">
          Сохраните текущие фильтры, чтобы вернуться к ним в один клик.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <li key={preset.id} className="inline-flex">
              <button
                type="button"
                className="chip rounded-r-none border-r-0"
                onClick={() => apply(preset)}
              >
                {preset.name}
              </button>
              <button
                type="button"
                className="chip rounded-l-none px-1.5"
                aria-label={`Удалить пресет ${preset.name}`}
                onClick={() => setPresets(removePreset(preset.id))}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-outline h-7 px-2 text-xs" onClick={saveCurrent}>
        <BookmarkPlus className="size-3.5" aria-hidden />
        Сохранить текущие
      </button>
    </section>
  )
}
