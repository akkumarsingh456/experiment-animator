/** The UI countdown and request deadline must use the same limit. */
export const LESSON_REQUEST_TIMEOUT_MS = 180_000;
export function preparationClock(milliseconds: number): string {
 const seconds = Math.max(0, Math.floor(milliseconds / 1000));
 return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
