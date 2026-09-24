import { Link, useRouteError } from 'react-router'
import { ErrorState } from '@/shared/ui/primitives'

export function RouteError() {
  const error = useRouteError()
  const message =
    error instanceof Error ? error.message : 'Что-то пошло не так при загрузке страницы.'

  return (
    <div className="mx-auto max-w-lg space-y-4 py-10">
      <ErrorState message={message} />
      <div className="text-center">
        <Link to="/" viewTransition className="link">
          ← Вернуться к списку скидок
        </Link>
      </div>
    </div>
  )
}
