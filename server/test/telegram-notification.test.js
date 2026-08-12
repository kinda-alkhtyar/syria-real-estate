import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.CORS_ORIGINS = 'https://client.example'

const [
  { composePendingReviewMessage, createTelegramNotifier },
  { createPropertyManagementService },
] = await Promise.all([
  import('../src/notifications/telegram-notifier.js'),
  import('../src/services/property.service.js'),
])

const ownerId = '11111111-1111-4111-8111-111111111111'
const adminId = '33333333-3333-4333-8333-333333333333'
const propertyId = '44444444-4444-4444-8444-444444444444'

const botToken = 'test-bot-token'
const chatId = '900001'

const listing = {
  titleAr: 'منزل عائلي في دمشق',
  titleEn: 'Family home',
  titleDe: 'Familienhaus',
  governorate: 'DAMASCUS',
  transaction: 'BUY',
  propertyType: 'HOUSE',
  price: 250000,
  currency: 'USD',
  city: 'Damascus',
  area: 180,
}

/**
 * Stands in for `fetch` and records what the Bot API would have received. Never
 * reaches the network: the live check is a separate, deliberate script.
 */
function stubFetch({ ok = true, status = 200, fails = false } = {}) {
  const calls = []
  return {
    calls,
    async fetch(url, options) {
      calls.push({ url, options, body: JSON.parse(options.body) })
      if (fails) throw new Error('Network is unreachable.')
      return { ok, status }
    },
  }
}

function silentLog() {
  const entries = []
  return {
    entries,
    error: (event, fields) => entries.push({ event, fields }),
    info: () => {},
    warn: () => {},
  }
}

/**
 * A repository small enough to keep the notification in view: it stores what it
 * is given and hands back the persisted record, status included.
 */
function mockRepository(records = new Map()) {
  // The optional decimals the serializer reads back are stored as explicit
  // nulls, exactly as the column defaults would return them.
  const stored = (record) => ({ latitude: null, longitude: null, ...record })

  return {
    records,
    async createProperty(data) {
      const record = stored({
        ...data,
        id: propertyId,
        status: data.status ?? 'DRAFT',
      })
      records.set(record.id, record)
      return record
    },
    async findPropertyOwnership(id) {
      const record = records.get(id)
      return record
        ? { id: record.id, ownerId: record.ownerId, status: record.status }
        : null
    },
    async updateProperty(id, data) {
      const record = stored({ ...records.get(id), ...data, id })
      records.set(id, record)
      return record
    },
    async updatePropertyModeration(id, data) {
      const record = { ...records.get(id), ...data, id }
      records.set(id, record)
      return record
    },
  }
}

// The alert is dispatched without being awaited, so a test observes it one
// microtask later — exactly as a request handler that has already responded.
const settled = () => new Promise((resolve) => setImmediate(resolve))

test('sends one Bot API message for a listing entering review', async () => {
  const transport = stubFetch()
  const notifier = createTelegramNotifier({
    appBaseUrl: 'https://darsyria.example',
    botToken,
    chatId,
    fetchImplementation: transport.fetch,
    log: silentLog(),
  })

  const delivered = await notifier.notifyPendingReview({
    ...listing,
    status: 'PENDING_REVIEW',
  })

  assert.equal(delivered, true)
  assert.equal(transport.calls.length, 1)

  const [call] = transport.calls
  assert.equal(
    call.url,
    `https://api.telegram.org/bot${botToken}/sendMessage`,
  )
  assert.equal(call.options.method, 'POST')
  assert.equal(call.body.chat_id, chatId)
  assert.match(call.body.text, /^🏠 عقار جديد بانتظار المراجعة/)
  assert.match(call.body.text, /منزل عائلي في دمشق/)
  assert.match(call.body.text, /دمشق/)
  assert.match(call.body.text, /https:\/\/darsyria\.example\/dashboard\/review/)
  // Plain text: no parse_mode, so a listing title can never carry markup into
  // the moderator's chat.
  assert.equal('parse_mode' in call.body, false)
})

