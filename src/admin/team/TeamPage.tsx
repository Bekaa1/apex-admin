import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Alert, Badge, Button, TextField } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { permissionIssue, permissionKey } from '../../auth/permissions';
import { useI18n } from '../../i18n/i18n';
import { changeTeam, readTeam, roleError, RoleApiError, type LookupItem, type TeamChange } from '../roles/api';
import { EntityPicker } from '../roles/EntityPicker';
import { ConfirmChange } from '../roles/ConfirmChange';
import styles from '../roles/Roles.module.css';

type Proposal = { change: TeamChange; summary: string };
type Propose = (value: Proposal) => void;
const STAFF_ROLES = ['owner', 'moderator', 'accountant', 'manager'] as const;
function RoleForm({ propose, blocked }: { propose: Propose; blocked: boolean }) {
  const { t } = useI18n();
  const [user, setUser] = useState<LookupItem | null>(null);
  const [role, setRole] = useState<typeof STAFF_ROLES[number]>('moderator');
  const [grant, setGrant] = useState(true);
  return <section className={styles.panel}><h2>{t('roles.assignRole')}</h2>
    <EntityPicker kind="user" value={user} onChange={setUser} />
    <label className={styles.select}>{t('roles.role')}<select value={role} onChange={event => { const next = STAFF_ROLES.find(value => value === event.target.value); if (next) setRole(next); }}>
      {STAFF_ROLES.map(value => <option key={value} value={value}>{t(`roles.names.${value}`)}</option>)}
    </select></label>
    <label className={styles.select}>{t('roles.action')}<select value={String(grant)} onChange={event => setGrant(event.target.value === 'true')}><option value="true">{t('roles.grant')}</option><option value="false">{t('roles.revoke')}</option></select></label>
    <p className={styles.muted}>{t('roles.multiRole')}</p>
    <Button size="md" disabled={blocked || !user} onClick={() => { if (user) propose({ change: { kind: 'role', userId: user.id, role, grant }, summary: `${user.label} — ${t(`roles.names.${role}`)}: ${t(grant ? 'roles.grant' : 'roles.revoke')}` }); }}>{t('roles.apply')}</Button>
  </section>;
}
function PartnerForms({ propose, blocked }: { propose: Propose; blocked: boolean }) {
  const { t } = useI18n();
  const [name, setName] = useState(''), [legalName, setLegalName] = useState('');
  const [partner, setPartner] = useState<LookupItem | null>(null), [user, setUser] = useState<LookupItem | null>(null), [store, setStore] = useState<LookupItem | null>(null);
  const [role, setRole] = useState<'director' | 'marketer'>('director');
  return <>
    <section className={styles.panel}><h2>{t('roles.createPartner')}</h2>
      <TextField label={t('roles.partnerName')} value={name} maxLength={120} onChange={event => setName(event.target.value)} />
      <TextField label={t('roles.legalName')} value={legalName} maxLength={200} onChange={event => setLegalName(event.target.value)} />
      <Button size="md" disabled={blocked || !name.trim()} onClick={() => propose({ change: { kind: 'partner', name, legalName }, summary: `${t('roles.createPartner')}: ${name.trim()}` })}>{t('roles.createPartner')}</Button>
    </section>
    <section className={styles.panel}><h2>{t('roles.network')}</h2><p className={styles.muted}>{t('roles.networkScope')}</p>
      <EntityPicker kind="partner" value={partner} onChange={setPartner} />
      <EntityPicker kind="user" value={user} onChange={setUser} />
      <label className={styles.select}>{t('roles.role')}<select value={role} onChange={event => { if (event.target.value === 'director' || event.target.value === 'marketer') setRole(event.target.value); }}>
        <option value="director">{t('roles.names.director')}</option><option value="marketer">{t('roles.names.marketer')}</option>
      </select></label>
      <div className={styles.actions}><Button size="md" disabled={blocked || !user || !partner} onClick={() => { if (user && partner) propose({ change: { kind: 'member', userId: user.id, partnerId: partner.id, role }, summary: `${user.label} — ${t(`roles.names.${role}`)}: ${partner.label}` }); }}>{t('roles.assignMember')}</Button>
        <Button size="md" variant="secondary" disabled={blocked || !user} onClick={() => { if (user) propose({ change: { kind: 'member', userId: user.id, partnerId: null, role: null }, summary: `${t('roles.removeMember')}: ${user.label}` }); }}>{t('roles.removeMember')}</Button></div>
      <EntityPicker kind="store" value={store} onChange={setStore} />
      <div className={styles.actions}><Button size="md" disabled={blocked || !store || !partner} onClick={() => { if (store && partner) propose({ change: { kind: 'store', storeId: store.id, partnerId: partner.id }, summary: `${t('roles.linkStore')}: ${store.label} → ${partner.label}` }); }}>{t('roles.linkStore')}</Button>
        <Button size="md" variant="secondary" disabled={blocked || !store} onClick={() => { if (store) propose({ change: { kind: 'store', storeId: store.id, partnerId: null }, summary: `${t('roles.unlinkStore')}: ${store.label}` }); }}>{t('roles.unlinkStore')}</Button></div>
    </section>
  </>;
}
export function TeamPage() {
  const { t } = useI18n(), { session } = useAuthSession(), client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') ?? 1), page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100_000 ? rawPage : 1;
  const query = useQuery({ queryKey: ['admin', 'team', session?.user.id, page], queryFn: ({ signal }) => readTeam(page, signal), retry: false, gcTime: 0, staleTime: 0 });
  const mutation = useMutation({ mutationFn: changeTeam, retry: false, networkMode: 'always' });
  const [proposal, setProposal] = useState<Proposal | null>(null), [feedback, setFeedback] = useState<ReactNode>(null);
  const [unknown, setUnknown] = useState(false), lock = useRef(false);
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['admin', 'role-lookup'] });
    await query.refetch();
  };
  const submit = async () => {
    if (!proposal || lock.current || unknown) return;
    lock.current = true;
    try {
      if (permissionIssue(client, session, 'team')) throw new RoleApiError('denied');
      await mutation.mutateAsync(proposal.change);
      setProposal(null); setFeedback(<Alert tone="success">{t('roles.saved')}</Alert>);
      await client.invalidateQueries({ queryKey: ['admin'] });
      await client.invalidateQueries({ queryKey: permissionKey(session) });
    } catch (error) {
      const kind = roleError(error, true).kind;
      setUnknown(kind === 'unknown'); setProposal(null);
      setFeedback(<Alert tone="danger">{t(`roles.errors.${kind}`)}</Alert>);
      if (kind === 'denied' || kind === 'login') void client.invalidateQueries({ queryKey: permissionKey(session) });
    } finally { lock.current = false; }
  };
  const propose: Propose = value => { if (!lock.current && !unknown) setProposal(value); };
  return <section className={styles.page}>
    <header className={styles.form}><h1>{t('roles.team')}</h1><p className={styles.muted}>{t('roles.teamDescription')}</p></header>
    {feedback}
    {unknown ? <Alert tone="warning" title={t('roles.checkResult')}><p>{t('roles.checkResultBody')}</p><Button size="md" variant="secondary" onClick={() => setUnknown(false)}>{t('roles.checkedResult')}</Button></Alert> : null}
    <div className={styles.actions}><Button size="md" variant="secondary" loading={query.isFetching} disabled={mutation.isPending} onClick={() => { void refresh(); }}>{t('roles.refresh')}</Button></div>
    {query.isPending ? <p role="status">{t('roles.loading')}</p> : query.isError ? <Alert tone="danger">{t(`roles.errors.${roleError(query.error).kind}`)}</Alert>
      : query.data.rows.length ? <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t('roles.team')}><table className={styles.table}>
        <thead><tr>{['person', 'contacts', 'role', 'network'].map(key => <th key={key} scope="col">{t(`roles.${key}`)}</th>)}</tr></thead>
        <tbody>{query.data.rows.map(row => <tr key={row.id}><td>{row.name || t('roles.notSpecified')}</td><td>{row.email || t('roles.notSpecified')}<br />{row.phone}</td>
          <td><div className={styles.chips}>{row.roles.map(role => <Badge key={role}>{t(`roles.names.${role}`)}</Badge>)}</div></td><td>{row.partnerName || row.partnerId || t('roles.notSpecified')}</td></tr>)}</tbody>
      </table></div> : <p>{t('roles.empty')}</p>}
    <div className={styles.actions}><Button size="md" variant="secondary" disabled={page === 1 || query.isFetching} onClick={() => setParams({ page: String(page - 1) })}>{t('roles.previous')}</Button><span>{t('roles.page', { page })}</span><Button size="md" variant="secondary" disabled={!query.data?.hasNext || query.isFetching} onClick={() => setParams({ page: String(page + 1) })}>{t('roles.next')}</Button></div>
    <fieldset disabled={mutation.isPending} className={styles.form} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className={styles.columns}><RoleForm propose={propose} blocked={unknown} /><PartnerForms propose={propose} blocked={unknown} /></div>
    </fieldset>
    {proposal ? <ConfirmChange title={t('roles.confirmTitle')} busy={mutation.isPending} onConfirm={() => { void submit(); }} onClose={() => { if (!lock.current) setProposal(null); }}>
      <p>{proposal.summary}</p><p className={styles.muted}>{t('roles.confirmBody')}</p>
    </ConfirmChange> : null}
  </section>;
}
