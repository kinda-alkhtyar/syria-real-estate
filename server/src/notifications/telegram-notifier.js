import env from '../config/env.js'
import logger from '../observability/logger.js'

const telegramApiOrigin = 'https://api.telegram.org'
const reviewPath = '/dashboard/review'
// Generous enough for the cold DNS and TLS handshake of the first alert after a
// boot, which was measured over five seconds; past that the request is
// abandoned rather than left holding a socket open behind a finished write.
const requestTimeoutMs = 10000

// Read by a human on a phone, so the stored enum is spelled out. Unknown values
// fall back to the raw name: a governorate added later still sends an alert.
const governorateLabels = {
  DAMASCUS: 'دمشق',
  RIF_DIMASHQ: 'ريف دمشق',
  ALEPPO: 'حلب',
  RIF_ALEPPO: 'ريف حلب',
  LATAKIA: 'اللاذقية',
  HOMS: 'حمص',
  HAMA: 'حماة',
  IDLIB: 'إدلب',
  TARTUS: 'طرطوس',
  DARAA: 'درعا',
  AS_SUWAYDA: 'السويداء',
  RAQQA: 'الرقة',
  AL_HASAKAH: 'الحسكة',
  DEIR_EZ_ZOR: 'دير الزور',
  QUNEITRA: 'القنيطرة',
}

function listingTitle(property) {
  return (
    property?.titleAr || property?.titleEn || property?.titleDe || 'بدون عنوان'
  )
}

/**
 * Plain text on purpose: the message is sent without `parse_mode`, so an owner
 * cannot smuggle markup into the moderator's chat through a listing title.
 */
export function composePendingReviewMessage(property, { reviewUrl }) {
  return [
    '🏠 عقار جديد بانتظار المراجعة',
    `العنوان: ${listingTitle(property)}`,
    `المحافظة: ${governorateLabels[property?.governorate] ?? property?.governorate ?? '—'}`,
    `المراجعة: ${reviewUrl}`,
  ].join('\n')
}

/**
 * A side channel, never a dependency: the alert is attempted once, failures are
 * logged and swallowed, and a deployment that sets neither variable simply does
 * not notify. Nothing here can fail or delay the write that triggered it.
 */
export function createTelegramNotifier({
  botToken = env.telegramBotToken,
  chatId = env.telegramChatId,
  // The dashboard runs on the browser origin the API already trusts; the
  // fallback only ever applies to a bare local checkout.
  appBaseUrl = env.corsOrigins[0] ?? 'http://localhost:5173',
  fetchImplementation = globalThis.fetch,
  log = logger,
} = {}) {
  const configured = Boolean(botToken && chatId)
  const reviewUrl = new URL(reviewPath, appBaseUrl).toString()

  async function send(text) {
    const response = await fetchImplementation(
      `${telegramApiOrigin}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(requestTimeoutMs),
      },
    )

    if (!response?.ok) {
      const error = new Error('Telegram rejected the notification.')
      error.status = response?.status
      throw error
    }
  }

  return {
    configured,

    async notifyPendingReview(property) {
      if (!configured) return false

      try {
        await send(composePendingReviewMessage(property, { reviewUrl }))
        return true
      } catch (error) {
        // Neither the message nor the request URL is logged: the URL carries
        // the bot token, so only the shape of the failure travels.
        log.error('telegram_notification_failed', {
          component: 'telegram',
          category: error?.name ?? 'Error',
          ...(typeof error?.status === 'number' && { status: error.status }),
        })
        return false
      }
    },
  }
}

const telegramNotifier = createTelegramNotifier()

export default telegramNotifier
