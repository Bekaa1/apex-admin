export interface ChatObstacle { top: number; bottom: number; left: number; right: number }

/** Lift the launcher above visible bottom bars, not headers or offscreen actions. */
export function chatBottomClearance(width: number, height: number, obstacles: ChatObstacle[]): number {
  let inset = 0;
  for (const rect of obstacles) {
    if (rect.right <= Math.max(0, width - 220) || rect.left >= width || rect.bottom <= rect.top
      || rect.top >= height || rect.bottom < height - 100 || rect.top < height / 2) continue;
    inset = Math.max(inset, Math.ceil(height - rect.top + 12));
  }
  return inset;
}
