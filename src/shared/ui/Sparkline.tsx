type SparklineProps = {
  values: number[]
  className?: string
  label: string
}

/**
 * Лёгкий SVG-график без Chart.js: линия и заливка цены по дням.
 * Соотношение сторон растягивается контейнером (`preserveAspectRatio="none"`).
 */
export function Sparkline({ values, className, label }: SparklineProps) {
  if (values.length < 2) return null

  const width = 320
  const height = 80
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values.map((value, index) => {
    const x = index * stepX
    const y = height - 6 - ((value - min) / span) * (height - 12)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = points.join(' ')
  const area = `0,${height} ${line} ${width},${height}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label={label}
      className={className}
    >
      <polygon points={area} className="fill-accent-tint" />
      <polyline
        points={line}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-accent"
      />
    </svg>
  )
}
