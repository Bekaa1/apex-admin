import { useEffect, useId, useRef, useState } from 'react';
import { Button, Icon } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_URL, SUPPORT_WHATSAPP_URL } from '../lib/contacts';
import styles from './PublicLayout.module.css';

export function ContactDropdown({ mobile = false }: { mobile?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    const element = root.current;
    element?.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      element?.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className={mobile ? styles.mobileContacts : styles.contacts}
      onPointerEnter={(event) => { if (!mobile && event.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={() => { if (!mobile && !root.current?.contains(document.activeElement)) setOpen(false); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      <button ref={trigger} type="button" className={styles.navButton} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        {t('landing.nav.contacts')}<Icon name="chevron-down" size={16} />
      </button>
      <div id={id} hidden={!open} className={styles.contactPosition}>
        <div className={styles.contactPanel}>
          <p className={styles.contactHeading}>{t('public.contacts.title')}</p>
          <p className={styles.contactLead}>{t('public.contacts.text')}</p>
          <a className={styles.contactLink} href={SUPPORT_PHONE_URL}><Icon name="phone" /><span>{SUPPORT_PHONE}</span></a>
          <a className={styles.contactLink} href={`mailto:${SUPPORT_EMAIL}`}><Icon name="mail" /><span>{SUPPORT_EMAIL}</span></a>
          <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" iconLeft="message-circle" size="md" fullWidth>
            {t('public.contacts.whatsapp')}
          </Button>
        </div>
      </div>
    </div>
  );
}
