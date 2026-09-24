import { expect, test, type Page } from './fixtures'

/**
 * View Transitions API может отменить переход, если во время анимации изменился
 * размер вьюпорта (частый случай в мобильной эмуляции Chromium). Это безобидный
 * внутренний abort браузера, а не сбой приложения.
 */
const IGNORED_PAGE_ERRORS = [/Transition was aborted because of invalid state/]

/** Собираем ошибки консоли, чтобы падать на реальных сбоях, а не только на вёрстке. */
function collectErrors(page: Page) {
  const errors: string[] = []
  const isKnownBrowserQuirk = (text: string) =>
    IGNORED_PAGE_ERRORS.some((pattern) => pattern.test(text))
  page.on('pageerror', (error) => {
    if (!isKnownBrowserQuirk(error.message)) errors.push(`pageerror: ${error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() === 'error' && !isKnownBrowserQuirk(message.text())) {
      errors.push(`console: ${message.text()}`)
    }
  })
  return errors
}

test.describe('каталог скидок', () => {
  test('показывает карточки с ценой и ссылкой в магазин', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Скидки на PC-игры' })).toBeVisible()

    const cards = page.locator('article')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(3)

    const firstLink = cards.first().getByRole('link', { name: /В магазин/i })
    await expect(firstLink).toHaveAttribute(
      'href',
      /^(https:\/\/store\.steampowered\.com\/app\/|https:\/\/www\.cheapshark\.com\/redirect\?dealID=)/,
    )
    await expect(cards.first().getByText(/\$\s?/).first()).toBeVisible()

    expect(errors).toEqual([])
  })

  test('поиск по названию меняет выдачу', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: 'Поиск игр' }).fill('witcher')

    await expect(page).toHaveURL(/title=witcher/)
    await expect(page.locator('article').first()).toContainText(/witcher/i)
  })

  test('ссылка в магазин не кодирует dealID повторно', async ({ page }) => {
    await page.goto('/')

    // Darksiders III — не Steam, значит ведёт через редирект CheapShark.
    // dealID в ответе API уже percent-encoded — повторное кодирование ломало ссылку.
    const card = page.locator('article', { hasText: 'Darksiders III' })
    await expect(card).toBeVisible()
    await expect(card.getByRole('link', { name: /В магазин/i })).toHaveAttribute(
      'href',
      'https://www.cheapshark.com/redirect?dealID=enc%2Boded%3D',
    )
  })

  test('подсказки поиска ведут на страницу игры', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('combobox', { name: 'Поиск игр' }).fill('witcher')

    // Фон списка должен быть непрозрачным, иначе текст теряется на обложках.
    const list = page.getByRole('list', { name: 'Подсказки поиска' })
    await expect(list).toBeVisible()
    const background = await list.evaluate((node) => getComputedStyle(node).backgroundColor)
    expect(background).not.toBe('rgba(0, 0, 0, 0)')

    await page.getByRole('button', { name: 'The Witcher 3: Wild Hunt', exact: true }).click()

    await expect(page).toHaveURL(/\/game\/292030/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Witcher 3: Wild Hunt')
  })

  test('Enter по точному названию открывает страницу игры', async ({ page }) => {
    await page.goto('/')
    const input = page.getByRole('combobox', { name: 'Поиск игр' })
    await input.fill('The Witcher 3: Wild Hunt')
    await expect(
      page.getByRole('button', { name: 'The Witcher 3: Wild Hunt', exact: true }),
    ).toBeVisible()
    await input.press('Enter')

    await expect(page).toHaveURL(/\/game\/292030/)
  })

  test('поиск можно расширить на игры без скидки', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    await page.getByRole('combobox', { name: 'Поиск игр' }).fill('witcher')
    await expect(page.getByText('Ищем только среди скидок.')).toBeVisible()

    await page.getByRole('button', { name: 'Показать все цены' }).click()
    await expect(page).toHaveURL(/sale=0/)
    await expect(page.getByText('Ищем только среди скидок.')).toHaveCount(0)
  })

  test('пресет фильтров сохраняется и применяется', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    await page.getByRole('button', { name: 'Скидка ≥ 50%' }).click()
    await expect(page).toHaveURL(/savings=50/)

    const isMobile = testInfo.project.name === 'mobile'
    if (isMobile) await page.getByRole('button', { name: /Фильтры/ }).click()
    const scope = isMobile ? page.locator('dialog[open]') : page

    await scope.getByRole('button', { name: 'Сохранить текущие' }).click()
    const preset = scope.getByRole('button', { name: 'скидка 50%+', exact: true })
    await expect(preset).toBeVisible()
    if (isMobile) await page.getByRole('button', { name: 'Показать результаты' }).click()

    // Снимаем фильтр и возвращаем его сохранённым пресетом.
    await page.getByRole('button', { name: 'Скидка ≥ 50%' }).click()
    await expect(page).not.toHaveURL(/savings=50/)

    if (isMobile) await page.getByRole('button', { name: /Фильтры/ }).click()
    await scope.getByRole('button', { name: 'скидка 50%+', exact: true }).click()
    if (isMobile) await page.getByRole('button', { name: 'Показать результаты' }).click()
    await expect(page).toHaveURL(/savings=50/)
  })

  test('быстрый фильтр скидки включается и выключается', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    const chip = page.getByRole('button', { name: 'Скидка ≥ 50%' })
    await expect(chip).toHaveAttribute('aria-pressed', 'false')

    await chip.click()
    await expect(page).toHaveURL(/savings=50/)
    await expect(chip).toHaveAttribute('aria-pressed', 'true')

    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await expect(page).not.toHaveURL(/savings=50/)
  })

  test('мультивыбор магазинов синхронизирован с URL и чипсами', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    const isMobile = testInfo.project.name === 'mobile'
    if (isMobile) await page.getByRole('button', { name: /Фильтры/ }).click()
    const scope = isMobile ? page.locator('dialog[open]') : page

    const gog = scope.getByRole('checkbox', { name: 'GOG' })
    const humble = scope.getByRole('checkbox', { name: 'Humble Store' })
    await gog.click()
    await expect(gog).toBeChecked()
    await humble.click()
    await expect(humble).toBeChecked()
    if (isMobile) await page.getByRole('button', { name: 'Показать результаты' }).click()

    await expect(page).toHaveURL(/store=7%2C11/)

    const chip = page.getByRole('button', { name: 'Убрать фильтр Магазин: GOG' })
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(page).toHaveURL(/store=11/)
  })

  test('переключает направление сортировки', async ({ page }, testInfo) => {
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/1.0/deals')) requests.push(request.url())
    })

    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    const isMobile = testInfo.project.name === 'mobile'
    if (isMobile) await page.getByRole('button', { name: /Фильтры/ }).click()
    const scope = isMobile ? page.locator('dialog[open]') : page
    await scope.getByRole('button', { name: 'Переключить на возрастание' }).click()

    await expect(page).toHaveURL(/desc=0/)
    // «Deal Rating» по умолчанию убывает, поэтому для возрастания клиент шлёт desc=1.
    await expect.poll(() => requests.some((url) => url.includes('desc=1'))).toBe(true)
  })

  test('фильтр по тегам сужает список', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()

    // На телефоне панель фильтров открывается в шторке.
    const isMobile = testInfo.project.name === 'mobile'
    if (isMobile) await page.getByRole('button', { name: /Фильтры/ }).click()
    const scope = isMobile ? page.locator('dialog[open]') : page

    const tag = scope.getByRole('button', { name: /^RPG$/ }).first()
    await expect(tag).toBeVisible()
    await tag.click()

    await expect(page).toHaveURL(/tags=rpg/)
    if (isMobile) {
      await page.getByRole('button', { name: 'Показать результаты' }).click()
      await expect(page.getByRole('button', { name: /Фильтры/ })).toContainText('1')
    } else {
      await expect(page.getByRole('button', { name: /Убрать тег RPG/ }).first()).toBeVisible()
    }
  })
})

test.describe('страница игры', () => {
  test('открывается из карточки и показывает предложения магазинов', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await page.locator('article h3 a').first().click()

    await expect(page).toHaveURL(/\/game\/\d+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Минимум за всё время')).toBeVisible()
    await expect(page.getByText('Предложения магазинов')).toBeVisible()

    expect(errors).toEqual([])
  })

  test('показывает динамику цены и запоминает избранное', async ({ page }) => {
    await page.goto('/game/292030')

    await expect(page.getByRole('heading', { name: 'Динамика цены' })).toBeVisible()

    await page.getByRole('button', { name: 'В избранное' }).click()
    await expect(page.getByRole('button', { name: 'В избранном' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'В избранном' })).toBeVisible()
  })

  test('повторный заход в игру не дублирует запрос', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/1.0/games?id=')) requests.push(request.url())
    })

    await page.goto('/')
    await expect(page.locator('article').first()).toBeVisible()
    await page.locator('article h3 a').first().click()
    await expect(page).toHaveURL(/\/game\/\d+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('link', { name: 'Все скидки' }).click()
    await expect(page.locator('article').first()).toBeVisible()
    await page.locator('article h3 a').first().click()
    await expect(page).toHaveURL(/\/game\/\d+/)

    expect(new Set(requests).size).toBe(1)
  })
})

test.describe('избранное', () => {
  test('вкладка показывает избранные игры и умеет убирать их', async ({ page }, testInfo) => {
    await page.goto('/game/292030')
    await page.getByRole('button', { name: 'В избранное' }).click()
    await expect(page.getByRole('button', { name: 'В избранном' })).toBeVisible()

    const isMobile = testInfo.project.name === 'mobile'
    const nav = isMobile
      ? page.getByRole('navigation', { name: 'Мобильная навигация' })
      : page.getByRole('navigation', { name: 'Основная навигация' })
    await nav.getByRole('link', { name: 'Избранное' }).click()

    await expect(page).toHaveURL(/\/favorites/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Избранное')
    await expect(page.getByRole('link', { name: 'The Witcher 3: Wild Hunt' })).toBeVisible()

    await page.getByRole('button', { name: /Убрать из избранного/ }).click()
    await expect(page.getByText('В избранном пусто')).toBeVisible()
  })
})

test.describe('аналитика', () => {
  test('рисует графики и KPI', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/analytics')

    await expect(page.getByRole('heading', { name: 'Аналитика скидок' })).toBeVisible()
    await expect(page.getByText('Средняя скидка', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Топ-10 сделок' })).toBeVisible()
    await expect(page.locator('canvas').first()).toBeVisible()
    expect(await page.locator('canvas').count()).toBeGreaterThanOrEqual(4)

    expect(errors).toEqual([])
  })

  test('переключает размер выборки', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: 'Аналитика скидок' })).toBeVisible()

    await page.getByRole('combobox', { name: 'Выборка' }).selectOption('5')
    await expect(page).toHaveURL(/pages=5/)
    await expect(page.getByRole('heading', { name: 'Топ-10 сделок' })).toBeVisible()
  })
})

test.describe('валюта', () => {
  test('переключает цены на рубли и предупреждает о неточности', async ({ page }, testInfo) => {
    await page.goto('/')
    const card = page.locator('article').first()
    await expect(card).toBeVisible()
    await expect(card).not.toContainText('₽')
    await expect(page.getByText(/Конвертация ориентировочная/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Рубли' }).click()
    await expect(card).toContainText('≈')
    await expect(card).toContainText('₽')
    await expect(page.getByText(/Конвертация ориентировочная/)).toBeVisible()

    // Фильтры и быстрые пресеты тоже пересчитываются в рубли.
    await expect(page.getByRole('button', { name: /^До ≈/ })).toBeVisible()
    const isMobile = testInfo.project.name === 'mobile'
    if (isMobile) await page.getByRole('button', { name: /Фильтры/ }).click()
    const panel = isMobile ? page.locator('dialog[open]') : page.locator('aside')
    await expect(panel.getByText(/Цена, ≈ ₽/)).toBeVisible()

    await page.reload()
    await expect(page.locator('article').first()).toContainText('₽')
    await expect(page.getByText(/Конвертация ориентировочная/)).toBeVisible()
  })
})

test.describe('оформление', () => {
  test('тёмная тема переключается и сохраняется', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: /Переключить тему/i })
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('мобильная навигация и шторка фильтров доступны на телефоне', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'только для мобильного проекта')
    await page.goto('/')

    await expect(page.getByRole('navigation', { name: 'Мобильная навигация' })).toBeVisible()
    await page.getByRole('button', { name: /Фильтры/ }).click()

    const dialog = page.locator('dialog[open]')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Сортировка')).toBeVisible()

    await page.getByRole('button', { name: 'Показать результаты' }).click()
    await expect(page.locator('dialog[open]')).toHaveCount(0)
  })
})
