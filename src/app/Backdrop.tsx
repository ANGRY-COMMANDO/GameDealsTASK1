import { useEffect, useMemo, useState } from 'react'
import { useBackdropImages } from '@/shared/lib/backdrop'

const TILES = 6
const ROTATE_MS = 24_000

/** Набор обложек, который медленно сдвигается по кругу: обои для Mica-фона. */
function useRotatingTiles(images: string[]) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (images.length <= TILES) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(
      () => setOffset((value) => (value + 1) % Math.ceil(images.length / TILES)),
      ROTATE_MS,
    )
    return () => window.clearInterval(timer)
  }, [images])

  return useMemo(() => {
    if (images.length === 0) return []
    const count = Math.min(TILES, images.length)
    const start = offset * count
    return Array.from({ length: count }, (_, index) => images[(start + index) % images.length]!)
  }, [images, offset])
}

/**
 * Фон в духе Fluent Mica: обои из обложек игр сильно размываются и
 * приглушаются, поверх ложится плотная вуаль темы и лёгкая текстура шума.
 * Все анимации — только opacity/transform.
 */
export function Backdrop() {
  const images = useBackdropImages()
  const tiles = useRotatingTiles(images)

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-mica">
      {tiles.length > 0 && (
        <div
          key={tiles.join('|')}
          className="animate-fade-in absolute inset-[-15%] flex transform-gpu opacity-25 blur-3xl brightness-105 saturate-50"
          style={{ animationDuration: '1800ms' }}
        >
          {tiles.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              width={460}
              height={215}
              loading="lazy"
              fetchPriority="low"
              decoding="async"
              className="min-w-0 flex-1 scale-110 object-cover"
            />
          ))}
        </div>
      )}

      {/* Вуаль Mica: делает обои едва заметным оттенком, сохраняя контраст текста. */}
      <div className="absolute inset-0 bg-[var(--mica-veil)]" />
      <div className="bg-noise absolute inset-0 opacity-[0.02] mix-blend-overlay dark:opacity-[0.035]" />
    </div>
  )
}
