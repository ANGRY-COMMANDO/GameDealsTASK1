import { cn } from '@/shared/lib/utils'

/**
 * Фирменный знак GameDeals — геймпад в стиле Fluent 2.
 * Геометрия один-в-один с мастер-SVG: public/logo.svg и public/logo-dark.svg
 * (из них же рендерятся иконки сайта скриптом scripts/generate-icons.mjs).
 */
const PAD_BODY =
  'M21 15H43C46.6 15 49.9 17.1 51.4 20.4L57.2 32.6C59.6 37.7 57.4 43.7 52.4 46.1C47.9 48.2 42.6 46.6 39.9 42.5L37.9 39.4C36.7 37.6 34.7 36.5 32.5 36.5C30.3 36.5 28.3 37.6 27.1 39.4L25.1 42.5C22.4 46.6 17.1 48.2 12.6 46.1C7.6 43.7 5.4 37.7 7.8 32.6L13.6 20.4C15.1 17.1 18.4 15 21 15Z'

export function LogoMark({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className={cn(
        'size-6',
        glow && 'drop-shadow-[0_2px_3px_rgba(42,15,94,0.35)] dark:brightness-110',
        className,
      )}
    >
      <defs>
        <linearGradient id="gd-pad" x1="10" y1="13" x2="54" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient
          id="gd-sheen"
          x1="32"
          y1="13"
          x2="32"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="gd-shade"
          x1="32"
          y1="34"
          x2="32"
          y2="49"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1e0b45" stopOpacity="0" />
          <stop offset="1" stopColor="#1e0b45" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <path
        d={PAD_BODY}
        fill="url(#gd-pad)"
        stroke="#ffffff"
        strokeOpacity="0.14"
        strokeWidth="0.75"
      />
      <path d={PAD_BODY} fill="url(#gd-sheen)" />
      <path d={PAD_BODY} fill="url(#gd-shade)" />

      <g>
        <rect x="16" y="25.4" width="13" height="4.2" rx="2.1" fill="#ffffff" opacity="0.95" />
        <rect x="20.4" y="21" width="4.2" height="13" rx="2.1" fill="#ffffff" opacity="0.95" />

        <circle cx="44.5" cy="21.6" r="2.7" fill="#fce100" />
        <circle cx="38.6" cy="27.5" r="2.7" fill="#479ef5" />
        <circle cx="50.4" cy="27.5" r="2.7" fill="#e74856" />
        <circle cx="44.5" cy="33.4" r="2.7" fill="#6ccb5f" />

        <rect x="29.6" y="18.6" width="5" height="2.6" rx="1.3" fill="#ffffff" opacity="0.55" />
      </g>
    </svg>
  )
}

/** Логотип для шапки: знак на полупрозрачной acrylic-подложке с мягким акцентом. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('group inline-flex items-center gap-2.5', className)}>
      <span className="relative grid size-10 shrink-0 place-items-center rounded-lg border border-stroke bg-surface shadow-e2 transition duration-200 ease-fluent group-hover:shadow-e4">
        <span
          aria-hidden
          className="absolute inset-x-1 bottom-0 h-2 rounded-full bg-accent/25 blur-md"
        />
        <LogoMark className="relative size-6 transition duration-200 ease-fluent group-hover:scale-[1.06]" />
      </span>
      <span className="font-display text-[15px] leading-none font-semibold tracking-tight">
        Game<span className="text-accent">Deals</span>
      </span>
    </span>
  )
}
