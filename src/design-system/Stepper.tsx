import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export type StepperState = 'done' | 'current' | 'todo' | 'skipped';

export interface StepperStep {
  key: string;
  label: ReactNode;
  state: StepperState;
  /** Under the label of a skipped step, e.g. «Не нужен для тарифа». */
  note?: ReactNode;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Accessible name, e.g. «Шаги создания кампании». */
  label: string;
  /** Compact view on narrow screens, e.g. «Шаг 3 из 4» (skipped steps don't count). */
  countText: string;
  /** Spoken after each label, e.g. { done: ', готово', current: ', текущий шаг', todo: ', впереди', skipped: ', пропущен' }. */
  stateLabels: Record<StepperState, string>;
  /** Done steps become buttons that go back to them. */
  onStepClick?: (key: string) => void;
  className?: string;
}

/** Wizard progress: numbered steps with lines; below 720px of width a «Step N of M» line with a bar. */
export function Stepper({ steps, label, countText, stateLabels, onStepClick, className }: StepperProps) {
  const current = steps.find((step) => step.state === 'current');
  return (
    <nav className={cx('ax-stepper', className)} aria-label={label}>
      <div className="ax-stepper__compact" aria-hidden="true">
        <p className="ax-stepper__count">
          <span>{countText}</span>
          {current ? <strong>{current.label}</strong> : null}
        </p>
        <span className="ax-stepper__bar">
          {steps.map((step) => (
            <span key={step.key} className={`is-${step.state}`} />
          ))}
        </span>
      </div>
      <ol className="ax-stepper__list">
        {steps.map((step, i) => {
          const body = (
            <>
              <span className="ax-stepper__num" aria-hidden="true">
                {step.state === 'done' ? <Icon name="check" size={18} strokeWidth={2.25} /> : null}
                {step.state === 'skipped' ? <Icon name="minus" size={16} /> : null}
                {step.state === 'current' || step.state === 'todo' ? i + 1 : null}
              </span>
              <span className="ax-stepper__text">
                <span className="ax-stepper__label">{step.label}</span>
                {step.note ? <span className="ax-stepper__note">{step.note}</span> : null}
                <span className="ax-sr">{stateLabels[step.state]}</span>
              </span>
            </>
          );
          return (
            <li key={step.key} className={`ax-stepper__item is-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}>
              {step.state === 'done' && onStepClick ? (
                <button type="button" className="ax-stepper__step ax-stepper__step--link" onClick={() => onStepClick(step.key)}>
                  {body}
                </button>
              ) : (
                <span className="ax-stepper__step">{body}</span>
              )}
              {i < steps.length - 1 ? <span className="ax-stepper__line" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
