import { useState, type ReactNode } from 'react';
import { cx } from './cx';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** BCP-47 language of the label (kk, ru, en) so screen readers pronounce it right. */
  lang?: string;
  title?: string;
}

export interface SegmentedControlProps<V extends string = string> {
  options: Array<SegmentedOption<V>>;
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  /** Accessible group name, e.g. «Язык интерфейса». */
  label: string;
  className?: string;
}

/** 2–4 mutually exclusive options. Language switch is always «Қаз · Рус · Eng». */
export function SegmentedControl<V extends string = string>({ options, value, defaultValue, onChange, label, className }: SegmentedControlProps<V>) {
  const [inner, setInner] = useState<V | undefined>(defaultValue ?? options[0]?.value);
  const current = value ?? inner;
  return (
    <div className={cx('ax-seg', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="ax-seg__item"
          aria-pressed={o.value === current}
          lang={o.lang}
          title={o.title}
          onClick={() => {
            setInner(o.value);
            onChange?.(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type Lang = 'kk' | 'ru' | 'en';
export const LANG_OPTIONS: Array<SegmentedOption<Lang>> = [
  { value: 'kk', label: 'Қаз', lang: 'kk' },
  { value: 'ru', label: 'Рус', lang: 'ru' },
  { value: 'en', label: 'Eng', lang: 'en' },
];
