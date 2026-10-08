import { memo, type ComponentPropsWithoutRef } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { AppLink } from '../../design-system/AppLink';
import { useI18n } from '../../i18n/i18n';
import styles from './ChatMarkdown.module.css';

const plugins = [remarkGfm, remarkBreaks];

function safeUrl(value: string): string | undefined {
  try {
    const url = new URL(value, 'https://apexmedia.kz');
    if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) return value;
  } catch { /* Malformed and executable URLs remain ordinary text. */ }
  return undefined;
}

function CodeBlock({ children }: ComponentPropsWithoutRef<'pre'>) {
  const { t } = useI18n();
  return <pre tabIndex={0} role="region" aria-label={t('chat.codeBlock')}>{children}</pre>;
}

function Table({ children }: ComponentPropsWithoutRef<'table'>) {
  const { t } = useI18n();
  return <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={t('chat.table')}>
    <table>{children}</table>
  </div>;
}

function MessageLink({ href, children, title }: ComponentPropsWithoutRef<'a'>) {
  if (!href) return <span>{children}</span>;
  if (href.startsWith('#')) return <a href={href} title={title}>{children}</a>;

  const currentUrl = typeof window === 'undefined' ? 'https://apexmedia.kz/' : window.location.href;
  const url = new URL(href, currentUrl);
  const sameSite = url.origin === new URL(currentUrl).origin || url.origin === 'https://apexmedia.kz';
  if (sameSite && !url.username && !url.password) {
    // Canonical links from the assistant stay on the current public app,
    // including localhost. React Router preserves the mounted chat and session.
    const path = `${url.pathname}${url.search}${url.hash}`;
    const document = /\.[a-z0-9]+$/i.test(url.pathname);
    return <AppLink href={path} title={title} target={document ? '_blank' : undefined}
      rel={document ? 'noopener noreferrer' : undefined}>{children}</AppLink>;
  }
  return <a href={href} title={title} target="_blank" rel="noopener noreferrer nofollow">{children}</a>;
}

const components: Components = {
  a: MessageLink,
  // Chat messages cannot trigger image downloads or tracking requests.
  img: ({ alt }) => <span>{alt}</span>,
  pre: CodeBlock,
  table: Table,
};

// Draft typing should not reparse every unchanged message in the history.
export default memo(function ChatMarkdown({ body }: { body: string }) {
  return <div className={styles.content}>
    <Markdown remarkPlugins={plugins} components={components} urlTransform={safeUrl} skipHtml>{body}</Markdown>
  </div>;
});
