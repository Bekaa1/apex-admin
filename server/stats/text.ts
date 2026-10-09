import type { ReportLanguage } from '../../src/cabinet/stats/reportSelection.ts';

const ru = {
  title: 'Статистика рекламных кампаний', generated: 'Дата формирования', period: 'Период', zone: 'Часовой пояс: Asia/Almaty',
  all: 'Все кампании', running: 'Незавершённые кампании', finished: 'Завершённые кампании', single: 'Выбранная кампания',
  overview: 'Основные показатели', campaigns: 'Статистика по кампаниям', campaign: 'Кампания', status: 'Статус',
  plays: 'Показы', previous: 'Показы за предыдущий период', spent: 'Расход', price: 'Средняя цена показа',
  estimated: 'Расчётный расход', noData: 'Нет данных', total: 'Итого', summary: 'Краткий итог', recommendations: 'Рекомендации ИИ',
  evidence: 'Основание', action: 'Действие', check: 'Как проверить результат', comparison: 'Период сравнения',
  limitation: 'Расход за выбранный период рассчитан как показы × текущая цена показа кампании. При изменении тарифа он может отличаться от фактических списаний. Средняя цена также расчётная.',
  actual: 'Расход за всё время взят из накопленного spent_budget. Отсутствующие значения не заменены нулями.',
  incomplete: 'Текущий день может быть неполным. Данные перечитаны при формировании отчёта; время синхронизации оборудования неизвестно.',
  aiNote: 'Рекомендации ИИ — гипотезы для проверки. Данных о продажах, конверсиях, уникальном охвате, эффективности креатива и показах по часам, зонам и супермаркетам нет. Выводы об окупаемости не делаются.',
  page: 'Страница', continued: 'продолжение',
};
const en: typeof ru = {
  title: 'Advertising campaign statistics', generated: 'Generated', period: 'Period', zone: 'Time zone: Asia/Almaty',
  all: 'All campaigns', running: 'Ongoing campaigns', finished: 'Completed campaigns', single: 'Selected campaign',
  overview: 'Key metrics', campaigns: 'Campaign statistics', campaign: 'Campaign', status: 'Status', plays: 'Plays', previous: 'Plays in the previous period',
  spent: 'Spend', price: 'Average price per play', estimated: 'Estimated spend', noData: 'No data', total: 'Total', summary: 'Summary', recommendations: 'AI recommendations',
  evidence: 'Evidence', action: 'Action', check: 'How to evaluate', comparison: 'Comparison period',
  limitation: 'Period spend is estimated as plays × the current campaign price per play. Tariff changes may make this differ from actual charges. The average price is also estimated.',
  actual: 'Lifetime spend comes from cumulative spent_budget. Missing values are not replaced with zeros.',
  incomplete: 'The current day may be incomplete. Data was reloaded for this report; equipment synchronization time is unknown.',
  aiNote: 'AI recommendations are hypotheses to evaluate. Sales, conversions, unique reach, creative effectiveness, and hourly, zone or supermarket play breakdowns are unavailable. No return-on-investment conclusions are made.',
  page: 'Page', continued: 'continued',
};
const kk: typeof ru = {
  title: 'Жарнамалық науқандар статистикасы', generated: 'Қалыптастырылған күні', period: 'Кезең', zone: 'Уақыт белдеуі: Asia/Almaty',
  all: 'Барлық науқандар', running: 'Аяқталмаған науқандар', finished: 'Аяқталған науқандар', single: 'Таңдалған науқан',
  overview: 'Негізгі көрсеткіштер', campaigns: 'Науқандар бойынша статистика', campaign: 'Науқан', status: 'Мәртебе', plays: 'Көрсетілімдер', previous: 'Алдыңғы кезеңдегі көрсетілімдер',
  spent: 'Шығын', price: 'Көрсетілімнің орташа бағасы', estimated: 'Есептік шығын', noData: 'Дерек жоқ', total: 'Барлығы', summary: 'Қысқаша қорытынды', recommendations: 'ЖИ ұсыныстары',
  evidence: 'Негіздеме', action: 'Әрекет', check: 'Нәтижені тексеру', comparison: 'Салыстыру кезеңі',
  limitation: 'Кезең шығыны көрсетілімдер × науқанның ағымдағы көрсетілім бағасы бойынша есептеледі. Тариф өзгерсе, нақты есептен шығарудан айырмашылығы болуы мүмкін. Орташа баға да есептік мән.',
  actual: 'Барлық уақыттағы шығын жинақталған spent_budget мәнінен алынған. Жоқ мәндер нөлге ауыстырылмаған.',
  incomplete: 'Ағымдағы күн толық болмауы мүмкін. Есеп үшін деректер қайта жүктелді; жабдықтың синхрондау уақыты белгісіз.',
  aiNote: 'ЖИ ұсыныстары — тексеруге арналған болжамдар. Сату, конверсия, бірегей қамту, ролик тиімділігі және сағаттар, аймақтар мен супермаркеттер бойынша көрсетілімдер туралы деректер жоқ. Өтелімділік туралы қорытынды жасалмайды.',
  page: 'Бет', continued: 'жалғасы',
};
export const reportText: Record<ReportLanguage, typeof ru> = { ru, kk, en };
export const locale = (language: ReportLanguage) => ({ ru: 'ru-KZ', kk: 'kk-KZ', en: 'en-GB' })[language];
export const number = (value: number | null, language: ReportLanguage, money = false) => value === null ? reportText[language].noData
  : new Intl.NumberFormat(locale(language), { maximumFractionDigits: money ? 6 : 0 }).format(value) + (money ? ' ₸' : '');
