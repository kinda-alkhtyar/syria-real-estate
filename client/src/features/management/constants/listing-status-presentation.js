/**
 * How a listing status is presented in the dashboard, kept apart from the
 * components so the mapping can be asserted directly.
 *
 * The two moderation states are the reason this exists: `pending_review` has to
 * read as "waiting, nothing is wrong" and `rejected` as "action needed", while
 * every published state keeps the appearance it already had.
 */
const statusTones = Object.freeze({
  draft: 'neutral',
  pending_review: 'pending',
  available: 'success',
  reserved: 'warning',
  sold: 'muted',
  rented: 'muted',
  rejected: 'danger',
  archived: 'muted',
})

export const listingStatusToneClasses = Object.freeze({
  danger: 'border-error/35 bg-error/10 text-error',
  muted: 'border-line bg-hover text-muted',
  neutral: 'border-line bg-hover text-muted',
  pending: 'border-warning/45 bg-warning/15 text-warning',
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
})

export const pendingReviewStatus = 'pending_review'
export const rejectedStatus = 'rejected'

/** The value the management list endpoint filters on for the review queue. */
export const pendingReviewFilter = 'PENDING_REVIEW'

export function listingStatusTone(status) {
  return statusTones[status] ?? 'muted'
}

export function listingStatusChipClass(status) {
  return listingStatusToneClasses[listingStatusTone(status)]
}

export function isAwaitingReview(status) {
  return status === pendingReviewStatus
}

export function isRejected(status) {
  return status === rejectedStatus
}

/**
 * Statuses each role may write, mirroring the server schemas. An owner cannot
 * publish itself, and neither role writes a moderation state by hand: reaching
 * `pending_review` is what submitting does, and `rejected` is what the reject
 * endpoint does.
 */
const ownerWritableStatuses = Object.freeze([
  'draft',
  'reserved',
  'sold',
  'rented',
  'archived',
])

const administratorWritableStatuses = Object.freeze([
  'draft',
  'available',
  'reserved',
  'sold',
  'rented',
  'archived',
])

export function writableStatusesFor(role) {
  return role === 'ADMIN'
    ? administratorWritableStatuses
    : ownerWritableStatuses
}
