// In-memory contract double. No network, environment, database or production SDK.
export function storeBackend() {
  const records = new Map(), keys = new Map(), calls = [];
  let role = 'admin', fault = null, sequence = 1;
  const uuid = () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
  const fail = (message, hint = '') => { throw { code: 'P0001', message, hint }; };
  const mine = entry => ({ ...entry.request, is_mine: role !== 'other' });
  const list = entry => ({ ...mine(entry), has_plan: !!entry.plan, zone_count: entry.zones.length });
  const read = id => { const entry = records.get(id); if (!entry) fail('not_found'); return entry; };
  const envelope = entry => structuredClone({ ...entry, request: mine(entry) });
  function execute(name, p = {}) {
    calls.push({ name, args: structuredClone(p) });
    if (name === 'is_apex_admin') return role !== 'user' && role !== 'signedOut';
    if (name === 'is_apex_store_owner') return role === 'owner';
    if (role === 'signedOut') fail('not_authenticated');
    if (role === 'user') fail('forbidden');
    if (name.startsWith('owner_') && role !== 'owner') fail('forbidden');
    if (name === 'admin_list_store_requests' || name === 'owner_list_pending_store_requests') {
      return [...records.values()].map(list).filter(row => name.startsWith('owner_') ? row.status === 'pending_owner_approval' : !p.p_status || row.status === p.p_status);
    }
    if (name === 'admin_create_store_request') {
      if (keys.has(p.p_request_key)) return keys.get(p.p_request_key);
      const id = uuid(); keys.set(p.p_request_key, id);
      records.set(id, { request: { id, status: 'inactive', revision: 1, name: p.p_name, city: p.p_city || null, address: p.p_address || null,
        timezone: p.p_timezone, review_comment: null, submitted_at: null, published_store_id: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }, plan: null, zones: [], assignments: [] });
      return id;
    }
    if (name === 'get_store_request') return envelope(read(p.p_id));
    const entry = read(p.p_id), r = entry.request;
    if (name === 'owner_approve_store_request' && r.status === 'approved') return r.published_store_id;
    if (role === 'other') fail('forbidden');
    if (r.revision !== p.p_expected_revision) fail('revision_conflict', 'revision');
    if (name.startsWith('admin_') && !['inactive', 'rejected'].includes(r.status)) fail('invalid_status');
    if (name.startsWith('owner_') && r.status !== 'pending_owner_approval') fail('invalid_status');
    switch (name) {
      case 'admin_update_store_request': Object.assign(r, { name: p.p_name, city: p.p_city || null, address: p.p_address || null, timezone: p.p_timezone }); break;
      case 'admin_save_store_plan': entry.plan = { plan_data: structuredClone(p.p_plan), source_file_name: p.p_source_file_name ?? null }; break;
      case 'admin_replace_store_zoning': {
        entry.zones = p.p_zones.map(zone => ({ ...zone, id: uuid() }));
        const ids = new Map(entry.zones.map(zone => [zone.client_id, zone.id]));
        entry.assignments = p.p_assignments.map(a => ({ element_id: a.element_id, zone_id: ids.get(a.zone_client_id) })); break;
      }
      case 'admin_submit_store_request': r.status = 'pending_owner_approval'; r.submitted_at = '2026-01-01T01:00:00Z'; break;
      case 'owner_reject_store_request':
        if (p.p_comment.trim().length < 3) fail('invalid_store', 'comment');
        r.status = 'rejected'; r.review_comment = p.p_comment; break;
      case 'owner_approve_store_request': r.status = 'approved'; r.published_store_id = uuid(); break;
      default: throw new Error('Unexpected mock RPC: ' + name);
    }
    r.revision++; r.updated_at = '2026-01-01T02:00:00Z';
    return name === 'owner_approve_store_request' ? r.published_store_id : r.revision;
  }
  return { calls, records, setRole(value) { role = value; }, getRole: () => role,
    loseNext(name, afterCommit = true) { fault = { name, afterCommit }; },
    client: { rpc(name, args) { return { abortSignal: async () => {
      const lost = fault?.name === name ? fault : null; if (lost) fault = null;
      try {
        if (lost && !lost.afterCommit) { calls.push({ name, args }); throw new Error('Synthetic connection lost'); }
        const data = execute(name, args); if (lost) throw new Error('Synthetic reply lost');
        return { data, error: null };
      } catch (error) { return { data: null, error }; }
    } }; } },
  };
}
