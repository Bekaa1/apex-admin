import { useId, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface FileDropProps {
  id?: string;
  /** `accept` of the file input; dropped files are not filtered by it, so check them in `onFile`. */
  accept: string;
  icon: IconName;
  title: ReactNode;
  hint?: ReactNode;
  buttonLabel: ReactNode;
  /** id of the visible field label that names the input. */
  labelledBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
}

/** Drop zone with a «choose file» look; the whole area opens the file dialog and accepts a dragged file. */
export function FileDrop({ id, accept, icon, title, hint, buttonLabel, labelledBy, invalid, disabled, onFile }: FileDropProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const [over, setOver] = useState(false);
  // dragenter/dragleave also fire for the children; a counter tells when the pointer really leaves.
  const depth = useRef(0);

  const take = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <label
      htmlFor={inputId}
      className={cx('ax-drop', over && 'is-over', invalid && 'is-invalid', disabled && 'is-disabled')}
      onDragEnter={() => {
        depth.current += 1;
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current === 0) setOver(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setOver(false);
        take(event.dataTransfer.files);
      }}
    >
      <span className="ax-drop__icon" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <span className="ax-drop__copy">
        <span className="ax-drop__title">{title}</span>
        {hint ? (
          <span className="ax-drop__hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </span>
      <span className="ax-drop__btn" aria-hidden="true">
        {buttonLabel}
      </span>
      <input
        id={inputId}
        className="ax-drop__input"
        type="file"
        accept={accept}
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          take(event.target.files);
          // Lets the same file be picked again after it was removed.
          event.target.value = '';
        }}
      />
    </label>
  );
}
