import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createListingTranslator,
  needsTranslation,
  segmentForTranslation,
} from '../src/services/listing-translation.service.js'
import { createPropertyManagementService } from '../src/services/property.service.js'

const silentLog = { warn() {}, error() {}, info() {} }

function jsonResponse(translatedText, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => ({
      responseData: { translatedText },
      responseStatus: status,
    }),
  }
}

// Records every call so a test can assert the language pair and the query the
// endpoint was actually asked for, not merely that something was fetched.
function recordingFetch(reply) {
  const calls = []
  return {
    calls,
    fetch: async (url, options) => {
      const parsed = new URL(url)
      calls.push({
        q: parsed.searchParams.get('q'),
        langpair: parsed.searchParams.get('langpair'),
        signal: options?.signal,
      })
      return reply(parsed.searchParams.get('langpair'), calls.length)
    },
  }
}

const arabicListing = {
  titleAr: 'شقة مفروشة في دمشق',
  titleEn: 'شقة مفروشة في دمشق',
  titleDe: 'شقة مفروشة في دمشق',
  // Turkish arrived with a nullable column, so an untranslated listing carries
  // null here rather than the Arabic repeated.
  titleTr: null,
  descriptionAr: 'شقة واسعة قرب المركز.',
  descriptionEn: 'شقة واسعة قرب المركز.',
  descriptionDe: 'شقة واسعة قرب المركز.',
  descriptionTr: null,
}

// Distinct text per language, so a test can tell which pair produced a field.
const byLanguage = {
  'ar|en': 'English text',
  'ar|de': 'Deutscher Text',
  'ar|tr': 'Turkce metin',
}

const longArabicText = 'كلمة '.repeat(200).trim()

// serializeProperty reads Decimal columns off the created row; the repository
// stub is not Prisma, so the nullable shape it would return is spelled out.
const storedDecimals = {
  price: null,
  area: null,
  latitude: null,
  longitude: null,
}

test('translates the Arabic title and description into English and German', async () => {
  const { calls, fetch } = recordingFetch((langpair) =>
    jsonResponse(byLanguage[langpair]),
  )
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  const overrides = await translator.translateListingFields(arabicListing)

  assert.deepEqual(overrides, {
    titleEn: 'English text',
    descriptionEn: 'English text',
    titleDe: 'Deutscher Text',
    descriptionDe: 'Deutscher Text',
    titleTr: 'Turkce metin',
    descriptionTr: 'Turkce metin',
  })
  assert.deepEqual(
    calls.map((call) => call.langpair),
    ['ar|en', 'ar|en', 'ar|de', 'ar|de', 'ar|tr', 'ar|tr'],
  )
  assert.equal(calls[0].q, arabicListing.titleAr)
  // Every request shares one deadline, so a slow language cannot extend it.
  assert.ok(calls.every((call) => call.signal === calls[0].signal))
})

test('keeps English and German text the owner wrote themselves', async () => {
  const { calls, fetch } = recordingFetch(() => jsonResponse('Translated'))
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  const overrides = await translator.translateListingFields({
    ...arabicListing,
    titleEn: 'Furnished flat in Damascus',
    descriptionDe: 'Geraeumige Wohnung.',
  })

  assert.equal(overrides.titleEn, undefined)
  assert.equal(overrides.descriptionDe, undefined)
  assert.equal(overrides.titleDe, 'Translated')
  assert.equal(overrides.descriptionEn, 'Translated')
  assert.equal(overrides.titleTr, 'Translated')
  assert.equal(overrides.descriptionTr, 'Translated')
  // Only the fields left empty or as repeated Arabic reach the endpoint.
  assert.deepEqual(
    calls.map((call) => `${call.langpair} ${call.q}`),
    [
      `ar|en ${arabicListing.descriptionAr}`,
      `ar|de ${arabicListing.titleAr}`,
      `ar|tr ${arabicListing.titleAr}`,
      `ar|tr ${arabicListing.descriptionAr}`,
    ],
  )
})

