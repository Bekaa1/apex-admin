import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { canEdit, requestPath, type StoreRequest } from '../model';
import { failure, logFailure, RequestFailure } from '../errors';
import { PlanPreview } from '../plan/PlanPreview';
import { useUnsavedPlan } from '../plan/useUnsavedPlan';
import { UnsavedPlanDialog } from '../plan/UnsavedPlanDialog';
import { assignElements, elementsInArea, restoreZoning, sameDraft, validateZoning, validColor, zoningPayload, ZoningValidationError, type Tool, type ZoningDraft, type ZoningPayload } from './model';
import { readZoningResult, saveZoning, type ZoningSaveResult } from './save';
import { ZonePanel } from './ZonePanel';
import shared from '../StoreRequestPage.module.css';
import styles from './Zoning.module.css';

function load(record: StoreRequest) {
  try { return { data: restoreZoning(record), error: null }; }
  catch (error) { logFailure('restore_store_zoning', error); return { data: null, error: failure(error) }; }
}
export function StoreZoningStep({ record, onRevision, onSaved }: {
  record: StoreRequest; onRevision: (revision: number) => void; onSaved: (result: ZoningSaveResult, next: boolean) => void;
}) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(() => load(record));
  const [draft, setDraft] = useState<ZoningDraft>(() => loaded.data?.draft ?? { zones: [], assignments: new Map() });
  const [active, setActive] = useState<string | null>(() => draft.zones[0]?.client_id ?? null);
  const [selected, setSelected] = useState<string | null>(null), [tool, setTool] = useState<Tool>('inspect');
  const [issue, setIssue] = useState<RequestFailure | null>(null), [notice, setNotice] = useState<'saved' | 'changed' | null>(null);
  const [forcedReadOnly, setForcedReadOnly] = useState(false), [reading, setReading] = useState(false);
  const alive = useRef(true), busy = useRef(false);
  const lastAttempt = useRef<{ record: StoreRequest; payload: ZoningPayload } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const mutation = useMutation({ mutationFn: (value: ZoningDraft) => saveZoning(record, value, revision => { if (alive.current) onRevision(revision); }), retry: false, networkMode: 'always', gcTime: 0 });
  const pending = mutation.isPending || reading;
  const editable = canEdit(record) && !forcedReadOnly;
  const blocked = Boolean(issue && ['unresolved', 'forbidden', 'not_found', 'not_authenticated', 'invalid_status', 'invalid_plan'].includes(issue.kind));
  const disabled = !editable || pending || blocked;
  const dirty = Boolean(loaded.data && !sameDraft(draft, loaded.data.draft));
  const navigation = useUnsavedPlan(dirty, pending);
  const validation = loaded.data ? validateZoning(draft, loaded.data.plan) : [];
  function change(value: ZoningDraft) {
    if (disabled || busy.current) return;
    navigation.guard(); setDraft(value); setNotice(null); setIssue(null);
  }
  function accept(result: ZoningSaveResult, next: boolean) {
    const fresh = load(result.record);
    setLoaded(fresh); setIssue(null); setNotice(result.outcome); setForcedReadOnly(result.readOnly);
    if (fresh.data) { setDraft(fresh.data.draft); setActive(fresh.data.draft.zones[0]?.client_id ?? null); }
    setSelected(null); setTool('inspect');
    const proceed = result.outcome === 'saved' && Boolean(fresh.data) && next;
    if (proceed) navigation.allow();
    onSaved(result, proceed);
  }
  async function save(next: boolean) {
    if (busy.current || disabled || !loaded.data || validation.length) return;
    busy.current = true; setIssue(null); setNotice(null);
    try {
      lastAttempt.current = { record, payload: zoningPayload(draft, loaded.data.plan) };
      const result = await mutation.mutateAsync(draft);
      if (alive.current) accept(result, next);
    } catch (error) {
      if (alive.current && !(error instanceof ZoningValidationError)) {
        const parsed = failure(error); setIssue(parsed); if (parsed.kind === 'invalid_status') setForcedReadOnly(true);
      }
    } finally { busy.current = false; }
  }
  async function recheck() {
    if (busy.current || !lastAttempt.current) return;
    busy.current = true; setReading(true);
    try {
      const result = await readZoningResult(lastAttempt.current.record, lastAttempt.current.payload);
      if (alive.current) accept(result, false);
    } catch (error) {
      if (alive.current) { const parsed = failure(error); setIssue(parsed); if (parsed.kind === 'invalid_status') setForcedReadOnly(true); }
    } finally { busy.current = false; if (alive.current) setReading(false); }
  }
  const zoneMap = new Map(draft.zones.map(zone => [zone.client_id, zone]));
  const colors = new Map<string, string>(), labels = new Map<string, string>();
  for (const [elementId, zoneId] of draft.assignments) {
    const zone = zoneMap.get(zoneId);
    if (zone) { if (validColor(zone.color)) colors.set(elementId, zone.color); labels.set(elementId, zone.name || t('adminStoreZoning.unnamed')); }
  }
  const plan = loaded.data?.plan, element = plan?.elements.find(e => e.id === selected);
  const invalidIds = new Set(validation.flatMap(i => i.elementId ? [i.elementId] : []));
  if (issue?.kind === 'invalid_assignments' && invalidIds.size === 0) for (const id of draft.assignments.keys()) invalidIds.add(id);
  return <div className={shared.panel} aria-busy={pending}>
    <h2>{t('adminStoreZoning.title')}</h2>
    {!editable && <Alert title={t('adminStoreRequest.readOnly')} />}
    {record.status === 'rejected' && record.review_comment && <Alert tone="danger" title={t('adminStoreRequest.ownerComment')}><span className={shared.comment}>{record.review_comment}</span></Alert>}
    {loaded.error && <Alert tone="danger" title={t(`adminStoreZoning.errors.${loaded.error.kind}`)} />}
    {issue && <Alert tone="danger" title={t(`adminStoreZoning.errors.${issue.kind}`)}>
      {issue.details && <p>{issue.details}</p>}
      {issue.hint ? `${t('adminStorePlan.field')}: ${issue.hint}. ${t(`adminStoreZoning.hints.${issue.hint.replaceAll('.', '_')}`)}` : undefined}
    </Alert>}
    {notice && <Alert tone={notice === 'saved' ? 'success' : 'warning'} title={t(`adminStoreZoning.${notice}`)} />}
    {loaded.data && loaded.data.discarded.length > 0 && <Alert tone="warning" title={t('adminStoreZoning.discarded', { count: loaded.data.discarded.length })} />}
    {plan && <>
      {validation.length > 0 && editable && <Alert tone="danger" title={t('adminStoreZoning.validationSummary')}>{t(`adminStoreZoning.validation.${validation[0].code}`)}</Alert>}
      <div className={styles.layout}>
        <div className={`${styles.canvas} ${issue?.kind === 'invalid_assignments' ? styles.invalid : ''}`}>
          {editable && <div className={styles.row} role="group" aria-label={t('adminStoreZoning.tools')}>
            {(['inspect', 'brush', 'area', 'eraser'] as const).map(value => <Button key={value} size="md" variant={tool === value ? 'primary' : 'secondary'} aria-pressed={tool === value}
              disabled={disabled} onClick={() => setTool(value)}>{t(`adminStoreZoning.tool.${value}`)}</Button>)}
          </div>}
          <p>{t(`adminStoreZoning.help.${editable ? tool : 'inspect'}`)}</p>
          {editable && (tool === 'brush' || tool === 'area') && <p>{t('adminStoreZoning.active')}: {zoneMap.get(active ?? '')?.name || t('adminStoreZoning.selectZone')}</p>}
          <PlanPreview plan={plan} interaction={{ selectedId: selected, colors, labels, unassigned: t('adminStoreZoning.unassigned'), invalidIds,
            onElement: id => {
              setSelected(id);
              if (tool === 'brush' && active) change(assignElements(draft, [id], active, plan));
              else if (tool === 'eraser') change(assignElements(draft, [id], null, plan));
            },
            onArea: !disabled && tool === 'area' && active ? area => change(assignElements(draft, elementsInArea(plan, area), active, plan)) : undefined,
          }} />
          <p>{t('adminStoreZoning.unassignedHint')}</p>
          {element ? <div className={styles.details} aria-live="polite">
            <strong>{element.label || element.id}</strong><p>id: {element.id}</p>
            <p>kind: {element.kind} · {t(`adminStorePlan.kind.${element.kind}`)}</p>
            <p>{t('adminStoreZoning.zone')}: {labels.get(element.id) ?? t('adminStoreZoning.unassigned')}</p>
          </div> : <p>{t('adminStoreZoning.selectElement')}</p>}
        </div>
        <ZonePanel draft={draft} active={active} onActive={setActive} onChange={change} disabled={disabled} issues={validation}
          serverHint={issue?.kind === 'invalid_zones' ? issue.hint ?? 'zones' : undefined} />
      </div>
    </>}
    <div className={shared.actions}>
      <Button size="md" href={requestPath(record.id, 'plan')} variant="secondary" disabled={pending}>{t('adminStorePlan.back')}</Button>
      {editable && plan && <>
        <Button size="md" variant="secondary" disabled={disabled || validation.length > 0} onClick={() => void save(false)}>{t('adminStoreRequest.save')}</Button>
        <Button size="md" loading={mutation.isPending} disabled={disabled || validation.length > 0} onClick={() => void save(true)}>{t('adminStoreRequest.saveNext')}</Button>
      </>}
      {issue?.kind === 'unresolved' && <Button size="md" loading={reading} onClick={() => void recheck()}>{t('adminStoreRequest.recheck')}</Button>}
      {issue?.kind === 'not_authenticated' && <Button size="md" href="/login">{t('adminStoreRequest.signIn')}</Button>}
    </div>
    {navigation.blocker.state === 'blocked' && <UnsavedPlanDialog scope="adminStoreZoning" busy={pending} onStay={() => navigation.blocker.reset?.()} onLeave={() => navigation.blocker.proceed?.()} />}
  </div>;
}
