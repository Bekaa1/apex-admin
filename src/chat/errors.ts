const messages = {
  not_authenticated: 'Не удалось войти в чат. Подключитесь повторно.',
  forbidden: 'Нет доступа к этому диалогу.',
  session_not_found: 'Диалог не найден. Подключитесь повторно.',
  invalid_client_key: 'Не удалось восстановить ключ диалога.',
  invalid_message: 'Введите сообщение длиной от 1 до 4000 символов.',
  invalid_limit: 'Не удалось загрузить выбранную страницу сообщений.',
  anonymous_provider_disabled: 'Анонимный вход в чат пока не настроен.',
  network: 'Не удалось связаться с чатом. Проверьте подключение и повторите попытку.',
  realtime: 'Соединение с чатом прервано. Переподключитесь или обновите историю.',
  not_configured: 'Подключение к чату не настроено.',
  invalid_configuration: 'Подключение к чату настроено некорректно.',
  storage_unavailable: 'Для восстановления диалога разрешите локальное хранение данных.',
  invalid_response: 'Не удалось прочитать ответ чата. Повторите загрузку.',
  cancelled: 'Подключение к чату закрыто.',
  unknown: 'Не удалось выполнить действие в чате. Повторите попытку.',
} as const;

export type ChatErrorCode = keyof typeof messages;
export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly field?: string;

  constructor(code: ChatErrorCode, field?: string) {
    super(messages[code]);
    this.name = 'ChatError';
    this.code = code;
    this.field = field;
  }
}

// Never expose raw SQL, details, configuration or stack traces to consumers.
export function toChatError(value: unknown): ChatError {
  if (value instanceof ChatError) return value;
  const error = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const code = error.code === '42501' ? 'forbidden'
    : typeof error.message === 'string' && Object.hasOwn(messages, error.message) ? error.message
    : typeof error.code === 'string' && Object.hasOwn(messages, error.code) ? error.code
    : /fetch|network|timeout|timed out|load failed|abort/i.test(String(error.message ?? ''))
      || ['AbortError', 'TimeoutError', 'AuthRetryableFetchError'].includes(String(error.name)) ? 'network'
    : 'unknown';
  const field = ['client_key', 'session_id', 'client_message_id', 'body', 'limit'].includes(String(error.hint))
    ? String(error.hint) : undefined;
  return new ChatError(code as ChatErrorCode, field);
}
