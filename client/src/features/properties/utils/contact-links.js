/**
 * Builds the seller contact links from the optional number stored on a listing.
 *
 * The number is kept as the owner typed it (digits, spaces, optional leading
 * `+`), so each target strips it down to the form that target accepts.
 */

/**
 * `wa.me` takes the number in international form with no `+` and no separators.
 *
 * @param {string | null | undefined} number
 * @param {string} message Localized preset text for the chat.
 * @returns {string} An empty string when there is no usable number.
 */
export function toWhatsappHref(number, message) {
  const digits = String(number ?? '').replace(/\D/g, '')
  if (!digits) return ''

  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${query}`
}

/**
 * `tel:` accepts a leading `+` but not spaces.
 *
 * @param {string | null | undefined} number
 * @returns {string} An empty string when there is no usable number.
 */
export function toCallHref(number) {
  const trimmed = String(number ?? '').trim()
  const dialable = trimmed.replace(/[^\d+]/g, '')
  return /\d/.test(dialable) ? `tel:${dialable}` : ''
}
