/**
 * Account deletion with a way back (2 Nov 2026): a request schedules the removal 30 days later;
 * signing in before then can restore the account; the daily job removes what is due. Pure dates.
 */
export const DELETION_GRACE_DAYS = 30;

export function deletionDate(requestedAt: Date) {
  return new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 86_400_000);
}

export function deletionDue(requestedAt: Date | null | undefined, now = new Date()) {
  return Boolean(requestedAt) && deletionDate(requestedAt!).getTime() <= now.getTime();
}

export function daysUntilDeletion(requestedAt: Date, now = new Date()) {
  return Math.max(0, Math.ceil((deletionDate(requestedAt).getTime() - now.getTime()) / 86_400_000));
}