test('falls back to the original text when the endpoint fails', async () => {
  const translator = createListingTranslator({
    fetchImplementation: async () => {
      throw new Error('network down')
    },
    log: silentLog,
  })

  assert.deepEqual(await translator.translateListingFields(arabicListing), {})
})

test('falls back when the endpoint answers with a non-OK status', async () => {
  const translator = createListingTranslator({
    fetchImplementation: async () =>
      jsonResponse('', { ok: false, status: 429 }),
    log: silentLog,
  })

  assert.deepEqual(await translator.translateListingFields(arabicListing), {})
})

test('rejects the quota warning MyMemory returns with HTTP 200', async () => {
  const translator = createListingTranslator({
    fetchImplementation: async () =>
      jsonResponse(
        'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY',
      ),
    log: silentLog,
  })

  assert.deepEqual(await translator.translateListingFields(arabicListing), {})
})

test('keeps what it already translated when a later request fails', async () => {
  const { fetch } = recordingFetch((langpair) => {
    if (langpair === 'ar|de') throw new Error('network down')
    return jsonResponse('English text')
  })
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  assert.deepEqual(await translator.translateListingFields(arabicListing), {
    titleEn: 'English text',
    descriptionEn: 'English text',
  })
})

test('abandons a request that outlives the deadline', async () => {
  const translator = createListingTranslator({
    deadlineMs: 20,
    fetchImplementation: (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason))
      }),
    log: silentLog,
  })

  assert.deepEqual(await translator.translateListingFields(arabicListing), {})
})

test('leaves a description too long for the free endpoint untranslated', async () => {
  const veryLongText = 'كلمة '.repeat(2000).trim()
  const { calls, fetch } = recordingFetch(() => jsonResponse('Translated'))
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  const overrides = await translator.translateListingFields({
    ...arabicListing,
    descriptionAr: veryLongText,
    descriptionEn: veryLongText,
    descriptionDe: veryLongText,
  })

  assert.deepEqual(overrides, {
    titleEn: 'Translated',
    titleDe: 'Translated',
    titleTr: 'Translated',
  })
  assert.deepEqual(
    calls.map((call) => call.langpair),
    ['ar|en', 'ar|de', 'ar|tr'],
  )
})

test('splits text over the byte limit and rejoins the translated segments', async () => {
  const segments = segmentForTranslation(longArabicText)

  assert.ok(segments.length > 1)
  assert.ok(
    segments.every((segment) => Buffer.byteLength(segment, 'utf8') <= 450),
  )

  const { calls, fetch } = recordingFetch((langpair, callNumber) =>
    jsonResponse(`part${callNumber}`),
  )
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  const overrides = await translator.translateListingFields({
    titleAr: longArabicText,
    titleEn: longArabicText,
    titleDe: longArabicText,
  })

  assert.equal(
    overrides.titleEn,
    segments.map((segment, index) => `part${index + 1}`).join(' '),
  )
  assert.equal(calls.length, segments.length * 3)
  assert.ok(calls[0].q.length < longArabicText.length)
})

test('needsTranslation only claims a field that is empty or repeated Arabic', () => {
  assert.equal(needsTranslation('بيت', 'بيت'), true)
  assert.equal(needsTranslation('  بيت  ', 'بيت'), true)
  assert.equal(needsTranslation('', 'بيت'), true)
  assert.equal(needsTranslation(undefined, 'بيت'), true)
  assert.equal(needsTranslation('House', 'بيت'), false)
})

test('skips the endpoint entirely when there is no Arabic title', async () => {
  let called = false
  const translator = createListingTranslator({
    fetchImplementation: async () => {
      called = true
      return jsonResponse('Translated')
    },
    log: silentLog,
  })
  const overrides = await translator.translateListingFields({ titleEn: 'x' })

  assert.deepEqual(overrides, {})
  assert.equal(called, false)
})

