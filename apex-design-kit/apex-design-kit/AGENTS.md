# AGENTS.md — Apex design kit (React)

You are an AI coding agent working on **Apex**: the web account of Apexmedia advertisers (7-second video ads on tablets mounted on supermarket carts, Kazakhstan) and its landing page. This folder is the complete design handoff. **Stack: React 18 + TypeScript.** Read this file first, then the docs it points to. Do not invent styles: everything you need is here. If something is missing, flag it (see «When something is missing»).

## Read in this order

1. `docs/design-system.md` — brand, themes, colour/typography/spacing rules, voice, languages.
2. `docs/components.md` — every base component: sizes, tokens per state, behaviour, React props.
3. `docs/auth-flow.md` — the 7 auth screens, their states, navigation and the Supabase Auth mapping.
4. `docs/landing.md` — the landing (header + hero), what is designed and what is not.
5. The code in `react/src/` — it is the implementation, not a sketch. Then look at `html/` or `screenshots/` for the exact visual result.

## Source of truth (highest first)

1. `tokens/tokens.json` — every colour (light + dark), type style, spacing, radius, shadow, size. `react/src/design-system/tokens.css` is the same data as CSS variables.
2. `docs/*.md` — rules and specs.
3. `react/src/` — working React + TypeScript code of the design system, the auth screens and the landing (`tsc --strict` clean). **Reuse it as is**; adapt only routing, data and wiring.
4. `html/` (static snapshots) and `screenshots/` (PNG) — the visual target. If a picture and a doc disagree, the doc wins; report the mismatch.

## Folder map

| Path | What |
|---|---|
| `react/src/design-system/` | base components (`Button`, `IconButton`, `TextField`, `PasswordField`, `OtpInput`, `Checkbox`, `SegmentedControl`, `ThemeToggle`, `Alert`, `Badge`, `Logo`, `LogoMark`, `Icon`), `ThemeProvider` / `useTheme`, `tokens.css`, `components.css`, `fonts.css`, `styles.css` (imports all three), `index.ts` |
| `react/src/i18n/` | `I18nProvider` / `useI18n` (`t`, `tRich`), copy in `auth.{ru,kk,en}.json` and `landing.{ru,kk,en}.json` (identical key sets; Kazakh is a draft for native review) |
| `react/src/auth/` | 7 auth screens, `AuthLayout`, `AuthLinksProvider` (route paths), `validation.ts`, `supabaseAuth.ts` (Supabase calls → screen states), `auth.css` |
| `react/src/landing/` | `Landing` (header + hero), `landing.css` |
| `react/src/demo/` | demo app that builds the `reference/` pages: component gallery, screen switcher with `?screen=&theme=&lang=&variant=`. Dev-only, do not ship |
| `react/package.json`, `react/tsconfig.json` | dependencies the code needs; `npm run typecheck`, `npm run build:reference` |
| `reference/` | live pages built from `react/src` (open in a browser, offline): `index.html` gallery, `screens.html`, `landing.html`, `components.html`. `js/app.js` is a generated bundle — never edit or copy it |
| `html/` | static HTML snapshot of every screen and state (no JS): `auth/light`, `auth/dark`, `auth/states`, `landing/{light,dark,kk,en}.html`, `components.html` |
| `screenshots/` | PNG: `auth/desktop-light`, `auth/desktop-dark` (1440), `auth/states`, `auth/mobile` (390), `landing/` (desktop light/dark/kk/en, mobile light/dark), `components-light-dark.png` |
| `tokens/tokens.json` | design tokens (lists of `{name, value, usage}`; colours have `light` and `dark` values) |
| `tokens/tailwind.preset.js` | Tailwind preset mapped to the CSS variables (only if the project uses Tailwind) |
| `assets/logo/` | `apex-mark.svg` (colour), `apex-mark-white.svg` (on brand blue), original logo image. `LogoMark` already inlines the same SVG |
| `assets/fonts/` | Geologica 500/600/700 and Onest 400/500/600/700 TTF + OFL licences (fallback if `@fontsource` is not used) |

## Task A — set up the design system in the project (do this first)

