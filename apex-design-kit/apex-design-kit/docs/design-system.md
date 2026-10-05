# Apex design system

Product: web account for advertisers of **Apexmedia** — video ads on screens mounted on supermarket shopping carts in Kazakhstan. A 7-second video plays when a shopper reaches the shelf the advertiser bought. Advertisers sign up, pick stores (list or map) and shelf zones, top up the balance and watch impression stats.

Platforms: desktop web (design width 1440) and mobile browser (design width 390). Languages: Kazakh, Russian, English. Themes: light and dark («Графит»).

Source of truth for every value: [`../tokens/tokens.json`](../tokens/tokens.json); the same values as CSS variables: [`../react/src/design-system/tokens.css`](../react/src/design-system/tokens.css) (`:root` = light, `[data-theme="dark"]` = dark). This document explains how to use those values.

## Themes

| Theme | When | Character |
|---|---|---|
| Light | default for the landing and for users with a light system theme | white surfaces on a cool off-white page, brand blue `#0423e7` on the one primary button and on links |
| Dark «Графит» | users with a dark system theme or who switch manually | neutral near-black, brand colour only on the primary button, links and the colour logo; the primary blue is lightened to `#3d5bff` because `#0423e7` disappears on a dark background |

- Initial theme = the OS setting (`prefers-color-scheme`).
- A ThemeToggle (moon in light, sun in dark) sits in the header and on auth screens; the manual choice is persisted and wins over the OS. Implemented by `ThemeProvider` / `useTheme` in [`../react/src/design-system/theme.tsx`](../react/src/design-system/theme.tsx): it sets `data-theme` on `<html>`.
- Every screen must be designed and checked in **both** themes.

## Colour tokens

All text tokens pass WCAG 4.5:1 on every surface they are allowed on, in both themes. `border-strong` passes 3:1 for input and control borders.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg` | `#f6f7fb` | `#0b0d17` | Фон страницы. Под ним ничего нет. |
| `surface` | `#ffffff` | `#151827` | Карточки, панели, формы, хедер-контролы. Главная поверхность поверх bg. |
| `surface-raised` | `#ffffff` | `#1c2033` | То, что парит: выпадающие меню, тосты, плавающие плашки. В светлой теме отделяется тенью, в тёмной — светлее surface. |
| `surface-muted` | `#eceef8` | `#151827` | Приглушённые зоны: дорожка переключателя языка, панель-иллюстрация в hero, неактивные кнопки. |
| `input-bg` | `#ffffff` | `#0f1220` | Фон полей ввода, OTP-ячеек, чекбоксов. |
| `border` | `#e2e5f0` | `#262a40` | Разделители и контуры карточек. Не для полей ввода — у них border-strong. |
| `border-strong` | `#868ca8` | `#636a8e` | Рамки полей ввода, чекбоксов и контурных кнопок. Контраст ≥3:1 к input-bg и surface в обеих темах. |
| `text` | `#0b1030` | `#eceef6` | Основной текст и заголовки на bg, surface, surface-raised, surface-muted. |
| `text-muted` | `#4a5072` | `#a0a5be` | Подзаголовки, описания, подписи к цифрам. ≥6.6:1 на любой поверхности. |
| `text-subtle` | `#646a8c` | `#8a90ab` | Плейсхолдеры, мелкие подписи 13px, футер. ≥4.5:1 на bg, surface и surface-muted. |
| `primary` | `#0423e7` | `#3d5bff` | Главное действие экрана (одна основная кнопка), активные состояния. В тёмной теме осветлён: фирменный #0423e7 сливается с фоном. |
| `primary-hover` | `#031bb5` | `#2f4ef5` | Основная кнопка при наведении. |
| `primary-pressed` | `#02158f` | `#2742d9` | Основная кнопка в момент нажатия. |
| `on-primary` | `#ffffff` | `#ffffff` | Текст и иконки на заливке primary. |
| `primary-soft` | `#e6eafe` | `#1b2350` | Подложка иконок и выбранных строк; на ней текст link или primary. |
| `link` | `#0423e7` | `#8c9bff` | Ссылки и текстовые акценты («у полки» в заголовке). |
| `focus` | `#0423e7` | `#8c9bff` | Кольцо фокуса с клавиатуры: 2px сплошное, отступ 2px. |
| `inverse` | `#0b1030` | `#eceef6` | Инверсная кнопка «Начать» в шапке: тёмная в светлой теме, светлая в тёмной. |
| `on-inverse` | `#ffffff` | `#0b0d17` | Текст на inverse. |
| `segment-active` | `#ffffff` | `#2a2f48` | Выбранный пункт в переключателе языка и других сегментах. |
| `brand-panel` | `#0423e7` | `#151827` | Боковая панель экранов авторизации. Светлая — фирменный синий с белым знаком, тёмная — графит с цветным знаком. |
| `on-brand-panel` | `#ffffff` | `#eceef6` | Заголовок на brand-panel. |
| `on-brand-panel-muted` | `#dce2ff` | `#a0a5be` | Описание и © на brand-panel. |
| `success` | `#0b7a45` | `#3dd68c` | Успех: «Пароль изменён», «Показ засчитан». Как текст — на поверхностях и success-soft. |
| `success-soft` | `#e3f6ec` | `#10291e` | Фон уведомлений и бейджей успеха. |
| `warning` | `#9a5800` | `#ffb547` | Предупреждения: мало баланса, код скоро истечёт. |
| `warning-soft` | `#fff1dc` | `#2b2112` | Фон предупреждений. |
| `danger` | `#c01d36` | `#ff6b7f` | Ошибки полей и действий, рамка поля с ошибкой. Как текст — на поверхностях и danger-soft. |
| `danger-soft` | `#fde8eb` | `#2e1219` | Фон уведомлений об ошибке. |
| `on-danger` | `#ffffff` | `#0b0d17` | Текст на заливке danger (кнопка «Удалить»): белый в светлой теме, тёмный в тёмной — светло-красный фон не держит белый текст. |
| `accent` | `#9a0cb3` | `#ee7bff` | Пурпурный акцент интерфейса (иконки второго плана, метки зон). Как текст — только на accent-soft или поверхностях. |
| `accent-soft` | `#fbe6fe` | `#3b1e53` | Подложка под accent. |
| `brand-cyan` | `#01d8fc` | `#01d8fc` | Фирменный циан из логотипа. Только знак, градиент рекламного экрана и точки-индикаторы. Никогда не текст на светлом. |
| `brand-blue` | `#0423e7` | `#0423e7` | Фирменный синий из логотипа. В интерфейсе работает через primary. |
| `brand-magenta` | `#df13fc` | `#df13fc` | Фирменный пурпур из логотипа. Знак и градиент рекламного экрана; для интерфейса — accent. |