test('createProperty stores the translated columns', async () => {
  let written
  const service = createPropertyManagementService({
    repository: {
      createProperty: async (data) => {
        written = data
        return { ...data, ...storedDecimals, id: 'p1', images: [] }
      },
    },
    notifier: { notifyPendingReview() {} },
    translator: createListingTranslator({
      fetchImplementation: async (url) =>
        jsonResponse(
          {
            'ar|en': 'Furnished flat in Damascus',
            'ar|de': 'Moeblierte Wohnung in Damaskus',
            'ar|tr': 'Sam da mobilyali daire',
          }[new URL(url).searchParams.get('langpair')],
        ),
      log: silentLog,
    }),
    log: silentLog,
  })

  await service.createProperty({ ...arabicListing }, { id: 'u1', role: 'OWNER' })

  assert.equal(written.titleEn, 'Furnished flat in Damascus')
  assert.equal(written.titleDe, 'Moeblierte Wohnung in Damaskus')
  assert.equal(written.titleTr, 'Sam da mobilyali daire')
  assert.equal(written.titleAr, arabicListing.titleAr)
  assert.equal(written.status, 'PENDING_REVIEW')
})

test('createProperty still writes the listing when translation fails', async () => {
  let written
  const service = createPropertyManagementService({
    repository: {
      createProperty: async (data) => {
        written = data
        return { ...data, ...storedDecimals, id: 'p1', images: [] }
      },
    },
    notifier: { notifyPendingReview() {} },
    translator: createListingTranslator({
      fetchImplementation: async () => {
        throw new Error('network down')
      },
      log: silentLog,
    }),
    log: silentLog,
  })

  const created = await service.createProperty(
    { ...arabicListing },
    { id: 'u1', role: 'OWNER' },
  )

  assert.equal(created.titleEn, arabicListing.titleAr)
  assert.equal(written.titleDe, arabicListing.titleAr)
  // Turkish has no Arabic to fall back to in the column, so it stays null and
  // the reader falls back to titleAr instead.
  assert.equal(created.titleTr, null)
})

test('fills the empty Turkish columns without touching the Arabic source', async () => {
  const { calls, fetch } = recordingFetch((langpair) =>
    jsonResponse(byLanguage[langpair]),
  )
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  const overrides = await translator.translateListingFields({
    ...arabicListing,
    titleEn: 'Furnished flat in Damascus',
    titleDe: 'Moeblierte Wohnung in Damaskus',
    descriptionEn: 'A spacious flat near the centre.',
    descriptionDe: 'Eine geraeumige Wohnung.',
  })

  assert.deepEqual(overrides, {
    titleTr: 'Turkce metin',
    descriptionTr: 'Turkce metin',
  })
  assert.deepEqual(
    calls.map((call) => call.langpair),
    ['ar|tr', 'ar|tr'],
  )
  assert.deepEqual(
    calls.map((call) => call.q),
    [arabicListing.titleAr, arabicListing.descriptionAr],
  )
})

test('leaves a Turkish column an earlier pass already filled', async () => {
  const { calls, fetch } = recordingFetch((langpair) =>
    jsonResponse(byLanguage[langpair]),
  )
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  const overrides = await translator.translateListingFields({
    ...arabicListing,
    titleTr: 'Sam da mobilyali daire',
    descriptionTr: 'Merkeze yakin genis daire.',
  })

  assert.equal(overrides.titleTr, undefined)
  assert.equal(overrides.descriptionTr, undefined)
  assert.equal(
    calls.some((call) => call.langpair === 'ar|tr'),
    false,
  )
})

test('a failing Turkish request leaves the other languages translated', async () => {
  const { fetch } = recordingFetch((langpair) => {
    if (langpair === 'ar|tr') throw new Error('network down')
    return jsonResponse(byLanguage[langpair])
  })
  const translator = createListingTranslator({
    fetchImplementation: fetch,
    log: silentLog,
  })

  assert.deepEqual(await translator.translateListingFields(arabicListing), {
    titleEn: 'English text',
    descriptionEn: 'English text',
    titleDe: 'Deutscher Text',
    descriptionDe: 'Deutscher Text',
  })
})
