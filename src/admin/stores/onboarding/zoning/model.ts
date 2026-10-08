import type { StoreRequest } from '../model';
import { RequestFailure } from '../errors';
import { sameJson, validatePlan, type PlanDocument } from '../plan/model';

export interface Zone { client_id: string; name: string; color: string; description: string }
export interface ZoningDraft { zones: Zone[]; assignments: Map<string, string> }
export interface ZoneInput extends Omit<Zone, 'description'> { description: string | null; sort_order: number }
export interface ZoningPayload { zones: ZoneInput[]; assignments: { element_id: string; zone_client_id: string }[] }
export interface ZoningIssue { code: 'count' | 'clientId' | 'name' | 'duplicateName' | 'color' | 'description' | 'emptyZone' | 'assignment'; zoneId?: string; elementId?: string }
export type Tool = 'inspect' | 'brush' | 'area' | 'eraser';
export interface Area { x: number; y: number; width: number; height: number }
export class ZoningValidationError extends Error {
  issues: ZoningIssue[];
  constructor(issues: ZoningIssue[]) { super('invalid_zoning'); this.issues = issues; }
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const validId = (s: string) => /^[A-Za-z0-9_.:-]{1,64}$/.test(s);
export const validColor = (s: string) => /^#[0-9A-Fa-f]{6}$/.test(s);
const length = (s: string) => Array.from(s).length;

/** Keep the server IDs only in this adapter. All editing and writes use client_id. */
export function restoreZoning(record: StoreRequest) {
  if (!record.plan) throw new RequestFailure('invalid_plan');
  let plan: PlanDocument;
  try { plan = validatePlan(record.plan.plan_data); } catch { throw new RequestFailure('invalid_plan'); }
  if (!Array.isArray(record.zones) || !Array.isArray(record.assignments)) throw new RequestFailure('invalid_response');
  const serverToClient = new Map<string, string>(), seenClient = new Set<string>();
  const sorted = record.zones.map((value: unknown) => {
    if (!object(value) || typeof value.id !== 'string' || !value.id || typeof value.client_id !== 'string' || !validId(value.client_id)
      || typeof value.name !== 'string' || typeof value.color !== 'string'
      || (value.description !== null && typeof value.description !== 'string')
      || typeof value.sort_order !== 'number' || !Number.isSafeInteger(value.sort_order)
      || serverToClient.has(value.id) || seenClient.has(value.client_id)) throw new RequestFailure('invalid_response');
    serverToClient.set(value.id, value.client_id); seenClient.add(value.client_id);
    return { client_id: value.client_id, name: value.name, color: value.color, description: value.description ?? '', order: value.sort_order };
  }).sort((a, b) => a.order - b.order || a.client_id.localeCompare(b.client_id));
  const zones: Zone[] = sorted.map(({ order: _order, ...zone }) => zone);
  const elements = new Set(plan.elements.map(e => e.id)), assignments = new Map<string, string>(), seenElements = new Set<string>();
  const discarded: string[] = [];
  for (const a of record.assignments) {
    if (!object(a) || typeof a.element_id !== 'string' || typeof a.zone_id !== 'string' || seenElements.has(a.element_id)) throw new RequestFailure('invalid_response');
    seenElements.add(a.element_id);
    const clientId = serverToClient.get(a.zone_id);
    if (!elements.has(a.element_id) || !clientId) { discarded.push(a.element_id); continue; }
    assignments.set(a.element_id, clientId);
  }
  return { plan, draft: { zones, assignments }, discarded };
}
export function createZone(): Zone { return { client_id: `zone-${crypto.randomUUID()}`, name: '', color: '#3366CC', description: '' }; }
export function changeZone(draft: ZoningDraft, id: string, patch: Partial<Pick<Zone, 'name' | 'color' | 'description'>>): ZoningDraft {
  return { ...draft, zones: draft.zones.map(zone => zone.client_id === id ? { ...zone, ...patch } : zone) };
}
export function removeZone(draft: ZoningDraft, id: string): ZoningDraft {
  return { zones: draft.zones.filter(z => z.client_id !== id), assignments: new Map([...draft.assignments].filter(([, zone]) => zone !== id)) };
}
export function moveZone(draft: ZoningDraft, id: string, direction: -1 | 1): ZoningDraft {
  const index = draft.zones.findIndex(z => z.client_id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= draft.zones.length) return draft;
  const zones = [...draft.zones]; [zones[index], zones[target]] = [zones[target], zones[index]];
  return { ...draft, zones };
}
export function assignElements(draft: ZoningDraft, ids: string[], zoneId: string | null, plan: PlanDocument): ZoningDraft {
  if (zoneId !== null && !draft.zones.some(z => z.client_id === zoneId)) return draft;
  const existing = new Set(plan.elements.map(e => e.id)), assignments = new Map(draft.assignments);
  for (const id of ids) if (existing.has(id)) { if (zoneId === null) assignments.delete(id); else assignments.set(id, zoneId); }
  return { ...draft, assignments };
}
/** Rectangle selection includes completely enclosed elements; this rule is shown beside the tool. */
export function elementsInArea(plan: PlanDocument, area: Area): string[] {
  return plan.elements.filter(e => e.x >= area.x && e.y >= area.y && e.x + e.width <= area.x + area.width && e.y + e.height <= area.y + area.height).map(e => e.id);
}
export function validateZoning(draft: ZoningDraft, plan: PlanDocument): ZoningIssue[] {
  const issues: ZoningIssue[] = [], ids = new Set<string>(), names = new Map<string, string[]>(), counts = new Map<string, number>();
  if (draft.zones.length < 1 || draft.zones.length > 200) issues.push({ code: 'count' });
  const elements = new Set(plan.elements.map(e => e.id));
  for (const zone of draft.zones) {
    const zoneId = zone.client_id, name = zone.name.trim();
    if (!validId(zoneId) || ids.has(zoneId)) issues.push({ code: 'clientId', zoneId });
    ids.add(zoneId);
    if (!name || length(name) > 80) issues.push({ code: 'name', zoneId });
    if (name) names.set(name.toLowerCase(), [...(names.get(name.toLowerCase()) ?? []), zoneId]);
    if (!validColor(zone.color)) issues.push({ code: 'color', zoneId });
    if (length(zone.description) > 300) issues.push({ code: 'description', zoneId });
  }
  for (const matches of names.values()) if (matches.length > 1) for (const zoneId of matches) issues.push({ code: 'duplicateName', zoneId });
  for (const [elementId, zoneId] of draft.assignments) {
    if (!elements.has(elementId) || !ids.has(zoneId)) issues.push({ code: 'assignment', elementId, zoneId });
    else counts.set(zoneId, (counts.get(zoneId) ?? 0) + 1);
  }
  for (const zoneId of ids) if (!counts.get(zoneId)) issues.push({ code: 'emptyZone', zoneId });
  return issues;
}
export function zoningPayload(draft: ZoningDraft, plan: PlanDocument): ZoningPayload {
  const issues = validateZoning(draft, plan); if (issues.length) throw new ZoningValidationError(issues);
  return {
    zones: draft.zones.map((zone, sort_order) => ({ ...zone, name: zone.name.trim(), color: zone.color.toUpperCase(), description: zone.description.trim() || null, sort_order })),
    assignments: [...draft.assignments].map(([element_id, zone_client_id]) => ({ element_id, zone_client_id })).sort((a, b) => a.element_id.localeCompare(b.element_id)),
  };
}
export function sameDraft(a: ZoningDraft, b: ZoningDraft): boolean {
  return sameJson(a.zones, b.zones) && a.assignments.size === b.assignments.size && [...a.assignments].every(([id, zone]) => b.assignments.get(id) === zone);
}
export function matchesSaved(record: StoreRequest, sent: ZoningPayload): boolean {
  try {
    const loaded = restoreZoning(record);
    const orders = new Map(sent.zones.map(zone => [zone.client_id, zone.sort_order]));
    const exactOrder = Array.isArray(record.zones) && record.zones.every(zone => object(zone) && typeof zone.client_id === 'string' && orders.get(zone.client_id) === zone.sort_order);
    return exactOrder && loaded.discarded.length === 0 && sameJson(zoningPayload(loaded.draft, loaded.plan), sent);
  } catch { return false; }
}
