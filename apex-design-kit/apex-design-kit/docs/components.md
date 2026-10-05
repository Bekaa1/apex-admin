# Apex components — specification

Implementation: [`../react/src/design-system/`](../react/src/design-system/) — React 18 + TypeScript, one file per component, props documented in the code (JSDoc), styles in [`components.css`](../react/src/design-system/components.css) (class prefix `ax-`, tokens only). Import everything from `design-system/index.ts`. Live gallery in both themes: [`../reference/components.html`](../reference/components.html), static snapshot: [`../html/components.html`](../html/components.html), screenshot: [`../screenshots/components-light-dark.png`](../screenshots/components-light-dark.png).

Use these components as the project's base components **before** building screens; new screens are composed from them. Every value below is a token from `tokens/tokens.json` (CSS variables in `tokens.css`).

All interactive elements: visible keyboard focus = 2px solid `focus` outline, 2px offset (1px for inputs). Minimum tap target 44×44.

---

## Button

| | md | lg (default) | xl |
|---|---|---|---|
| Height | 44 (`control-md`) | 52 (`control-lg`) | 56 (`control-xl`) |
| Horizontal padding | 18 | 24 | 26 |
| Radius | `radius-md` 12 | `radius-lg` 14 | `radius-lg` 14 |
| Text | `button-md` 15/600 | `button-lg` 17/600 | `button-lg` 17/600 |

Icon + label gap 10, icon 20px. Single line, no wrapping.

| Variant | Background | Text | Border | Hover | Use |
|---|---|---|---|---|---|
| `primary` | `primary` | `on-primary` | — | `primary-hover`; pressed `primary-pressed` | the one main action of the screen |
| `secondary` | `surface` | `text` | 1px `border-strong` | bg `surface-muted` | second action next to primary |
| `ghost` | transparent | `text` | — | bg `surface-muted` | tertiary: «Назад», «Отмена» |
| `inverse` | `inverse` | `on-inverse` | — | 90% opacity | only «Начать» in the landing header |
| `danger` | `danger` | `on-danger` | — | — | irreversible actions |

States: **disabled** → bg `surface-muted`, text `text-subtle`, no border. **loading** → 18px spinner (2px ring, `currentColor`, right side transparent, 0.8s rotation) replaces the left icon, button blocked but keeps its variant colours (primary at 85% opacity), label unchanged («Войти», not «Входим…»). With a link target the button renders as a link with the same look. In forms: full width.

Copy: verb first, no trailing period.

React: `<Button variant="primary|secondary|ghost|inverse|danger" size="md|lg|xl" loading iconLeft="…" iconRight="…" fullWidth>`; with `href` it renders `<a>`, otherwise `<button>` (default `type="button"`; pass `type="submit"` in forms).

## IconButton

44×44, radius 12. `outline` (default): 1px `border-strong`, bg `surface`, icon `text`. `ghost`: no border, transparent, icon `text-muted` — used inside fields (show password) and alerts (close). Hover bg `surface-muted`. Always has an accessible label (tooltip + `aria-label`).

React: `<IconButton icon="x" label="Закрыть" variant="outline|ghost" onClick={…} />`.

## TextField

- Label above (14/600 `text`), 8px gap, input, 8px gap, hint or error below.
- Optional link on the right of the label row (`labelAction` — e.g. «Забыли пароль?»): 14/600 `link`, underline on hover.
- Input: height 52, padding 0 16, radius 12, 1px `border-strong`, bg `input-bg`, text 16px Onest `text`, placeholder `text-subtle`.
- Hover: border `text-muted`. Focus: 2px `focus` outline (offset 1) + border `focus`.
- Error: border `danger`; message row = 18px `alert-circle` icon + 14px text in `danger`, 6px gap. Error replaces the hint. Show errors after blur or submit, not while typing.
- Disabled: bg `surface-muted`, text `text-subtle`, border `border`.
- Trailing slot (right, 4px inset) for a ghost IconButton; input right padding becomes 52.
- Label is always visible; placeholder is only an example value.

React: `<TextField label hint error trailing labelAction={<FieldAction href>…</FieldAction>} …inputProps />` — all native `<input>` props pass through; `id`, `aria-invalid` and `aria-describedby` are wired automatically.

## PasswordField

TextField + trailing ghost IconButton `eye` / `eye-off` toggling visibility (labels «Показать пароль» / «Скрыть пароль»). Sign-in: `autocomplete=current-password` + «Забыли пароль?» action. New password: `autocomplete=new-password` + hint «Минимум 8 символов, буквы и цифры». No «repeat password» field.

React: `<PasswordField label autoComplete="current-password|new-password" showLabel hideLabel … />`.

## OtpInput (6-digit email code)

