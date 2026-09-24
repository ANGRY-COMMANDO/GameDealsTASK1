import { Link } from 'react-router'
import { Flame } from 'lucide-react'
import { LogoMark } from '@/shared/ui/Logo'

export default function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-lg space-y-4 p-10 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-xl border border-stroke bg-surface shadow-e4">
        <LogoMark className="size-9" />
      </span>
      <p className="font-display text-5xl font-semibold text-accent">404</p>
      <h1 className="text-lg font-semibold">Страница не найдена</h1>
      <p className="text-sm text-ink-2">Возможно, ссылка устарела или в адресе опечатка.</p>
      <Link to="/" viewTransition className="btn btn-primary mx-auto">
        <Flame className="size-4" aria-hidden />
        Вернуться к скидкам
      </Link>
    </div>
  )
}