Rules:
- Page = `bg`. Cards, forms, panels = `surface`. Floating things (menus, toasts, floating chips) = `surface-raised` (+ `shadow-md` in light; in dark, the lighter surface does the separation).
- Text: `text` (main), `text-muted` (descriptions, secondary), `text-subtle` (placeholders, 13px captions, footer). Never invent greys.
- Exactly **one** `primary` button per screen — the action the screen exists for.
- `border` = dividers and card outlines. `border-strong` = input, checkbox and outlined-button borders.
- Status colours (`success`, `warning`, `danger`) always come with words or an icon, never colour alone. Their `-soft` variants are backgrounds behind status text.
- `accent` (magenta) — secondary accents only (zone labels, second-plane icons).
- `brand-cyan`, `brand-blue`, `brand-magenta` are the logo colours: logo, the gradient on the ad-screen illustration, small indicator dots. Never gradient-fill backgrounds, buttons or text.
- `brand-panel` = the side panel on auth screens (brand blue + white logo in light, graphite + colour logo in dark).

## Typography

Two Google Fonts families, both verified to contain every Kazakh letter (Ә ә Ғ ғ Қ қ Ң ң Ө ө Ұ ұ Ү ү Һ һ І і) and the tenge sign ₸ in all used weights. In React: `@fontsource/geologica` + `@fontsource/onest`, imported by [`../react/src/design-system/fonts.css`](../react/src/design-system/fonts.css). TTF files for other uses: [`../assets/fonts`](../assets/fonts) (OFL licence).

- **Geologica** (`display`) — headings and big numbers, weight 600.
- **Onest** (`sans`) — all UI and body text, 400 / 600.
- Do not substitute: Manrope and Unbounded lack Kazakh letters; Inter is not part of the brand.

