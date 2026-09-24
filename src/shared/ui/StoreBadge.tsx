import { memo } from 'react'
import { storeImage } from '@/shared/api/client'
import type { Store } from '@/shared/api/schemas'

export const StoreBadge = memo(function StoreBadge({ store }: { store?: Store }) {
  if (!store) return null
  const icon = store.images.icon
  return (
    <span className="inline-flex items-center rounded-[4px] border border-white/15 bg-black/60 p-0.5 text-white shadow-e2 backdrop-blur-md">
      {icon && (
        <img
          src={storeImage(icon)}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          className="size-4 rounded-[4px] bg-white/10"
        />
      )}
    </span>
  )
})
