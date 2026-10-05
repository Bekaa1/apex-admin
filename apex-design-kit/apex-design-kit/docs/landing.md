# Landing — direction A («Ясный сигнал»)

Code: [`../react/src/landing/Landing.tsx`](../react/src/landing/Landing.tsx) + [`landing.css`](../react/src/landing/landing.css). Live: [`../reference/landing.html`](../reference/landing.html) (`?theme=light|dark&lang=ru|kk|en`; narrow the window for the phone layout). Static HTML: [`../html/landing/`](../html/landing/) (`light`, `dark`, `kk`, `en`). Screenshots: [`../screenshots/landing/`](../screenshots/landing/) (desktop 1440 light/dark/kk/en, phone 390 light/dark). Copy: [`../react/src/i18n/landing.ru.json`](../react/src/i18n/landing.ru.json) (+ `kk`, `en`; keys under `landing.*`).

```tsx
import { Landing } from './landing';
import './landing/landing.css';

<Landing loginHref="/login" startHref="/signup" />
```

## What is designed

**Header** (max width `content-max` 1280, padding 24 × 80):
Logo (mark 30, links to `#top`) · nav «Как это работает · Магазины · Тарифы · Контакты» (15/500 `text`, hover `link`) · language SegmentedControl · ThemeToggle · ghost «Войти» (md) → `loginHref` · inverse «Начать» (md) → `startHref`.

**Hero** (two columns that wrap; gap 56; padding 56 × 80 × 80):
- Left: eyebrow pill (bg `surface`, 1px `border`, 14/600 `link`, cyan dot with a `primary-soft` halo) → title `display` (Geologica 600, `clamp(40px, 4.6vw, 68px)`, −0.03em) with the accent words «у полки» in `link` → intro `body-lg` 19/1.55 `text-muted` (max 34em) → two xl buttons: primary «Запустить рекламу» (arrow-right) → `startHref`, secondary «Как это работает» → `#how` → three stats (`stat` 30/600 + 14px `text-muted` label) above a 1px `border` top rule.
- Right: illustration card (`surface-muted`, `radius-2xl`, 1px `border`, faint facet lines in `border`): a tablet on a cart handle showing a 7-second ad (logo gradient screen, «Реклама · 7 сек» badge, play button, progress bar) + two floating chips on `surface-raised` + `shadow-md`: «Покупатель у полки / Зона «Напитки»» (`primary-soft` icon tile) and «Показ засчитан / Сразу в статистике» (`accent-soft`).
- The tablet body `#05060c` and the gradient are illustration-only colours (allowed exception, marked in the CSS). Everything else is tokens, so the dark theme needs no extra code.

**Header by width** (the same in all three languages):
- ≥ 1280: one row — logo · nav · language, theme, «Войти», «Начать».
- 761–1279 (tablet, small laptop): two rows — logo + buttons on the right / nav under the logo. Side padding 32 below 1100.
- ≤ 760 (phone): two rows — logo + «Начать» / language, theme, «Войти» on the right; nav hidden; padding 20.

**Phone hero (≤ 760px):** title 40px, intro 17px; CTA buttons full width; illustration scaled down (smaller chips and tablet).

## Not designed yet (design gaps)

- Sections behind the nav anchors: `#how` (how it works), `#stores` (stores / map), `#pricing`, `#contacts`, and a footer. The anchors exist; the sections do not. Build them from the kit (cards on `surface`, `h2` section titles, `stat` numbers, the same 1280 container and 80/20 side padding) and list them as design gaps.
- Phone navigation menu: the nav links are hidden on phones; there is no burger/menu yet.
- The «200+» screens figure and other stats are placeholders — confirm the real numbers with the business before release.
- Kazakh copy is a draft for native review.
