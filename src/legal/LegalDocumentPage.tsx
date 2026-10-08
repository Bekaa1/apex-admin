import { useEffect, useState, type ReactNode } from 'react'
import { Button, Checkbox, LANG_OPTIONS, Logo, SegmentedControl, ThemeToggle } from '../design-system'
import { useI18n } from '../i18n/i18n'
import { DEFAULT_AUTH_LINKS } from '../auth/links'
import { useSignupConsent } from '../auth/signupConsent'

const documentLoaders = {
  privacy: () => import('./privacy-policy.ru.json'),
  offer: () => import('./public-offer.ru.json'),
}

type LegalPageKind = keyof typeof documentLoaders
type LegalContent = Awaited<ReturnType<typeof documentLoaders.privacy>>['default']
type LegalLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; content: LegalContent }
type LegalRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; href?: string }
type LegalTextBlock = { type: 'paragraph' | 'heading'; text?: string; level?: number; runs: LegalRun[] }
type LegalTableBlock = { type: 'table'; rows: LegalRun[][][] }
type LegalBlock = LegalTextBlock | LegalTableBlock

function InlineText({ runs }: { runs: LegalRun[] }) {
  return runs.map((run, index) => {
    let content: ReactNode = run.text
    if (run.underline) content = <u>{content}</u>
    if (run.italic) content = <em>{content}</em>
    if (run.bold) content = <strong>{content}</strong>

    if (run.href && /^(https?:\/\/|mailto:)/i.test(run.href)) {
      return (
        <a key={index} href={run.href}>
          {content}
        </a>
      )
    }

    return <span key={index}>{content}</span>
  })
}

function DocumentBlock({ block }: { block: LegalBlock }) {
  if (block.type === 'table') {
    return (
      <dl className="legal-document__details">
        {block.rows.map((row, rowIndex) => (
          <div className="legal-document__detail" key={rowIndex}>
            <dt><InlineText runs={row[0] ?? []} /></dt>
            <dd><InlineText runs={row[1] ?? []} /></dd>
          </div>
        ))}
      </dl>
    )
  }

  if (block.type === 'heading') {
    const headingText = block.runs.map((run) => run.text).join('')
    if (block.level === 3 || (!block.level && /^\d+\.\d+\./.test(headingText))) {
      return <h3 className="legal-document__subsection"><InlineText runs={block.runs} /></h3>
    }

    return <h2 className="legal-document__section"><InlineText runs={block.runs} /></h2>
  }

  return <p className="legal-document__paragraph"><InlineText runs={block.runs} /></p>
}

export function LegalDocumentPage({ kind }: { kind: LegalPageKind }) {
  const { t, lang, setLang } = useI18n()
  const [loadState, setLoadState] = useState<LegalLoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const pageTitle = t(kind === 'privacy' ? 'landing.legal.privacy' : 'landing.legal.offer')
  const returnToSignup = new URLSearchParams(window.location.search).get('returnTo') === DEFAULT_AUTH_LINKS.signup
  const backHref = returnToSignup ? DEFAULT_AUTH_LINKS.signup : DEFAULT_AUTH_LINKS.home
  const backLabel = t(returnToSignup ? 'landing.legal.backToSignup' : 'landing.legal.back')
  const { documents, setDocumentAccepted } = useSignupConsent()

  useEffect(() => {
    let active = true

    documentLoaders[kind]()
      .then((module) => {
        if (active) setLoadState({ status: 'loaded', content: module.default as LegalContent })
      })
      .catch(() => {
        if (active) setLoadState({ status: 'error' })
      })

    return () => {
      active = false
    }
  }, [attempt, kind])

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${pageTitle} · Apexmedia`
    return () => {
      document.title = previousTitle
    }
  }, [pageTitle])

  return (
    <div className="legal-page">
      <header className="legal-page__header">
        <div className="legal-page__header-inner">
          <Logo href="/" label={t('landing.nav.home')} size={28} />
          <div className="legal-page__controls">
            <SegmentedControl
              label={t('common.langLabel')}
              options={LANG_OPTIONS}
              value={lang}
              onChange={setLang}
            />
            <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
          </div>
        </div>
      </header>

      <main className="legal-page__main">
        <article className="legal-document" aria-labelledby="legal-document-title">
          <Button variant="ghost" size="md" iconLeft="arrow-left" href={backHref}>
            {backLabel}
          </Button>

          <header className="legal-document__header">
            <p className="legal-document__language">{t('landing.legal.originalLanguage')}</p>
            <h1 className="legal-document__title" id="legal-document-title">{pageTitle}</h1>
            {loadState.status === 'loaded' ? (
              <p className="legal-document__subtitle">{loadState.content.subtitle}</p>
            ) : null}
          </header>

          {loadState.status === 'error' ? (
            <div className="legal-document__error" role="alert">
              <p>{t('landing.legal.loadError')}</p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setLoadState({ status: 'loading' })
                  setAttempt((value) => value + 1)
                }}
              >
                {t('landing.legal.retry')}
              </Button>
            </div>
          ) : loadState.status === 'loaded' ? (
            <div className="legal-document__body">
              {loadState.content.blocks.map((block, index) => (
                <DocumentBlock block={block as LegalBlock} key={index} />
              ))}
            </div>
          ) : (
            <p className="legal-document__loading" role="status" aria-live="polite">
              {t('landing.legal.loading')}
            </p>
          )}

          {returnToSignup && loadState.status === 'loaded' ? (
            <footer className="legal-document__footer">
              <div className="legal-document__consent">
                <Checkbox
                  checked={documents[kind]}
                  onChange={(event) => setDocumentAccepted(kind, event.target.checked)}
                >
                  {t(kind === 'privacy' ? 'landing.legal.acceptPrivacy' : 'landing.legal.acceptOffer')}
                </Checkbox>
                <Button size="md" href={backHref} iconLeft="arrow-left">
                  {backLabel}
                </Button>
              </div>
            </footer>
          ) : null}
        </article>
      </main>
    </div>
  )
}
