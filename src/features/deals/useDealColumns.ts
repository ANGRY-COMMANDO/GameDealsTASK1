import { useEffect, useState } from 'react'

/**
 * Сколько карточек в ряду сейчас показывает сетка. Брейкпоинты совпадают
 * с классами Tailwind (`sm:grid-cols-2 xl:grid-cols-3`), но виртуализатору
 * нужно знать число колонок явно.
 */
export function useDealColumns() {
  const [columns, setColumns] = useState(1)

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1280px)')
    const medium = window.matchMedia('(min-width: 640px)')
    const update = () => setColumns(wide.matches ? 3 : medium.matches ? 2 : 1)
    update()
    wide.addEventListener('change', update)
    medium.addEventListener('change', update)
    return () => {
      wide.removeEventListener('change', update)
      medium.removeEventListener('change', update)
    }
  }, [])

  return columns
}
