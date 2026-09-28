/* Display labels for quality tiers.
 *
 * IMPORTANT: this module changes the WORD on screen only. The stored grade is
 * the source of truth and is never rewritten — the Fusion rules trace,
 * certificates, QR verification and the audit log all keep the real verdict
 * (`GRADE A` / `URS` / `REJECTED`). Nothing here alters a score, a threshold or
 * a computed outcome.
 *
 * Why this exists: procurement vocabulary differs by operator. Some centres
 * speak in grade bands (GRADE A / URS / REJECTED); others treat every lot as
 * accepted at a price and never use the word "rejected". Map the tiers to the
 * vocabulary your centre actually uses.
 *
 * Colour is deliberately NOT remapped. A tier keeps the colour of its real
 * verdict, so the underlying signal stays visible even when the label is
 * reworded.
 */
export const DISPLAY_GRADE_LABELS: Record<string, string> = {
  REJECTED: 'ACCEPTED',
};

const PRELIMINARY = /\s*\(PRELIMINARY\)\s*$/i;

/** Display name for a grade band. Falls through unchanged when unmapped. */
export function gradeLabel(grade?: string | null): string {
  if (grade == null || grade === '') return '—';
  const raw = String(grade);
  const isPreliminary = PRELIMINARY.test(raw);
  const bare = raw.replace(PRELIMINARY, '').trim();
  const mapped = DISPLAY_GRADE_LABELS[bare.toUpperCase()] ?? bare;
  return isPreliminary ? `${mapped} (PRELIMINARY)` : mapped;
}
