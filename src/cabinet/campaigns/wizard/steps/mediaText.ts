import { useI18n } from '../../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../../lib/format';
import { SHOWN_VIDEO_DURATION_SEC } from '../media';
import type { MediaMeta, MediaProblem } from '../types';

const MEGABYTE = 1024 * 1024;

/** Whole megabytes from 10 MB, one decimal below, so a small cover isn't shown as «1 МБ». */
function megabytes(bytes: number): number {
  const mb = bytes / MEGABYTE;
  return mb >= 10 ? Math.round(mb) : Math.max(0.1, Math.round(mb * 10) / 10);
}

/** «7 сек · 1920×1080 · 18 МБ». */
export function useMetaLine(meta: MediaMeta | null): string {
  const { t, lang } = useI18n();
  if (!meta) return '';
  const parts = [
    meta.durationSec ? t('campaigns.wizard.seconds', { n: formatNumber(meta.durationSec, lang) }) : '',
    meta.width && meta.height ? `${meta.width}×${meta.height}` : '',
    meta.sizeBytes ? t('campaigns.wizard.megabytes', { n: formatNumber(megabytes(meta.sizeBytes), lang) }) : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

export function useProblemText() {
  const { t, lang } = useI18n();
  return (problem: MediaProblem, kind: 'video' | 'cover', meta: MediaMeta | null): string => {
    if (problem === 'duration') {
      // Round UP only for the error: 7.9001 must not appear equal to the 7.9 limit.
      const seconds = Math.ceil((meta?.durationSec ?? 0) * 1000) / 1000;
      return t(pluralKey('campaigns.wizard.media.errors.duration', seconds, lang), {
        count: formatNumber(seconds, lang), max: formatNumber(SHOWN_VIDEO_DURATION_SEC, lang),
      });
    }
    if (problem === 'type' && kind === 'cover') return t('campaigns.wizard.media.errors.coverType');
    return t(`campaigns.wizard.media.errors.${problem}`);
  };
}

export function useVideoRules(): string {
  const { t, lang } = useI18n();
  return t('campaigns.wizard.media.videoRules', { max: formatNumber(SHOWN_VIDEO_DURATION_SEC, lang) });
}