1. Copy `react/src/design-system/` and `react/src/i18n/` into the app (e.g. `src/design-system/`, `src/i18n/`). Keep file names and exports.
2. Install fonts: `npm i @fontsource/geologica @fontsource/onest`. (No bundler CSS import support? Use `assets/fonts` + `reference/css/fonts.css`.)
3. Import `design-system/styles.css` once at the app root (fonts + tokens + component styles).
4. Wrap the app: `<ThemeProvider><I18nProvider>…</I18nProvider></ThemeProvider>`. `ThemeProvider` starts from the saved choice or the OS theme and sets `<html data-theme="light|dark">`; `I18nProvider` starts from the saved choice, else the browser language, else `ru`. Both persist the choice in `localStorage` (`apex-theme`, `apex-lang`). With SSR (Next.js) mark them as client components and avoid a theme flash with an inline script that sets `data-theme` before hydration.
5. Tailwind projects: add `tokens/tailwind.preset.js` to `presets` — the utilities then point to the same CSS variables. Do not create a second palette.
6. Add a dev-only route with the component gallery (`react/src/demo/ComponentsGallery.tsx`, it needs `tokens/tokens.json`) and compare it with `screenshots/components-light-dark.png`.

## Task B — auth screens

1. Copy `react/src/auth/` (it imports `../design-system` and `../i18n/i18n`). Import `auth/auth.css` once.
2. Routes: map the 7 screens to the paths in `DEFAULT_AUTH_LINKS` (`/login`, `/signup`, `/signup/verify`, `/reset-password`, `/reset-password/code`, `/reset-password/new`, `/reset-password/done`) or override any of them with `<AuthLinksProvider links={{ login: "/auth/login" }}>` (partial object, the rest stay default). With React Router / Next.js you may swap the plain `<a href>` in `Button`/`AuthNote`/`FieldAction` for the router `Link`.
3. The screens are presentational: they take `loading`, `error`, `email`, `onSubmit`, `onResend`. Wire them with `auth/supabaseAuth.ts` (functions take your `SupabaseClient` and return `{ ok }` or `{ ok: false, error }` already mapped to the screen states). Pass the email between steps (route state or a store).
4. Implement every state from `docs/auth-flow.md`; compare with `html/auth/**` and `screenshots/auth/**`, light/dark, 1440/390, and Kazakh.

## Task L — landing

Copy `react/src/landing/`, import `landing/landing.css`, render `<Landing loginHref="/login" startHref="/signup" />` on `/`. Read `docs/landing.md`: only the header and the hero are designed; the nav anchors (`#how`, `#stores`, `#pricing`, `#contacts`) and the phone menu are design gaps.

## Task C — new screens (cabinet: campaigns, stores map, balance, stats, onboarding, …)

There are no designs for them yet. Build them **in this system**:
- compose from the existing components and tokens only; put new reusable parts into `design-system/` with the `ax-` CSS prefix and token-only styles;
- page = `bg`, cards = `surface` with `radius-2xl` 28 or `radius-xl` 16 and `border`, section titles `h2`, card titles `h3`, numbers `stat`;
- every screen: light + dark, desktop 1440 + phone 390, states: default, loading, empty, error;
- check the layout with Kazakh strings (longest);
- copy follows the voice rules in `docs/design-system.md`; add new strings to `react/src/i18n/*.json` (or your copy of it) in all three languages (Kazakh marked as draft).

## Hard rules

- No colours, fonts, font sizes, radii, shadows or spacings outside the tokens. In CSS use `var(--…)` from `tokens.css`; no raw hex in components (the only exception is the device illustration on the landing, marked in `landing.css`).
- One `primary` button per screen. Field errors on the field; form-level errors in an `Alert`.
- Inputs: text 16px minimum. Tap targets ≥ 44×44. Visible keyboard focus (2px `focus` ring).
- Every text/background pair you introduce must keep 4.5:1 contrast in both themes (the tokens already do when used as documented).
- Do not use Manrope, Unbounded or Inter (no Kazakh letters / not the brand).
- Do not ask for company name or БИН at sign-up — that goes to onboarding after the first login.
- Do not ship `react/src/demo/` or `reference/js/app.js`.

## When something is missing

Do not invent a new colour, size or component silently. Build the closest thing from existing tokens and components, and list it under «Design gaps» in your summary (what was needed, what you used instead). The design owner (Askar) adds missing tokens/components to the kit.

## Definition of done (per screen)

- [ ] Uses only kit tokens and base components
- [ ] Light and dark theme checked
- [ ] Desktop 1440 and phone 390 checked
- [ ] Default, loading, empty and error states implemented
- [ ] All strings come from i18n in ru, kk, en; layout survives Kazakh
- [ ] Keyboard navigation and focus ring work; icon-only buttons have labels
- [ ] `tsc --strict` passes, no console errors
- [ ] Visually matches the snapshot / screenshot (if one exists)
