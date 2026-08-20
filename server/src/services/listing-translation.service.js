import logger from '../observability/logger.js'

const mymemoryOrigin = 'https://api.mymemory.translated.net'

// MyMemory rejects a `q` longer than 500 bytes, so long text is cut into
// segments and reassembled. The margin below 500 leaves room for the multi
// byte Arabic characters the byte limit counts individually.
const maximumSegmentBytes = 450

// A description that needs more segments than this is left untranslated rather
// than held under a listing write: the free endpoint is rate limited per day,
// and four sequential calls already sit at the edge of the deadline below.
const maximumSegments = 4

// The whole translation step, not a single request. Listing creation waits on
// this once, so the budget is deliberately small: past it the original Arabic
// is copied and the write proceeds.
const translationDeadlineMs = 6000

// The free endpoint answers a rejected or exhausted quota with HTTP 200 and a
// warning in place of the translation, so the body is inspected, not the status.
const warningMarker = 'MYMEMORY WARNING'

const targetLanguages = [
  { code: 'en', title: 'titleEn', description: 'descriptionEn' },
  { code: 'de', title: 'titleDe', description: 'descriptionDe' },
]

const encoder = new TextEncoder()

function byteLength(text) {
  return encoder.encode(text).length
}

/**
 * Greedy word packing: a segment grows until the next word would cross the byte
 * limit, so the text is cut where a space already is and never mid-word. A
 * single word over the limit is emitted whole and left for the caller to reject.
 */
export function segmentForTranslation(text, limit = maximumSegmentBytes) {
  const segments = []

  for (const word of text.split(/\s+/u).filter(Boolean)) {
    const last = segments[segments.length - 1]
    const merged = last ? `${last} ${word}` : word

    if (last && byteLength(merged) <= limit) {
      segments[segments.length - 1] = merged
    } else {
      segments.push(word)
    }
  }

  return segments
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === ''
}

/**
 * A locale is filled only when it carries nothing of its own: empty, or the
 * Arabic text repeated, which is what the create form submits today. Text an
 * owner actually wrote in English or German is never overwritten.
 */
export function needsTranslation(value, source) {
  return isBlank(value) || value.trim() === source.trim()
}

export function createListingTranslator({
  fetchImplementation = globalThis.fetch,
  deadlineMs = translationDeadlineMs,
  log = logger,
} = {}) {
  async function translateSegment(text, language, signal) {
    const url = new URL('/get', mymemoryOrigin)
    url.searchParams.set('q', text)
    url.searchParams.set('langpair', `ar|${language}`)

    const response = await fetchImplementation(url.toString(), { signal })

    if (!response?.ok) {
      const error = new Error('The translation endpoint rejected the request.')
      error.status = response?.status
      throw error
    }

    const payload = await response.json()
    const translated = payload?.responseData?.translatedText

    if (
      isBlank(translated) ||
      translated.toUpperCase().includes(warningMarker)
    ) {
      throw new Error('The translation endpoint returned no usable text.')
    }

    return translated
  }

  async function translate(text, language, signal) {
    const segments = segmentForTranslation(text)

    if (
      segments.length === 0 ||
      segments.length > maximumSegments ||
      segments.some((segment) => byteLength(segment) > maximumSegmentBytes)
    ) {
      return null
    }

    const translations = []

    // Sequential on purpose: the free endpoint throttles per client, and the
    // shared signal already caps the total wait however many segments there are.
    for (const segment of segments) {
      translations.push(await translateSegment(segment, language, signal))
    }

    return translations.join(' ')
  }

  return {
    /**
     * Returns only the fields it could translate, so the caller spreads the
     * result and keeps everything else exactly as submitted. Never rejects:
     * any failure resolves to an empty object and the original Arabic stands.
     */
    async translateListingFields(listing) {
      const title = listing?.titleAr
      const description = listing?.descriptionAr
      const overrides = {}

      if (isBlank(title)) return overrides

      // One deadline for every request below, so a slow first language cannot
      // hand the second a fresh budget.
      const signal = AbortSignal.timeout(deadlineMs)

      try {
        for (const language of targetLanguages) {
          if (needsTranslation(listing[language.title], title)) {
            const translated = await translate(title, language.code, signal)
            if (translated) overrides[language.title] = translated
          }

          if (
            !isBlank(description) &&
            needsTranslation(listing[language.description], description)
          ) {
            const translated = await translate(
              description,
              language.code,
              signal,
            )
            if (translated) overrides[language.description] = translated
          }
        }
      } catch (error) {
        // A listing is worth more than its translations: what was already
        // translated is kept, the rest stays Arabic, and the write continues.
        log.warn('listing_translation_failed', {
          component: 'translation',
          category: error?.name ?? 'Error',
          ...(typeof error?.status === 'number' && { status: error.status }),
        })
      }

      return overrides
    },
  }
}

const listingTranslator = createListingTranslator()

export default listingTranslator
