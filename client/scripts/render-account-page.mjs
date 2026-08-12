/**
 * Renders the account surfaces to HTML, once per locale, with no browser in the
 * loop. It is a check rather than a build step: it proves the new page and both
 * dialogs mount, that every string they draw resolves, and that nothing reads
 * from `window` on first render.
 *
 * The page is rendered through stubbed context providers rather than the real
 * ones: `AuthProvider` and the account hook would each issue a request, and the
 * point here is the markup, not the network.
 *
 * Run with: node scripts/render-account-page.mjs
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
  { AuthContext },
  { FavoritesContext },
  { locales },
  { messages },
  { translate },
  { default: AccountPage },
  { default: AccountProfilePage },
  { default: ProfileDetailsDialog },
  { default: PasswordChangeDialog },
] = await Promise.all([
  vite.ssrLoadModule('/src/context/locale-context.js'),
  vite.ssrLoadModule('/src/features/auth/context/auth-context.js'),
  vite.ssrLoadModule('/src/features/favorites/favorites-context.js'),
  vite.ssrLoadModule('/src/constants/locales.js'),
  vite.ssrLoadModule('/src/i18n/messages/index.js'),
  vite.ssrLoadModule('/src/i18n/translate.js'),
  vite.ssrLoadModule('/src/pages/AccountPage.jsx'),
  vite.ssrLoadModule('/src/pages/AccountProfilePage.jsx'),
  vite.ssrLoadModule(
    '/src/features/account/components/ProfileDetailsDialog.jsx',
  ),
  vite.ssrLoadModule(
    '/src/features/account/components/PasswordChangeDialog.jsx',
  ),
])

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Owner account',
  email: 'owner@example.invalid',
  phone: '+963111222333',
  whatsapp: '+963944123456',
  role: 'OWNER',
}

function localeContextValue(locale) {
  return {
    locale,
    locales,
    setLocale: () => {},
    t: (key, variables) =>
      translate(messages, locale.code, 'en', key, variables),
  }
}

const authValue = {
  isAuthenticated: true,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  status: 'authenticated',
  user: { id: profile.id, name: profile.name, role: profile.role },
}

// The hub reads the saved-property count from this context; two saved ids keep
// the badge in the markup so it is rendered rather than skipped.
const favoritesValue = {
  clearFavorites: () => {},
  count: 2,
  favoriteIds: ['favorite-a', 'favorite-b'],
  isFavorite: () => false,
  removeFavorite: () => {},
  toggleFavorite: () => {},
}

const guestAuthValue = {
  ...authValue,
  isAuthenticated: false,
  status: 'unauthenticated',
  user: null,
}

const screens = [
  [
    'account hub (signed in)',
    authValue,
    () => h(AccountPage),
    (t) => [t('account.profile'), t('account.myProperties'), t('actions.logout')],
  ],
  [
    'account hub (guest)',
    guestAuthValue,
    () => h(AccountPage),
    (t) => [t('account.guest'), t('actions.login')],
  ],
  [
    'account page',
    authValue,
    () => h(AccountProfilePage),
    // The four sections and the sign-out action are the page, so their headings
    // are asserted rather than merely rendered.
    (t) => [
      t('account.details.title'),
      t('account.security.title'),
      t('account.listings.title'),
      t('account.office.title'),
      t('actions.logout'),
    ],
  ],
  [
    'edit details dialog',
    authValue,
    () =>
      h(ProfileDetailsDialog, {
        onClose: () => {},
        onSaved: () => {},
        profile,
      }),
    (t) => [
      t('account.editDialog.title'),
      t('account.details.emailLocked'),
      profile.email,
    ],
  ],
  [
    'change password dialog',
    authValue,
    () =>
      h(PasswordChangeDialog, { onChanged: () => {}, onClose: () => {} }),
    (t) => [
      t('account.passwordDialog.title'),
      t('account.passwordDialog.confirm'),
      t('account.passwordDialog.hint', { minimum: 12 }),
    ],
  ],
]

let failures = 0

for (const locale of locales) {
  const { t } = localeContextValue(locale)

  for (const [name, auth, element, expected] of screens) {
    let html = ''
    try {
      html = renderToString(
        h(
          MemoryRouter,
          null,
          h(
            AuthContext.Provider,
            { value: auth },
            h(
              FavoritesContext.Provider,
              { value: favoritesValue },
              h(
                LocaleContext.Provider,
                { value: localeContextValue(locale) },
                element(),
              ),
            ),
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
      /\b(?:account|actions|auth|dashboard|offices|favorites|accessibility|languages)\.[a-zA-Z_.]+/g,
    )
    if (unresolved) {
      failures += 1
      console.error(
        `✖ ${locale.code} — ${name}: unresolved keys ${[...new Set(unresolved)].join(', ')}`,
      )
      continue
    }

    const missing = (expected?.(t) ?? []).filter((text) => !html.includes(text))
    if (missing.length > 0) {
      failures += 1
      console.error(`✖ ${locale.code} — ${name}: missing ${missing.join(' | ')}`)
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

console.log('\nAll account screens rendered in every locale.')