| Style | Family | Size / line height | Weight | Letter spacing | Use |
|---|---|---|---|---|---|
| `display` | Geologica | 68 / 1.04 (40 on phone) | 600 | −0.03em | landing hero |
| `h1` | Geologica | 38 / 1.1 (30 on phone) | 600 | −0.025em | screen title |
| `h2` | Geologica | 28 / 1.2 | 600 | −0.02em | section title |
| `h3` | Geologica | 20 / 1.3 | 600 | −0.01em | card / dialog title |
| `stat` | Geologica | 30 / 1.1 | 600 | −0.02em | big numbers |
| `body-lg` | Onest | 19 / 1.55 | 400 | — | landing intro |
| `body` | Onest | 16 / 1.5 | 400 | — | body text, input values (16px minimum in inputs — iOS zooms below that) |
| `body-sm` | Onest | 14 / 1.45 | 400 | — | hints, secondary text |
| `label` | Onest | 14 / 1.3 | 600 | — | field labels, form links |
| `button-lg` | Onest | 17 / 1 | 600 | — | lg and xl buttons |
| `button-md` | Onest | 15 / 1 | 600 | — | md buttons, header nav |
| `caption` | Onest | 13 / 1.4 | 400 | — | footer, small captions |

## Spacing, sizes, radii, shadows

- Spacing (4px step): `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-7` 32 · `space-8` 40 · `space-9` 48 · `space-10` 56 · `space-11` 80.
- Page: content max width 1280 (`content-max`), side padding 80 on desktop / 20 on phone. Forms max width 420 (`form-max`), fields 24 apart.
- Control heights: 44 minimum tap target (`control-md`), 52 inputs and form buttons (`control-lg`), 56 hero buttons (`control-xl`), 38 segment items inside a 3px track (`control-sm`).
- Radii: `radius-xs` 6 badges, checkbox · `radius-sm` 9 segment items · `radius-md` 12 inputs, small buttons, icon buttons · `radius-lg` 14 large buttons · `radius-xl` 16 alerts, chips, small cards · `radius-2xl` 28 big panels · `radius-full` pills.
- Shadows: `shadow-sm` selected segment · `shadow-md` floating chips, menus, toasts · `shadow-lg` dialogs. Values differ per theme (see tokens.json).

## Iconography and logo

- Icons: outline, 24×24 grid, 1.75 stroke, round caps and joins, `currentColor`. 20px in buttons and fields, 22px in alerts and chips, 28px in the screen icon tile. The set lives in [`../react/src/design-system/Icon.tsx`](../react/src/design-system/Icon.tsx) (`ICONS`, type `IconName`): arrow-right, arrow-left, eye, eye-off, moon, sun, check, check-circle, info, alert-triangle, alert-circle, x, mail, lock, shelf, map-pin, chart, play, chevron-down, globe, refresh. A new icon must be drawn in the same grid and stroke.
- Logo: [`../assets/logo`](../assets/logo). `apex-mark.svg` (colour, any background except brand blue), `apex-mark-white.svg` (only on brand blue `#0423e7` or photos). Wordmark = the word `apexmedia` in Geologica 600 next to the mark (React: `Logo`, mark only: `LogoMark`). Never recolour, rotate, outline or put the mark on a gradient. Minimum mark height 20px.

## Voice and copy

- Address the user formally («вы» / «сіз»), short and concrete.
- Buttons start with a verb: «Запустить рекламу», «Отправить код», «Пополнить баланс».
- Errors say what to do: «Введите почту полностью, например name@company.kz», not «Неверный формат».
- No exclamation marks, caps lock, emoji.
- Numbers: space as thousands separator, currency after the number: «12 500 ₸», «7 сек», «1 240 показов». Format dates and numbers with the locale (kk-KZ, ru-RU, en-US).

## Languages

- Switcher order is always «Қаз · Рус · Eng» (SegmentedControl in the header and on auth screens).
- Default = saved choice, else browser language, else Russian (`I18nProvider` in [`../react/src/i18n/i18n.tsx`](../react/src/i18n/i18n.tsx)); once the user is signed in, also save it in the profile.
- Kazakh strings are ~20–30% longer than Russian. Lay out for Kazakh: if a title or a button does not fit in Kazakh, change the layout, never shorten the translation.
- All copy lives in [`../react/src/i18n`](../react/src/i18n) (`auth.*.json`, `landing.*.json`, same keys in every language); Kazakh is a draft until reviewed by a native speaker.
