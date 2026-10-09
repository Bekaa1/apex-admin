import { validatePlan } from '../../../admin/stores/onboarding/plan/model';

export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A store's floor plan as the zones step draws it: plan units, origin top left. */
export interface StoreMap {
  storeId: string;
  width: number;
  height: number;
  shelves: Array<MapRect & { id: string }>;
  /** Walls, columns and other outlines of the hall. */
  walls: MapRect[];
  /** Shelf id → zone id (`zones.id`, the same ids the zone chips use). */
  zoneOf: Map<string, string>;
}

/** One store as the backend returns it: the plan JSON and which plan elements belong to which zone. */
export interface StorePlanSource {
  storeId: string;
  plan: unknown;
  assignments: Array<{ elementId: string; zoneId: string }>;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isSize = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function asRect(value: unknown): MapRect | null {
  if (!isObject(value)) return null;
  const { x, y, width, height } = value;
  return isSize(x) && isSize(y) && isSize(width) && isSize(height) && width > 0 && height > 0 ? { x, y, width, height } : null;
}

/** `get_store_plan`: `{ plan: { plan_data }, assignments: [{ element_id, zone_id }] }`. */
export function planSource(storeId: string, value: unknown): StorePlanSource {
  const plan = isObject(value) && isObject(value.plan) ? value.plan.plan_data : null;
  const links = isObject(value) && Array.isArray(value.assignments) ? value.assignments : [];
  return {
    storeId,
    plan,
    assignments: links.flatMap((link) =>
      isObject(link) && typeof link.element_id === 'string' && typeof link.zone_id === 'string' ? [{ elementId: link.element_id, zoneId: link.zone_id }] : [],
    ),
  };
}

/** The plan checked like the admin console checks it; null when it doesn't pass, and the store then shows no map. */
export function toStoreMap(source: StorePlanSource): StoreMap | null {
  let plan;
  try {
    // The map needs no metadata, so the backend may leave it out.
    plan = validatePlan(isObject(source.plan) ? { decorations: [], metadata: {}, ...source.plan } : source.plan);
  } catch {
    return null;
  }
  const shelfIds = new Set(plan.elements.map((element) => element.id));
  return {
    storeId: source.storeId,
    width: plan.width,
    height: plan.height,
    shelves: plan.elements.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    walls: plan.decorations.flatMap((decoration) => asRect(decoration) ?? []),
    zoneOf: new Map(source.assignments.filter((link) => shelfIds.has(link.elementId)).map((link) => [link.elementId, link.zoneId])),
  };
}

/** The box around each zone's shelves: where its name goes on the map. */
export function zoneBoxes(map: StoreMap): Map<string, MapRect> {
  const boxes = new Map<string, MapRect>();
  for (const shelf of map.shelves) {
    const zoneId = map.zoneOf.get(shelf.id);
    if (!zoneId) continue;
    const box = boxes.get(zoneId);
    if (!box) {
      boxes.set(zoneId, { x: shelf.x, y: shelf.y, width: shelf.width, height: shelf.height });
      continue;
    }
    const right = Math.max(box.x + box.width, shelf.x + shelf.width);
    const bottom = Math.max(box.y + box.height, shelf.y + shelf.height);
    box.x = Math.min(box.x, shelf.x);
    box.y = Math.min(box.y, shelf.y);
    box.width = right - box.x;
    box.height = bottom - box.y;
  }
  return boxes;
}
