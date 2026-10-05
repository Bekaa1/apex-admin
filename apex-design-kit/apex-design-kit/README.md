# Apex — дизайн-кит для разработки (React)

Всё, что сделано в дизайне Apex, в одной папке: дизайн-система (цвета, шрифты, отступы, компоненты), экраны авторизации, лендинг в светлой и тёмной теме, тексты на казахском, русском и английском, логотип и шрифты. Всё это уже написано **на React + TypeScript** и готово к переносу в проект.

Кит рассчитан на ИИ-агента разработчика: Codex, Cursor, Claude Code и любой другой. Для агента в корне лежит `AGENTS.md`. Codex и Cursor читают этот файл сами.

## Как посмотреть глазами

Интернет не нужен, достаточно браузера.
- **`reference/index.html`** — галерея всех экранов, состояний и лендинга. Клик по карточке открывает живую страницу: работают переключатели языка и темы, поля, ввод кода и переходы между экранами. Чтобы увидеть телефонную версию, сузьте окно.
- **`reference/components.html`** — все токены и компоненты в обеих темах.
- **`html/`** — статичный HTML каждого экрана без JavaScript: `auth/light`, `auth/dark`, `auth/states`, `landing/` (светлый, тёмный, казахский, английский), `components.html`. Удобно открыть один экран или посмотреть вёрстку через «Просмотр кода».
- **`screenshots/`** — PNG: десктоп 1440 и телефон 390.

## Как отдать ИИ-агенту

1. Положите папку в репозиторий проекта, например в `design/apex-design-kit/`.
2. В корневой `AGENTS.md` проекта (если его нет, создайте) добавьте строку:
   ```
   UI/design: follow design/apex-design-kit/AGENTS.md — it is the single source of truth for styles, components, copy, auth screens and the landing.
   ```
3. Первый запрос — дизайн-система (на английском, так агенты понимают точнее):
   ```
   Read design/apex-design-kit/AGENTS.md and the docs it lists.
   Do Task A: copy react/src/design-system and react/src/i18n into this project, install the fonts,
   wire ThemeProvider + I18nProvider, and add a dev-only component gallery route.
   Reuse the kit's code as is; use only its tokens. Compare the gallery with screenshots/components-light-dark.png.
   At the end list what you created and any "Design gaps".
   ```
4. Второй запрос — авторизация:
   ```
   Do Task B from design/apex-design-kit/AGENTS.md: add the 7 auth screens from react/src/auth with routes,
   wire them to Supabase Auth through react/src/auth/supabaseAuth.ts as described in docs/auth-flow.md.
   Check every state against html/auth and screenshots/auth: light/dark, desktop 1440, phone 390, Kazakh.
   ```
5. Третий запрос — лендинг:
   ```
   Do Task L from design/apex-design-kit/AGENTS.md: put the Landing from react/src/landing on "/".
   Compare with html/landing and screenshots/landing. Do not invent the missing sections; list them as "Design gaps".
   ```
6. Новые разделы кабинета (кампании, магазины, баланс, статистика):
   ```
   Do Task C from design/apex-design-kit/AGENTS.md for: <раздел и список экранов>.
   Compose only from the kit's components and tokens. Every screen: light/dark, desktop/phone, default/loading/empty/error.
   Add new strings to i18n in ru, kk, en. List "Design gaps" at the end.
   ```

## Что внутри

| Папка | Что |
|---|---|
| `AGENTS.md` | инструкция для ИИ-агента: порядок чтения, задачи A, B, L, C, правила, чек-лист |
| `docs/` | дизайн-система, компоненты с пропсами, флоу авторизации со связкой с Supabase Auth, лендинг |
| `react/src/design-system/` | компоненты, тема, токены (CSS-переменные), шрифты |
| `react/src/auth/` | 7 экранов авторизации и вызовы Supabase |
| `react/src/landing/` | лендинг: шапка и первый экран |
| `react/src/i18n/` | все тексты на трёх языках с одинаковыми ключами |
| `react/src/demo/` | демо, из которого собраны эталонные страницы (в продукт не идёт) |
| `reference/` | живые эталонные страницы, работают офлайн |
| `html/` | статичный HTML каждого экрана |
| `screenshots/` | PNG-скриншоты |
| `tokens/` | `tokens.json` (источник правды) и пресет Tailwind |
| `assets/` | логотип (SVG и исходник), шрифты Geologica и Onest (TTF, лицензия OFL) |

Проверить код кита: `cd react && npm i && npm run typecheck`. Пересобрать эталонные страницы после правок: `npm run build:reference`.

## Что ещё не нарисовано

- На лендинге готовы только шапка и первый экран. Разделы «Как это работает», «Магазины», «Тарифы», «Контакты», подвал и меню для телефона ещё не нарисованы.
- Нет состояния «нет сети / ошибка сервера» на экранах авторизации.
- Нет онбординга после первого входа (название компании, БИН) и самого кабинета.

## Правила

- **Меняет стиль только Аскар.** Новые цвета, шрифты и компоненты сначала добавляются в кит (`tokens/tokens.json`, `react/src/design-system/` и `docs/`), только потом появляются на экранах.
- **Казахские тексты — черновик.** Перед релизом их вычитывает носитель языка.
- **Цифры на лендинге («200+ экранов») — заглушки.** Перед релизом их нужно сверить с реальными.