test('spells the message out even for an unmapped governorate', () => {
  const text = composePendingReviewMessage(
    { titleAr: '', titleEn: 'Family home', governorate: 'NEW_REGION' },
    { reviewUrl: 'https://darsyria.example/dashboard/review' },
  )

  // Falls back through the titles and prints the raw enum rather than dropping
  // the line, so a schema addition still produces a usable alert.
  assert.match(text, /العنوان: Family home/)
  assert.match(text, /المحافظة: NEW_REGION/)
})

test('stays silent when either credential is missing', async () => {
  const transport = stubFetch()

  for (const credentials of [
    { botToken: '', chatId },
    { botToken, chatId: '' },
    { botToken: '', chatId: '' },
  ]) {
    const notifier = createTelegramNotifier({
      ...credentials,
      fetchImplementation: transport.fetch,
      log: silentLog(),
    })

    assert.equal(notifier.configured, false)
    assert.equal(await notifier.notifyPendingReview(listing), false)
  }

  assert.equal(transport.calls.length, 0)
})

test('swallows a failed alert and keeps the token out of the log', async () => {
  const log = silentLog()
  const notifier = createTelegramNotifier({
    botToken,
    chatId,
    fetchImplementation: stubFetch({ fails: true }).fetch,
    log,
  })

  assert.equal(await notifier.notifyPendingReview(listing), false)
  assert.equal(log.entries.length, 1)
  assert.equal(log.entries[0].event, 'telegram_notification_failed')
  assert.equal(JSON.stringify(log.entries[0]).includes(botToken), false)

  const rejection = createTelegramNotifier({
    botToken,
    chatId,
    fetchImplementation: async () => ({ ok: false, status: 429 }),
    log,
  })

  // A refusal from the API is a failure like any other: reported, not thrown.
  assert.equal(await rejection.notifyPendingReview(listing), false)
  assert.equal(log.entries[1].fields.status, 429)
})

test('alerts when an owner submits, and stays quiet when an administrator publishes', async () => {
  const notified = []
  const notifier = {
    async notifyPendingReview(property) {
      notified.push(property.titleAr)
      return true
    },
  }
  const service = createPropertyManagementService({
    notifier,
    repository: mockRepository(),
  })

  await service.createProperty(listing, { id: ownerId, role: 'OWNER' })
  await settled()

  assert.deepEqual(notified, [listing.titleAr])

  // An administrator publishes instantly, so nothing is waiting on a moderator.
  await service.createProperty(
    { ...listing, status: 'AVAILABLE' },
    { id: adminId, role: 'ADMIN' },
  )
  await settled()

  assert.equal(notified.length, 1)
})

test('alerts on a resubmission but not on an ordinary edit', async () => {
  let notifications = 0
  const records = new Map()
  const service = createPropertyManagementService({
    notifier: {
      async notifyPendingReview() {
        notifications += 1
        return true
      },
    },
    repository: mockRepository(records),
  })

  records.set(propertyId, {
    id: propertyId,
    ownerId,
    status: 'REJECTED',
    rejectionReason: 'Photographs were unclear.',
    ...listing,
  })

  // Editing a rejected listing is the resubmission, so it earns one alert.
  await service.updateProperty(propertyId, { city: 'Homs' }, {
    id: ownerId,
    role: 'OWNER',
  })
  await settled()

  assert.equal(notifications, 1)
  assert.equal(records.get(propertyId).status, 'PENDING_REVIEW')

  // The listing is now in review; correcting a typo must not alert again.
  await service.updateProperty(propertyId, { city: 'Hama' }, {
    id: ownerId,
    role: 'OWNER',
  })
  await settled()

  assert.equal(notifications, 1)
})

test('a failing notifier never fails the write that triggered it', async () => {
  const service = createPropertyManagementService({
    notifier: {
      notifyPendingReview() {
        throw new Error('Notifier is broken.')
      },
    },
    repository: mockRepository(),
  })

  const created = await service.createProperty(listing, {
    id: ownerId,
    role: 'OWNER',
  })
  await settled()

  assert.equal(created.status, 'PENDING_REVIEW')
})
