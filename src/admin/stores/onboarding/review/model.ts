import { validate, type Step, type StoreRequest } from '../model';
import { validatePlan, type PlanDocument } from '../plan/model';

export interface ReviewCheck { key: string; valid: boolean; step: Step }
export interface ReviewZone { id: string; name: string; color: string; sort_order: number }
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

/** Inspect the original arrays: dropping broken/duplicate links would hide submission errors. */
export function reviewRequest(record: StoreRequest) {
  const fields = validate(record, true);
  let plan: PlanDocument | null = null;
  try { if (record.plan) plan = validatePlan(record.plan.plan_data); } catch { /* reported in checklist */ }
  const rawPlan = record.plan?.plan_data;
  const hasElements = object(rawPlan) && Array.isArray(rawPlan.elements) && rawPlan.elements.length > 0;
  const elements = new Set(plan?.elements.map(element => element.id) ?? []);
  const zones: ReviewZone[] = [];
  const ids = new Set<string>();
  let zonesValid = Array.isArray(record.zones);
  if (Array.isArray(record.zones)) for (const value of record.zones) {
    if (!object(value) || typeof value.id !== 'string' || !value.id || ids.has(value.id)
      || typeof value.name !== 'string' || typeof value.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.color)
      || typeof value.sort_order !== 'number' || !Number.isSafeInteger(value.sort_order)) { zonesValid = false; continue; }
    ids.add(value.id); zones.push({ id: value.id, name: value.name, color: value.color, sort_order: value.sort_order });
  }
  zones.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  let elementLinks = Array.isArray(record.assignments), zoneLinks = elementLinks, unique = elementLinks;
  const seen = new Set<string>(), assigned = new Set<string>();
  const counts = new Map(zones.map(zone => [zone.id, new Set<string>()]));
  const colors = new Map<string, string>(), labels = new Map<string, string>();
  const zoneById = new Map(zones.map(zone => [zone.id, zone]));
  if (Array.isArray(record.assignments)) for (const value of record.assignments) {
    if (!object(value) || typeof value.element_id !== 'string' || typeof value.zone_id !== 'string') {
      elementLinks = false; zoneLinks = false; unique = false; continue;
    }
    if (seen.has(value.element_id)) unique = false;
    seen.add(value.element_id);
    const zone = zoneById.get(value.zone_id);
    if (!elements.has(value.element_id)) elementLinks = false;
    if (!zone) zoneLinks = false;
    if (zone && elements.has(value.element_id)) {
      counts.get(zone.id)?.add(value.element_id); assigned.add(value.element_id);
      colors.set(value.element_id, zone.color); labels.set(value.element_id, zone.name);
    }
  }
  const checks: ReviewCheck[] = [
    ...(['name', 'city', 'address', 'timezone'] as const).map(key => ({ key, valid: !fields[key], step: 'details' as const })),
    { key: 'plan', valid: Boolean(record.plan), step: 'plan' },
    { key: 'elements', valid: hasElements, step: 'plan' },
    { key: 'planFormat', valid: Boolean(plan), step: 'plan' },
    { key: 'zones', valid: zonesValid && zones.length > 0, step: 'zoning' },
    { key: 'zoneElements', valid: zonesValid && zones.length > 0 && zones.every(zone => (counts.get(zone.id)?.size ?? 0) > 0), step: 'zoning' },
    { key: 'elementLinks', valid: elementLinks, step: 'zoning' },
    { key: 'zoneLinks', valid: zoneLinks && zonesValid, step: 'zoning' },
    { key: 'unique', valid: unique, step: 'zoning' },
  ];
  return { checks, valid: checks.every(check => check.valid), plan, zones, zonesValid, colors, labels,
    counts, unassigned: plan ? plan.elements.length - assigned.size : null };
}

export function errorStep(kind: string): Step | null {
  return kind === 'invalid_store' ? 'details' : kind === 'invalid_plan' ? 'plan'
    : ['invalid_zones', 'invalid_assignments'].includes(kind) ? 'zoning' : null;
}
