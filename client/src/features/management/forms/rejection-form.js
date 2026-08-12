/**
 * Client-side rules for the moderator's rejection note, mirroring the server
 * schema so the dialog reports the problem before a request is spent on it.
 * The server stays the authority: it applies the same three rules again.
 */
export const rejectionReasonMaximumLength = 500

export function validateRejectionReason(value) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return 'required'
  if (trimmed.length > rejectionReasonMaximumLength) return 'length'
  // Free text is echoed back in JSON, so angle brackets are refused rather than
  // escaped later — the same rule the API applies to every stored text field.
  if (trimmed.includes('<') || trimmed.includes('>')) return 'html'
  return ''
}

/** Characters still available, floored at zero so the counter never goes red-negative. */
export function rejectionReasonRemaining(value) {
  return Math.max(
    rejectionReasonMaximumLength - (value ?? '').trim().length,
    0,
  )
}
