import type { ReactNode } from 'react';
import tokens from '../../../tokens/tokens.json';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FieldAction,
  Icon,
  IconButton,
  LANG_OPTIONS,
  Logo,
  OtpInput,
  PasswordField,
  SegmentedControl,
  TextField,
  ThemeProvider,
  ThemeToggle,
  iconNames,
  type Theme,
} from '../design-system';

type ColorToken = { name: string; value: string | Record<string, string>; usage: string };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Swatches({ theme }: { theme: Theme }) {
  return (
    <div className="swatches">
      {(tokens.color.tokens as ColorToken[]).map((tk) => {
        const hex = typeof tk.value === 'string' ? tk.value : tk.value[theme] ?? tk.value.light;
        return (
          <div className="swatch" key={tk.name} title={tk.usage}>
            <div className="swatch__chip" style={{ background: `var(--${tk.name})` }} />
            <div className="swatch__meta">
              <div className="swatch__name">{tk.name}</div>
              <div className="swatch__hex">{hex}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TypeScale() {
  return (
    <div>
      {tokens.type.groups.flatMap((g) =>
        g.styles.map((st) => (
          <div className="type-row" key={st.name}>
            <div className="type-row__meta">
              {st.name} · {st.fontSize} / {st.fontWeight}
            </div>
            <div
              style={{
                fontFamily: g.family === 'display' ? 'var(--font-display)' : 'var(--font-sans)',
                fontSize: Math.min(parseInt(st.fontSize, 10), 48),
                fontWeight: st.fontWeight,
                lineHeight: st.lineHeight,
                letterSpacing: 'letterSpacing' in st ? (st as { letterSpacing?: string }).letterSpacing : undefined,
              }}
            >
              {st.sample}
            </div>
          </div>
        )),
      )}
    </div>
  );
}

const terms = (
  <>
    Принимаю <a href="#offer">условия оферты</a> и <a href="#privacy">политику конфиденциальности</a>
  </>
);

function Column({ theme }: { theme: Theme }) {
  return (
    <ThemeProvider initialTheme={theme} persist={false} applyToDocument={false}>
      <header>
        <h1>{theme === 'dark' ? 'Тёмная тема «Графит»' : 'Светлая тема'}</h1>
        <p className="lead">Токены и компоненты дизайн-системы Apex. Значения — tokens/tokens.json, код — react/src/design-system.</p>
      </header>
      <Section title="Цвета">
        <Swatches theme={theme} />
      </Section>
      <Section title="Типографика">
        <TypeScale />
      </Section>
      <Section title="Button">
        <div className="row">
          <Button size="xl" iconRight="arrow-right">
            Запустить рекламу
          </Button>
          <Button size="xl" variant="secondary">
            Как это работает
          </Button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Button>Войти</Button>
          <Button loading>Войти</Button>
          <Button disabled>Отправить код</Button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Button size="md" variant="inverse">
            Начать
          </Button>
          <Button size="md" variant="ghost" iconLeft="arrow-left">
            Назад
          </Button>
          <Button size="md" variant="danger">
            Удалить кампанию
          </Button>
        </div>
        <p className="caption">xl 56px · lg 52px (по умолчанию) · md 44px</p>
      </Section>
      <Section title="IconButton · ThemeToggle · SegmentedControl">
        <div className="row">
          <IconButton icon="globe" label="Язык" />
          <IconButton icon="x" label="Закрыть" variant="ghost" />
          <ThemeToggle />
          <SegmentedControl label="Язык интерфейса" options={LANG_OPTIONS} defaultValue="ru" />
        </div>
      </Section>
      <Section title="TextField · PasswordField">
        <div className="stack">
          <TextField label="Электронная почта" type="email" placeholder="name@company.kz" />
          <TextField label="Электронная почта" defaultValue="name@company" error="Введите почту полностью, например name@company.kz" />
          <TextField label="БИН" defaultValue="123456789012" disabled hint="Изменить можно через поддержку" />
          <PasswordField label="Пароль" defaultValue="apexmedia2026" labelAction={<FieldAction href="#reset">Забыли пароль?</FieldAction>} />
          <PasswordField label="Новый пароль" autoComplete="new-password" hint="Минимум 8 символов, буквы и цифры" />
        </div>
      </Section>
      <Section title="OtpInput">
        <div className="stack">
          <OtpInput label="Код из письма" defaultValue="4815" hint="Отправили на name@company.kz" />
          <OtpInput label="Код из письма" defaultValue="481512" error="Код не подходит. Проверьте письмо или запросите новый" />
        </div>
      </Section>
      <Section title="Checkbox">
        <div className="stack">
          <Checkbox defaultChecked>{terms}</Checkbox>
          <Checkbox error="Нужно согласие с офертой, чтобы продолжить">{terms}</Checkbox>
        </div>
      </Section>
      <Section title="Alert">
        <div className="stack" style={{ maxWidth: 520, gap: 12 }}>
          <Alert tone="info" title="Код отправлен">
            Проверьте почту name@company.kz — письмо придёт в течение минуты.
          </Alert>
          <Alert tone="success" title="Пароль изменён" onClose={() => undefined}>
            Войдите с новым паролем.
          </Alert>
          <Alert tone="warning" title="Баланс заканчивается">
            Денег хватит примерно на день показов.
          </Alert>
          <Alert tone="danger" title="Неверная почта или пароль">
            Проверьте раскладку и Caps Lock или восстановите пароль.
          </Alert>
        </div>
      </Section>
      <Section title="Badge">
        <div className="row">
          <Badge tone="success" dot>
            Активна
          </Badge>
          <Badge tone="warning" dot>
            На модерации
          </Badge>
          <Badge tone="danger" dot>
            Отклонена
          </Badge>
          <Badge>Черновик</Badge>
          <Badge tone="brand">Новое</Badge>
          <Badge tone="accent">Напитки</Badge>
        </div>
      </Section>
      <Section title="Logo">
        <div className="row" style={{ alignItems: 'center', gap: 24 }}>
          <Logo size={30} />
          <div className="panel">
            <Logo size={30} variant={theme === 'dark' ? 'color' : 'white'} />
          </div>
        </div>
      </Section>
      <Section title="Icon">
        <div className="row">
          {iconNames.map((n) => (
            <span key={n} className="icon-tile" title={n}>
              <Icon name={n} size={22} />
            </span>
          ))}
        </div>
      </Section>
    </ThemeProvider>
  );
}

export function ComponentsGallery({ theme }: { theme: Theme }) {
  return <Column theme={theme} />;
}
