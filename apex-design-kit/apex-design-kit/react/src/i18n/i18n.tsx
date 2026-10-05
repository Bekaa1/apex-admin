/*
 * Minimal i18n for the kit: three languages, JSON dictionaries, {placeholders} and <tag>rich text</tag>.
 * In the product you can swap it for react-i18next — keep the JSON files and the keys.
 */
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import authRu from './auth.ru.json';
import authKk from './auth.kk.json';
import authEn from './auth.en.json';
import landingRu from './landing.ru.json';
import landingKk from './landing.kk.json';
import landingEn from './landing.en.json';
import type { Lang } from '../design-system/SegmentedControl';

export type { Lang };

const DICTIONARIES: Record<Lang, Record<string, unknown>> = {
  ru: { ...authRu, landing: landingRu },
  kk: { ...authKk, landing: landingKk },
  en: { ...authEn, landing: landingEn },
};

const STORAGE_KEY = 'apex-lang';

function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ru' || stored === 'kk' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'ru').toLowerCase();
  if (nav.startsWith('kk')) return 'kk';
  if (nav.startsWith('en')) return 'en';
  return 'ru';
}

function lookup(dict: Record<string, unknown>, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

type Vars = Record<string, string | number>;
type RichTags = Record<string, (chunk: string) => ReactNode>;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Plain string with {placeholders} replaced. Missing keys return the key itself. */
  t: (key: string, vars?: Vars) => string;
  /** Rich text: <tag>chunk</tag> rendered by `tags[tag]`, {name} replaced by `nodes[name]` (e.g. a bold email). */
  tRich: (key: string, tags?: RichTags, nodes?: Record<string, ReactNode>) => ReactNode;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initialLang, persist = true }: { children: ReactNode; initialLang?: Lang; persist?: boolean }) {
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? detectLang());

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      if (persist) {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
      }
    },
    [persist],
  );

  const value = useMemo<I18nValue>(() => {
    const dict = DICTIONARIES[lang];
    const t = (key: string, vars?: Vars) => {
      const raw = lookup(dict, key) ?? lookup(DICTIONARIES.ru, key) ?? key;
      return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
    };
    const tRich = (key: string, tags: RichTags = {}, nodes: Record<string, ReactNode> = {}) => {
      const raw = lookup(dict, key) ?? lookup(DICTIONARIES.ru, key) ?? key;
      const out: ReactNode[] = [];
      const re = /<(\w+)>(.*?)<\/\1>|\{(\w+)\}/g;
      let last = 0;
      let m: RegExpExecArray | null;
      let i = 0;
      while ((m = re.exec(raw))) {
        if (m.index > last) out.push(raw.slice(last, m.index));
        if (m[1]) out.push(<Fragment key={i++}>{tags[m[1]] ? tags[m[1]](m[2]) : m[2]}</Fragment>);
        else if (m[3]) out.push(<Fragment key={i++}>{nodes[m[3]] ?? m[0]}</Fragment>);
        last = re.lastIndex;
      }
      if (last < raw.length) out.push(raw.slice(last));
      return out;
    };
    return { lang, setLang, t, tRich };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
