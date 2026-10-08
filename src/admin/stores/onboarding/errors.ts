import { FIELDS, type Field } from './model';

const known = ['not_authenticated', 'forbidden', 'not_found', 'invalid_status', 'revision_conflict', 'invalid_store', 'owner_not_configured', 'already_published', 'invalid_plan', 'plan_too_large', 'too_many_elements', 'duplicate_element', 'invalid_zones', 'invalid_assignments'] as const;
export type FailureKind = typeof known[number] | 'unknown' | 'invalid_response' | 'storage' | 'unresolved';
export class RequestFailure extends Error {
  kind: FailureKind;
  field?: Field;
  hint?: string;
  details?: string;
  constructor(kind: FailureKind, field?: Field, hint?: string, details?: string) { super(kind); this.kind = kind; this.field = field; this.hint = hint; this.details = details; }
}
export function failure(error: unknown): RequestFailure {
  if (error instanceof RequestFailure) return error;
  const info = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  if (info.code === '42501') return new RequestFailure('forbidden');
  const kind = known.find(code => info.message === code || info.code === code);
  const field = FIELDS.find(name => info.hint === name);
  const hint = typeof info.hint === 'string' && /^(?:plan|source_file_name|version|width|height|elements|decorations|metadata|elements\.(?:id|kind|x|y|width|height|label|category)|zones(?:\.(?:client_id|name|color|description|sort_order))?|assignments(?:\.(?:element_id|zone_client_id))?)$/.test(info.hint) ? info.hint : undefined;
  const details = info.code === 'P0001' && kind && typeof info.details === 'string' && safeDetails.has(`${kind}:${info.details.trim()}`) ? info.details.trim() : undefined;
  return new RequestFailure(kind ?? (info.message === 'invalid_response' ? 'invalid_response' : 'unknown'), field, info.hint === 'comment' ? 'comment' : hint, details);
}
/** Only reviewed, literal user messages from the installed contract; never SQL or interpolated data. */
const safeDetails = new Set([
  "invalid_plan:План должен быть JSON-объектом",
  "plan_too_large:План больше 512 КБ",
  "invalid_plan:Поддерживается только version = 1",
  "invalid_plan:width и height должны быть числами",
  "invalid_plan:width и height должны быть от 0 до 100000",
  "invalid_plan:elements должен быть массивом",
  "invalid_plan:decorations должен быть массивом",
  "invalid_plan:metadata должен быть объектом",
  "too_many_elements:Не больше 1000 элементов",
  "too_many_elements:Не больше 2000 декоративных элементов",
  "invalid_plan:Нужен хотя бы один назначаемый элемент",
  "invalid_plan:План не может содержать HTML или JavaScript",
  "invalid_zones:Нужна хотя бы одна зона",
  "invalid_zones:У каждой зоны должна быть хотя бы одна секция плана",
  "invalid_assignments:Есть назначения на секции, которых нет в плане",
  "not_authenticated:Нужно войти",
  "forbidden:Только для администратора",
  "not_found:Заявка не найдена",
  "forbidden:Изменять заявку может только её автор",
  "invalid_status:Изменять можно только заявку в статусе inactive или rejected",
  "revision_conflict:Заявку уже изменили, обновите страницу",
  "invalid_store:Название: от 2 до 120 символов",
  "invalid_store:Город обязателен, до 80 символов",
  "invalid_store:Адрес обязателен, до 200 символов",
  "invalid_store:Неизвестный часовой пояс",
  "invalid_store:Партнёр не найден",
  "invalid_store:Нужен request_key",
  "forbidden:Ключ запроса уже использован",
  "invalid_plan:Имя файла до 255 символов",
  "invalid_plan:Загрузите план магазина",
  "owner_not_configured:Владелец Apex не настроен",
  "forbidden:Одобрять может только владелец Apex",
  "already_published:Заявка уже одобрена",
  "invalid_status:Одобрить можно только заявку, ожидающую владельца",
  "already_published:Магазин по этой заявке уже существует",
  "invalid_plan:У заявки нет плана",
  "forbidden:Отклонять может только владелец Apex",
  "invalid_store:Комментарий обязателен: от 3 до 1000 символов",
  "invalid_status:Отклонить можно только заявку, ожидающую владельца",
  "forbidden:Нет доступа",
  "forbidden:Только для владельца Apex",
  "not_found:У магазина нет опубликованного плана",
  "invalid_plan:Сначала сохраните план",
  "invalid_zones:Нужно от 1 до 200 зон",
  "invalid_assignments:assignments должен быть массивом",
]);
/** Never log SQL text, store data, request keys, IDs, tokens or raw details. */
export function logFailure(operation: string, error: unknown) {
  const info = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const parsed = failure(error);
  console.error('[store-request]', {
    operation,
    code: typeof info.code === 'string' && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(info.code) ? info.code : 'unavailable',
    message: parsed.kind, hint: parsed.field ?? parsed.hint ?? (info.hint ? 'redacted' : 'absent'),
    details: info.details ? 'redacted' : 'absent',
  });
}
