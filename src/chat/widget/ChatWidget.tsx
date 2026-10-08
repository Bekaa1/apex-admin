import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '../../design-system/Button';
import { Icon } from '../../design-system/Icon';
import { useI18n } from '../../i18n/i18n';
import { chatTransport } from '../index';
import { ChatWidgetController, isNearBottom, shouldSendOnEnter, type WidgetTransport } from './controller';
import ChatMarkdown from './ChatMarkdown';
import styles from './ChatWidget.module.css';

export default function ChatWidget({ transport = chatTransport }: { transport?: WidgetTransport }) {
  const { t, lang } = useI18n();
  const [controller] = useState(() => new ChatWidgetController(transport));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const anchor = useRef<{ key: string; offset: number } | null>(null);
  const previousLast = useRef<string | undefined>(undefined);
  useEffect(() => controller.mount(), [controller]);

  const scrollToBottom = () => {
    const element = history.current;
    if (element) element.scrollTop = element.scrollHeight;
    nearBottom.current = true;
    controller.setNearBottom(true);
  };
  const close = () => { controller.close(); requestAnimationFrame(() => launcher.current?.focus()); };

  useEffect(() => {
    if (!state.open) return;
    input.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); controller.close(); requestAnimationFrame(() => launcher.current?.focus()); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [state.open, controller]);

  useLayoutEffect(() => {
    const element = history.current;
    if (!state.open || !element) return;
    const last = state.messages.at(-1)?.key;
    if (anchor.current) {
      const item = Array.from(element.querySelectorAll<HTMLElement>('[data-message-key]'))
        .find(row => row.dataset.messageKey === anchor.current?.key);
      if (item) element.scrollTop += item.getBoundingClientRect().top - element.getBoundingClientRect().top - anchor.current.offset;
      if (!state.loadingOlder) anchor.current = null;
    } else if (nearBottom.current || !previousLast.current) {
      element.scrollTop = element.scrollHeight;
    }
    previousLast.current = last;
  }, [state.open, state.messages, state.loadingOlder, state.connection.replyPending]);

  const loadOlder = () => {
    const element = history.current;
    if (element) {
      const top = element.getBoundingClientRect().top;
      const item = Array.from(element.querySelectorAll<HTMLElement>('[data-message-key]'))
        .find(row => row.getBoundingClientRect().bottom > top);
      if (item) anchor.current = { key: item.dataset.messageKey!, offset: item.getBoundingClientRect().top - top };
    }
    void controller.loadOlder();
  };
  const { connection } = state;
  const available = connection.phase === 'ready' || connection.phase === 'reconnecting';
  const unavailable = connection.error && ['not_configured', 'invalid_configuration', 'anonymous_provider_disabled', 'storage_unavailable'].includes(connection.error.code);
  const errorKey = unavailable ? 'unavailable' : connection.errorSource === 'history' ? 'historyError' : 'connectError';
  const showError = connection.error && connection.errorSource !== 'send';
  const time = new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-KZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  const date = new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-KZ' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return <div className={styles.widget}>
    {state.open ? <section className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="apex-chat-title" id="apex-chat-panel">
      <header className={styles.header}>
        <span className={styles.emblem} aria-hidden="true"><Icon name="message-circle" /></span>
        <div className={styles.heading}>
          <h2 id="apex-chat-title">{t('chat.title')}</h2>
          <p role="status"><span className={styles.dot} data-ready={connection.phase === 'ready'} aria-hidden="true" />
            {t(`chat.connection.${connection.phase}`)}</p>
        </div>
        <button type="button" className={styles.close} aria-label={t('chat.close')} onClick={close}><Icon name="x" /></button>
      </header>
      {connection.replyError ? <div className={styles.error} role="status">
        <Icon name="alert-circle" /><div><p>{t('chat.replyError')}</p>
          <Button variant="ghost" size="md" disabled={connection.replyPending || !available}
            onClick={() => void controller.retryReplies()}>{t('chat.retryReply')}</Button>
        </div>
      </div> : null}
      {showError ? <div className={styles.error} role="status">
        <Icon name="alert-circle" /><div><p>{t(`chat.${errorKey}`)}</p>
          <Button variant="ghost" size="md" loading={state.retrying} onClick={() => void controller.reconnect()}>{t('chat.retryConnection')}</Button>
        </div>
      </div> : null}
      <div className={styles.history} ref={history} tabIndex={0} aria-label={t('chat.history')}
        onScroll={event => {
          const element = event.currentTarget;
          nearBottom.current = isNearBottom(element.scrollTop, element.clientHeight, element.scrollHeight);
          controller.setNearBottom(nearBottom.current);
        }}>
        {connection.hasOlderMessages ? <div className={styles.older}><Button variant="ghost" size="md" loading={state.loadingOlder} onClick={loadOlder}>{t('chat.older')}</Button></div> : null}
        {!connection.historyLoaded && connection.phase === 'connecting' ? <div className={styles.historyLoading} role="status">
          <span className="ax-spinner" aria-hidden="true" />
          <span className={styles.srOnly}>{t('chat.connectingHistory')}</span>
        </div> : null}
        {connection.historyLoaded && state.messages.length === 0 ? <div className={styles.empty}>
          <span className={styles.welcomeIcon} aria-hidden="true"><Icon name="message-circle" size={32} /></span>
          <p>{t('chat.initial')}</p>
        </div> : null}
        <ol className={styles.messages} aria-label={t('chat.messages')}>
          {state.messages.map(message => <li className={styles.message} data-sender={message.sender} key={message.key} data-message-key={message.key}>
            <span className={styles.sender}>{t(message.sender === 'visitor' ? 'chat.you' : 'chat.support')}</span>
            <ChatMarkdown body={message.body} />
            <div className={styles.meta}>
              <time dateTime={message.createdAt} title={date.format(new Date(message.createdAt))}>{time.format(new Date(message.createdAt))}</time>
              {message.status ? <span className={message.status === 'failed' ? styles.failed : undefined}>{t(`chat.delivery.${message.status}`)}</span> : null}
            </div>
            {message.status === 'failed' ? <div className={styles.retryMessage}>
              <span>{t('chat.sendError')}</span>
              <button type="button" disabled={state.sending || !available} onClick={() => void controller.retryMessage(message.clientMessageId)}>{t('chat.retry')}</button>
            </div> : null}
          </li>)}
          {connection.replyPending ? <li className={`${styles.message} ${styles.typing}`} data-sender="responder">
            <div role="status">
              <span className={styles.srOnly}>{t('chat.replyPending')}</span>
              <span className={styles.typingDots} aria-hidden="true"><span /><span /><span /></span>
            </div>
          </li> : null}
        </ol>
      </div>
      {state.newMessages > 0 ? <button type="button" className={styles.newMessages} onClick={scrollToBottom}>{t('chat.newMessages')} <span aria-hidden="true">↓</span></button> : null}
      <form className={styles.composer} onSubmit={event => { event.preventDefault(); void controller.sendDraft(); }}>
        <label htmlFor="apex-chat-input">{t('chat.inputLabel')}</label>
        <textarea id="apex-chat-input" ref={input} value={state.draft} rows={3} maxLength={4000}
          placeholder={t('chat.placeholder')} aria-describedby="apex-chat-input-hint" aria-invalid={Boolean(state.formError)}
          onChange={event => controller.setDraft(event.target.value)}
          onKeyDown={event => {
            if (shouldSendOnEnter({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing, keyCode: event.nativeEvent.keyCode })) {
              event.preventDefault(); void controller.sendDraft();
            }
          }} />
        {state.formError ? <p className={styles.formError} role="alert">{t('chat.invalidMessage')}</p> : null}
        <div className={styles.composerFooter}>
          <span id="apex-chat-input-hint">{t('chat.inputHint')}<span className={styles.counter}>{Array.from(state.draft).length} / 4000</span></span>
          <Button size="md" iconRight="send" type="submit" disabled={!available || !state.draft.trim()} loading={state.sending}>{t('chat.send')}</Button>
        </div>
      </form>
      <span className={styles.srOnly} aria-live="polite" aria-atomic="true">{state.announcement > 0 ? t('chat.announcement', { count: state.announcement }) : ''}</span>
    </section> : null}
    <button ref={launcher} type="button" className={styles.launcher} aria-expanded={state.open}
      aria-controls={state.open ? 'apex-chat-panel' : undefined}
      aria-label={state.open ? t('chat.close') : state.unread ? t('chat.openUnread', { count: state.unread }) : t('chat.open')}
      onClick={() => { if (state.open) close(); else { nearBottom.current = true; anchor.current = null; controller.open(); } }}>
      <Icon name={state.open ? 'x' : 'message-circle'} size={26} />
      <span className={styles.launcherLabel}>{t('chat.launcher')}</span>
      {state.unread > 0 ? <span className={styles.badge} aria-hidden="true">{state.unread > 99 ? '99+' : state.unread}</span> : null}
    </button>
  </div>;
}
