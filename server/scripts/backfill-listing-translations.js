/**
 * One-time backfill for listings created before automatic translation existed:
 * every one of them stores the Arabic title and description repeated into the
 * English and German columns, which is what an EN or DE visitor sees today.
 *
 * Safe to re-run. A row is a candidate only while a localised column still
 * repeats the Arabic, so a listing translated by an earlier pass — or written
 * in English by its owner — is skipped rather than overwritten.
 *
 *   node scripts/backfill-listing-translations.js --dry-run
 *   node scripts/backfill-listing-translations.js
 *
 * Flags: --dry-run, --limit=N, --delay=MS (pause between listings).
 */
import prisma from '../src/config/database.js'
import {
  createListingTranslator,
  needsTranslation,
} from '../src/services/listing-translation.service.js'

const pageSize = 100

// The free endpoint throttles per client, so the rows are walked one at a time
// with a pause between them rather than fanned out.
const defaultDelayMs = 1200

const translatableFields = [
  { source: 'titleAr', target: 'titleEn' },
  { source: 'titleAr', target: 'titleDe' },
  { source: 'descriptionAr', target: 'descriptionEn' },
  { source: 'descriptionAr', target: 'descriptionDe' },
]

const selection = {
  id: true,
  slug: true,
  titleAr: true,
  titleEn: true,
  titleDe: true,
  descriptionAr: true,
  descriptionEn: true,
  descriptionDe: true,
}

function readOptions(argv) {
  const flag = (name) =>
    argv.find((argument) => argument.startsWith(`--${name}=`))?.split('=')[1]

  return {
    dryRun: argv.includes('--dry-run'),
    limit: Number(flag('limit')) || Infinity,
    delayMs: flag('delay') === undefined ? defaultDelayMs : Number(flag('delay')),
  }
}

function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : undefined
}

/**
 * A listing is worth a request only while at least one localised column still
 * repeats its Arabic source, which keeps a re-run from spending quota on rows
 * an earlier pass already finished.
 */
export function untranslatedFields(listing) {
  return translatableFields.filter(({ source, target }) => {
    const original = listing[source]
    return (
      typeof original === 'string' &&
      original.trim() !== '' &&
      needsTranslation(listing[target], original)
    )
  })
}

async function* listingPages() {
  let cursor

  for (;;) {
    const page = await prisma.property.findMany({
      select: selection,
      orderBy: { id: 'asc' },
      take: pageSize,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    if (page.length === 0) return
    yield page
    cursor = page[page.length - 1].id
  }
}

export async function backfillListingTranslations({
  translator = createListingTranslator(),
  database = prisma,
  options = readOptions(process.argv.slice(2)),
  report = console,
} = {}) {
  const totals = { scanned: 0, candidates: 0, updated: 0, unchanged: 0 }

  for await (const page of listingPages()) {
    for (const listing of page) {
      totals.scanned += 1

      if (totals.candidates >= options.limit) break
      if (untranslatedFields(listing).length === 0) continue

      totals.candidates += 1

      const overrides = await translator.translateListingFields(listing)
      // Only the columns the endpoint actually answered for are written, so a
      // partial success still improves the row and leaves the rest Arabic.
      const written = Object.keys(overrides)

      if (written.length === 0) {
        totals.unchanged += 1
        report.warn(`· ${listing.slug}: no translation returned, left as is`)
        continue
      }

      if (!options.dryRun) {
        await database.property.update({
          where: { id: listing.id },
          data: overrides,
        })
      }

      totals.updated += 1
      report.log(
        `${options.dryRun ? 'would update' : 'updated'} ${listing.slug}: ${written.join(', ')}`,
      )

      await wait(options.delayMs)
    }

    if (totals.candidates >= options.limit) break
  }

  report.log(
    `\nscanned ${totals.scanned} · candidates ${totals.candidates} · ${
      options.dryRun ? 'would update' : 'updated'
    } ${totals.updated} · left untranslated ${totals.unchanged}`,
  )

  return totals
}

// Only when run directly, so a test can import the helpers without touching the
// database or the network.
if (process.argv[1]?.endsWith('backfill-listing-translations.js')) {
  try {
    await backfillListingTranslations()
  } finally {
    await prisma.$disconnect()
  }
}
