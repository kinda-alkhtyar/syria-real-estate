/**
 * Renders the moderation surfaces to HTML, once per locale, with no browser in
 * the loop. It is a check rather than a build step: it proves the new screens
 * mount, that every string they draw resolves, and that nothing reads from
 * `window` on first render.
 *
 * Run with: node scripts/render-moderation-states.mjs
 */
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
// Imported natively, not through `ssrLoadModule`: Vite externalises the router
// for SSR, so the components under test resolve this very instance and share
// its context.
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

const [
  { LocaleContext },
  { locales },
  { messages },
  { translate },
  { default: ManagementPropertyList },
  { default: ReviewQueueList },
  { default: ModerationDialog },
] = await Promise.all([
  vite.ssrLoadModule('/src/context/locale-context.js'),
  vite.ssrLoadModule('/src/constants/locales.js'),
  vite.ssrLoadModule('/src/i18n/messages/index.js'),
  vite.ssrLoadModule('/src/i18n/translate.js'),
  vite.ssrLoadModule(
    '/src/features/management/components/ManagementPropertyList.jsx',
  ),
  vite.ssrLoadModule('/src/features/management/components/ReviewQueueList.jsx'),
  vite.ssrLoadModule('/src/features/management/components/ModerationDialog.jsx'),
])

function localeContextValue(locale) {
  return {
    locale,
    locales,
    setLocale: () => {},
    t: (key, variables) =>
      translate(messages, locale.code, 'en', key, variables),
  }
}

const listing = {
  id: '40000000-0000-4000-8000-000000000001',
  slug: 'damascus-home',
  titleEn: 'Damascus home',
  titleAr: 'منزل دمشقي',
  titleDe: 'Haus in Damaskus',
  transaction: 'BUY',
  propertyType: 'HOUSE',
  governorate: 'DAMASCUS',
  city: 'Damascus',
  district: null,
  neighborhood: null,
  price: '250000',
  currency: 'USD',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-05T10:00:00.000Z',
  images: [],
}

const pending = { ...listing, status: 'PENDING_REVIEW', rejectionReason: null }
const rejected = {
  ...listing,
  id: '40000000-0000-4000-8000-000000000002',
  status: 'REJECTED',
  rejectionReason: 'The photographs do not show the advertised property.',
}
const meta = { page: 1, pageSize: 20, total: 2, totalPages: 1 }

const screens = [
  [
    'owner list (pending + rejected)',
    () =>
      h(ManagementPropertyList, {
        meta,
        page: 1,
        properties: [pending, rejected],
        setPage: () => {},
      }),
    // The two moderation states are the point of the screen, so their labels
    // and the moderator's note are asserted rather than merely rendered.
    (html, t) => [
      t('listingStatuses.pending_review'),
      t('listingStatuses.rejected'),
      t('dashboard.actions.editAndResubmit'),
      rejected.rejectionReason,
    ],
  ],
  [
    'admin review queue',
    () =>
      h(ReviewQueueList, {
        meta,
        page: 1,
        properties: [pending],
        setPage: () => {},
      }),
  ],
  [
    'approve dialog',
    () =>
      h(ModerationDialog, {
        onCancel: () => {},
        onConfirm: () => {},
        propertyTitle: 'Damascus home',
        variant: 'approve',
      }),
  ],
  [
    'reject dialog',
    () =>
      h(ModerationDialog, {
        onCancel: () => {},
        onConfirm: () => {},
        propertyTitle: 'Damascus home',
        variant: 'reject',
      }),
  ],
]

let failures = 0

for (const locale of locales) {
  const { t } = localeContextValue(locale)

  for (const [name, element, expected] of screens) {
    let html = ''
    try {
      html = renderToString(
        h(
          MemoryRouter,
          null,
          h(
            LocaleContext.Provider,
            { value: localeContextValue(locale) },
            element(),
          ),
        ),
      )
    } catch (error) {
      failures += 1
      console.error(`✖ ${locale.code} — ${name}: ${error.message}`)
      continue
    }

    // A key that never resolved is echoed back verbatim by `translate`, so an
    // untranslated string is visible in the markup as a dotted key.
    const unresolved = html.match(
      /\b(?:review|dashboard|listingStatuses|propertyCreate|actions|results)\.[a-zA-Z_.]+/g,
    )
    if (unresolved) {
      failures += 1
      console.error(
        `✖ ${locale.code} — ${name}: unresolved keys ${[...new Set(unresolved)].join(', ')}`,
      )
      continue
    }

    const missing = (expected?.(html, t) ?? []).filter(
      (text) => !html.includes(text),
    )
    if (missing.length > 0) {
      failures += 1
      console.error(
        `✖ ${locale.code} — ${name}: missing ${missing.join(' | ')}`,
      )
      continue
    }

    console.log(
      `✔ ${locale.code} (${locale.direction}) — ${name}: ${html.length} chars`,
    )
  }
}

await vite.close()

if (failures > 0) {
  console.error(`\n${failures} screen(s) failed to render.`)
  process.exit(1)
}

console.log('\nAll moderation screens rendered in every locale.')