- Label above (14/600), group of 6 cells, hint or error below (same as TextField).
- Cell: 52×60 max, shrinks on narrow screens (flex, min-width 0), radius 12, 1px `border-strong`, bg `input-bg`, digit Geologica 26/600 `text`, caret `primary`, centered.
- Gap 10; after the 3rd cell a 10×2 separator in `border-strong`.
- Focus: 2px `focus` outline + border. Error: all cells border `danger` + error row.
- Behaviour: numeric keyboard; paste of a full code fills all cells; typing moves forward; Backspace clears the cell or moves back; arrows move focus; first cell has `autocomplete=one-time-code` (iOS suggests the code from Mail). When all 6 digits are entered → verify immediately (`onComplete`); keep the submit button anyway.
- Below: «Отправить код ещё раз через 0:59» (`text-subtle`, live countdown 60s) → after the timer a link «Отправить код ещё раз»; plus «Не та почта? Изменить» (`ResendBlock` in `auth/AuthLayout.tsx`).

React: `<OtpInput length={6} value onChange onComplete label hint error autoFocus />` (controlled or uncontrolled via `defaultValue`).

## Checkbox

20×20, radius 6, 1.5px `border-strong`, bg `input-bg`; checked → bg + border `primary`, white check mark. Label to the right (14/1.45 `text-muted`, 12 gap), whole label clickable, links inside the label in `link` 600. Error → border `danger` + error row below. Sign-up consent is **unchecked** by default.

React: `<Checkbox checked onChange error>label with links</Checkbox>` — `children` is the label.

## SegmentedControl (language switch, period filters)

Track: padding 3, gap 2, bg `surface-muted`, 1px `border`, radius 12. Item: height 38, min-width 48, padding 0 10, radius 9, 14/600 `text-muted`. Selected: bg `segment-active`, text `text`, `shadow-sm`. Language options always «Қаз · Рус · Eng» with `lang` attributes kk / ru / en.

React: `<SegmentedControl label="Язык" options={LANG_OPTIONS} value={lang} onChange={setLang} />` (`label` is the accessible group name).

## ThemeToggle

IconButton (outline). Light theme shows `moon` (label «Включить тёмную тему»), dark shows `sun` («Включить светлую тему»).

React: `<ThemeToggle labels={{ toDark, toLight }} />` — reads and switches the theme through `useTheme()`, so it must be inside `ThemeProvider`.

## Alert

Padding 14×16, radius 16, gap 12, icon 22px. Title 15/600 `text`, body 14/1.45 `text-muted` (2px below title). Optional ghost close button on the right.

| Tone | Background | Icon | Use |
|---|---|---|---|
| `info` | `primary-soft` | `info` in `link` | neutral info: «Код отправлен» |
| `success` | `success-soft` | `check-circle` in `success` | done: «Пароль изменён» |
| `warning` | `warning-soft` | `alert-triangle` in `warning` | attention: low balance, rate limit |
| `danger` | `danger-soft` | `alert-circle` in `danger` | form-level error: «Неверная почта или пароль» |

Field errors go on the field; Alert is for errors of the whole form. `danger`/`warning` are announced immediately (role alert), `info`/`success` politely (role status).

React: `<Alert tone="info|success|warning|danger" title onClose closeLabel>body</Alert>`.

## Badge

Height 26, padding 0 10, radius 6, 13/600. Optional 6px dot in `currentColor`.
`neutral` (bg `surface-muted`, text `text-muted`) · `brand` (`primary-soft` / `link`) · `success` · `warning` · `danger` (their `-soft` bg + main colour text) · `accent` (`accent-soft` / `accent`). Examples: «Активна» (success + dot), «На модерации» (warning + dot), «Отклонена» (danger + dot), «Черновик» (neutral), «Шаг 1 из 3» (neutral).

React: `<Badge tone="success" dot>Активна</Badge>`.

## Logo

Mark (SVG from `assets/logo`) + word «apexmedia» (Geologica 600, font size = 0.72 × mark height, gap 10). Header: mark 28–30px. Variants: colour (default) and white (only on brand blue).

React: `<Logo size={30} variant="color|white" wordmark href label />`; the mark alone: `<LogoMark size variant />` (inline SVG with the logo gradients, same as `assets/logo/*.svg`).

## Icon

See the icon rules in `design-system.md`. Decorative next to text (hidden from screen readers); a standalone icon is always inside an IconButton with a label.

React: `<Icon name="arrow-right" size={20} />`; the names are typed (`IconName`), the list is `iconNames`. A new icon goes into `ICONS` in `Icon.tsx`, drawn on the same 24 grid with a 1.75 stroke.

## Theme and language providers

- `ThemeProvider` (`design-system/theme.tsx`): props `initialTheme`, `persist` (default true, key `apex-theme`), `applyToDocument` (default true: sets `<html data-theme>`). Hook: `useTheme()` → `{ theme, setTheme, toggleTheme }`.
- `I18nProvider` (`i18n/i18n.tsx`): props `initialLang`, `persist` (key `apex-lang`). Hook: `useI18n()` → `{ lang, setLang, t(key, vars), tRich(key, tags) }`. `t('verify.subtitle', { email })` fills `{email}`; `tRich('signup.terms', { offer: (s) => <a href={links.offer}>{s}</a>, privacy: (s) => … })` turns `<offer>…</offer>`-style tags in a string into React elements (links in the sign-up consent). Missing keys fall back to Russian.
