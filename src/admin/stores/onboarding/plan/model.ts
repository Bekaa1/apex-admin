import type { Json } from '../../../../lib/database.types';

export const MAX_PLAN_BYTES = 512 * 1024;
export const KINDS = ['shelf', 'rack', 'wall_shelf', 'island', 'fridge', 'freezer', 'display', 'counter', 'checkout', 'pallet', 'section', 'promo', 'entrance', 'other'] as const;
export type Kind = typeof KINDS[number];
export interface PlanElement { id: string; kind: Kind; x: number; y: number; width: number; height: number; label: string; category?: string | null }
export type PlanDocument = { version: 1; width: number; height: number; elements: PlanElement[]; decorations: Json[]; metadata: Record<string, Json> };
export interface PlanDraft { data: PlanDocument; name: string | null }
export type PlanIssueCode = 'json' | 'extension' | 'fileName' | 'fileRead' | 'size' | 'object' | 'version' | 'dimension' | 'elements' | 'decorations' | 'metadata' | 'count' | 'id' | 'duplicate' | 'kind' | 'coordinate' | 'extent' | 'bounds' | 'label' | 'category' | 'unsafe' | 'number';
export class PlanIssue extends Error {
  code: PlanIssueCode; path: string;
  constructor(code: PlanIssueCode, path = 'plan') { super(code); this.code = code; this.path = path; }
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const chars = (v: string) => Array.from(v).length;
export function validateFileName(name: string | null) {
  if (name !== null && chars(name) > 255) throw new PlanIssue('fileName', 'source_file_name');
}
/** Validate before any SVG creation or RPC. Keep decorations/metadata as data only. */
export function validatePlan(value: unknown): PlanDocument {
  if (!object(value)) throw new PlanIssue('object');
  if (value.version !== 1) throw new PlanIssue('version', 'version');
  for (const field of ['width', 'height']) if (!number(value[field]) || value[field] <= 0 || value[field] > 100000) throw new PlanIssue('dimension', field);
  if (!Array.isArray(value.elements) || value.elements.length === 0) throw new PlanIssue('elements', 'elements');
  if (value.elements.length > 1000) throw new PlanIssue('count', 'elements');
  if (!Array.isArray(value.decorations)) throw new PlanIssue('decorations', 'decorations');
  if (value.decorations.length > 2000) throw new PlanIssue('count', 'decorations');
  if (!object(value.metadata)) throw new PlanIssue('metadata', 'metadata');
  const ids = new Set<string>();
  value.elements.forEach((element: unknown, index: number) => {
    const path = `elements[${index}]`;
    if (!object(element)) throw new PlanIssue('object', path);
    if (typeof element.id !== 'string' || !/^[A-Za-z0-9_.:-]{1,64}$/.test(element.id)) throw new PlanIssue('id', `${path}.id`);
    if (ids.has(element.id)) throw new PlanIssue('duplicate', `${path}.id (${element.id})`);
    ids.add(element.id);
    const entry = `${path} (${element.id})`;
    if (!KINDS.includes(element.kind as Kind)) throw new PlanIssue('kind', `${entry}.kind`);
    for (const field of ['x', 'y']) if (!number(element[field]) || element[field] < 0) throw new PlanIssue('coordinate', `${entry}.${field}`);
    for (const field of ['width', 'height']) if (!number(element[field]) || element[field] <= 0) throw new PlanIssue('extent', `${entry}.${field}`);
    if ((element.x as number) + (element.width as number) > (value.width as number)) throw new PlanIssue('bounds', `${entry}.x + width`);
    if ((element.y as number) + (element.height as number) > (value.height as number)) throw new PlanIssue('bounds', `${entry}.y + height`);
    if (typeof element.label !== 'string' || chars(element.label) > 120) throw new PlanIssue('label', `${entry}.label`);
    if (element.category !== undefined && element.category !== null && (typeof element.category !== 'string' || chars(element.category) > 60)) throw new PlanIssue('category', `${entry}.category`);
  });
  // Iterative walk avoids recursion over deeply nested metadata. Backend forbids these strings too.
  const stack: { value: unknown; path: string }[] = [{ value, path: 'plan' }];
  while (stack.length) {
    const item = stack.pop()!;
    if (typeof item.value === 'string' && /(<\s*\/?\s*[a-z!?]|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bon[a-z]+\s*=)/i.test(item.value)) throw new PlanIssue('unsafe', item.path);
    if (typeof item.value === 'number' && !Number.isFinite(item.value)) throw new PlanIssue('number', item.path);
    if (item.value && typeof item.value === 'object') {
      for (const [key, child] of Object.entries(item.value)) stack.push({ value: child, path: `${item.path}.${key.slice(0, 80)}` });
    }
  }
  try {
    // PostgreSQL jsonb text adds spaces after separators. This accounts for those bytes too.
    const serialized = JSON.stringify(value);
    let separators = 0, quoted = false, escaped = false;
    for (const char of serialized) {
      if (escaped) { escaped = false; continue; }
      if (quoted && char === '\\') { escaped = true; continue; }
      if (char === '"') quoted = !quoted;
      else if (!quoted && (char === ':' || char === ',')) separators++;
    }
    if (new TextEncoder().encode(serialized).byteLength + separators > MAX_PLAN_BYTES) throw new PlanIssue('size');
  } catch (error) { if (error instanceof PlanIssue) throw error; throw new PlanIssue('json'); }
  return value as PlanDocument;
}
export async function readPlanFile(file: Pick<File, 'name' | 'size' | 'text'>): Promise<PlanDraft> {
  if (!/\.json$/i.test(file.name)) throw new PlanIssue('extension', 'source_file_name');
  validateFileName(file.name);
  if (file.size > MAX_PLAN_BYTES) throw new PlanIssue('size');
  let raw: string;
  try { raw = await file.text(); } catch { throw new PlanIssue('fileRead'); }
  if (new TextEncoder().encode(raw).byteLength > MAX_PLAN_BYTES) throw new PlanIssue('size');
  let parsed: unknown;
  try { parsed = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { throw new PlanIssue('json'); }
  return { data: validatePlan(parsed), name: file.name };
}
/** JSON object key order can change on the server; array order remains significant. */
export function sameJson(a: unknown, b: unknown): boolean {
  const pairs: [unknown, unknown][] = [[a, b]];
  while (pairs.length) {
    const [left, right] = pairs.pop()!;
    if (left === right) continue;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
    const l = left as Record<string, unknown>, r = right as Record<string, unknown>;
    const keys = Object.keys(l);
    if (keys.length !== Object.keys(r).length) return false;
    for (const key of keys) { if (!Object.hasOwn(r, key)) return false; pairs.push([l[key], r[key]]); }
  }
  return true;
}
export const EXAMPLE_PLAN: PlanDocument = {
  version: 1, width: 1200, height: 800,
  elements: [
    { id: 'A-1', kind: 'shelf', x: 40, y: 40, width: 200, height: 60, label: 'A-1', category: 'grocery' },
    { id: 'F-1', kind: 'fridge', x: 300, y: 40, width: 120, height: 60, label: 'F-1' },
    { id: 'C-1', kind: 'checkout', x: 980, y: 680, width: 160, height: 80, label: 'C-1' },
  ], decorations: [], metadata: { units: 'cm' },
};
