import { AlertCircle, KeyRound, LoaderCircle, LogOut, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ApiError } from '../api/api-client.js'
import Button from '../components/ui/Button.jsx'
import Container from '../components/ui/Container.jsx'
import PasswordChangeDialog from '../features/account/components/PasswordChangeDialog.jsx'
import ProfileDetailsDialog from '../features/account/components/ProfileDetailsDialog.jsx'
import { useMyProfile } from '../features/account/hooks/useMyProfile.js'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import ManagementPropertyList from '../features/management/components/ManagementPropertyList.jsx'
import { useManagementProperties } from '../features/management/hooks/useManagementProperties.js'
import MyOfficePanel from '../features/offices/components/MyOfficePanel.jsx'
import { useMyOffice } from '../features/offices/hooks/useMyOffice.js'
import { useLocale } from '../hooks/useLocale.js'

const managerRoles = ['ADMIN', 'OWNER']

function Section({ action, children, description, title, titleId }) {
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-semibold text-ink">
        {value}
      </dd>
    </div>
  )
}

function EmptyValue() {
  const { t } = useLocale()
  return <span className="font-normal text-muted">{t('account.details.empty')}</span>
}

/**
 * "My listings" is a child component so the management request is only issued
 * for the roles the endpoint accepts; every other role would be refused.
 */
function ListingsSection() {
  const { data, error, meta, page, retry, setPage, status } =
    useManagementProperties()
  const { t } = useLocale()

  return (
    <Section
      title={t('account.listings.title')}
      titleId="account-listings-title"
    >
      <div className="mt-4">
        {status === 'loading' && (
          <div
            aria-live="polite"
            className="flex min-h-32 items-center justify-center gap-3 text-muted"
            role="status"
          >
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
              size={20}
            />
            <span className="font-semibold">
              {t('dashboard.properties.loading')}
            </span>
          </div>
        )}

        {status === 'empty' && (
          <p className="text-sm leading-6 text-muted">
            {t('dashboard.properties.emptyDescription')}
          </p>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertCircle aria-hidden="true" className="text-muted" size={18} />
              {error instanceof ApiError && error.status === 401
                ? t('dashboard.properties.sessionExpired')
                : t('dashboard.properties.errorDescription')}
            </p>
            <Button onClick={retry} variant="secondary">
              {t('dashboard.properties.retry')}
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <ManagementPropertyList
            meta={meta}
            onPropertyChanged={retry}
            page={page}
            properties={data}
            setPage={setPage}
          />
        )}
      </div>
    </Section>
  )
}

/** Mirrors the offices page: the panel draws itself, or nothing at all. */
function OfficeSection() {
  const { office, status } = useMyOffice()
  const { t } = useLocale()

  return (
    <Section title={t('account.office.title')} titleId="account-office-title">
      <div className="mt-4 [&>section]:mb-0">
        {status === 'loading' ? (
          <p aria-live="polite" className="text-sm text-muted" role="status">
            {t('account.office.loading')}
          </p>
        ) : (
          <MyOfficePanel office={office} status={status} />
        )}
      </div>
    </Section>
  )
}

/**
 * The account hub's own page: the profile the person owns, the password they
 * control, and shortcuts into the two surfaces that are theirs. Reached from
 * the "Profile" row of `/account`, and guarded, so every role that can sign in
 * lands here and only the manager sections vary.
 */
export default function AccountProfilePage() {
  const [openDialog, setOpenDialog] = useState('')
  const [feedbackKey, setFeedbackKey] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout, user } = useAuth()
  const { profile, replace, retry, status } = useMyProfile()
  const { t } = useLocale()
  const canManage = managerRoles.includes(user?.role)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${t('account.profileTitle')} | ${t('brand.name')}`
    return () => {
      document.title = previousTitle
    }
  }, [t])

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <section aria-labelledby="account-profile-title" className="py-8 sm:py-12">
      <Container>
        <header className="mb-6 border-b border-line pb-6">
          <h1
            className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            id="account-profile-title"
          >
            {t('account.profileTitle')}
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-muted">
            {t('account.profileDescription')}
          </p>
        </header>

        {feedbackKey && (
          <p
            aria-live="polite"
            className="mb-6 rounded-xl border border-success/35 bg-success/10 px-4 py-3 font-semibold text-ink"
            role="status"
          >
            {t(feedbackKey)}
          </p>
        )}

        <div className="grid gap-5">
          <Section
            action={
              status === 'ready' && (
                <Button onClick={() => setOpenDialog('profile')} variant="secondary">
                  <Pencil aria-hidden="true" size={16} />
                  {t('account.details.edit')}
                </Button>
              )
            }
            description={t('account.details.description')}
            title={t('account.details.title')}
            titleId="account-details-title"
          >
            {status === 'loading' && (
              <p aria-live="polite" className="mt-4 text-sm text-muted" role="status">
                {t('account.feedback.loading')}
              </p>
            )}

            {status === 'error' && (
              <div className="mt-4 flex flex-col items-start gap-3">
                <p className="text-sm font-semibold text-ink">
                  {t('account.feedback.loadError')}
                </p>
                <Button onClick={retry} variant="secondary">
                  {t('account.feedback.retry')}
                </Button>
              </div>
            )}

            {status === 'ready' && profile && (
              <dl className="mt-4 grid gap-3">
                <DetailRow label={t('account.details.name')} value={profile.name} />
                <DetailRow
                  label={t('account.details.email')}
                  value={<span dir="ltr">{profile.email}</span>}
                />
                <DetailRow
                  label={t('account.details.phone')}
                  value={
                    profile.phone ? (
                      <span dir="ltr">{profile.phone}</span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                />
                <DetailRow
                  label={t('account.details.whatsapp')}
                  value={
                    profile.whatsapp ? (
                      <span dir="ltr">{profile.whatsapp}</span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                />
              </dl>
            )}
          </Section>

          <Section
            action={
              <Button onClick={() => setOpenDialog('password')} variant="secondary">
                <KeyRound aria-hidden="true" size={16} />
                {t('account.security.changePassword')}
              </Button>
            }
            description={t('account.security.description')}
            title={t('account.security.title')}
            titleId="account-security-title"
          />

          {canManage && <ListingsSection />}
          {canManage && <OfficeSection />}

          <div className="flex justify-start">
            <Button
              className="text-error"
              disabled={isLoggingOut}
              onClick={handleLogout}
              variant="secondary"
            >
              <LogOut aria-hidden="true" size={16} />
              {isLoggingOut ? t('auth.signingOut') : t('actions.logout')}
            </Button>
          </div>
        </div>
      </Container>

      {openDialog === 'profile' && profile && (
        <ProfileDetailsDialog
          onClose={() => setOpenDialog('')}
          onSaved={(updated) => {
            replace(updated)
            setOpenDialog('')
            setFeedbackKey('account.feedback.profileSaved')
          }}
          profile={profile}
        />
      )}

      {openDialog === 'password' && (
        <PasswordChangeDialog
          onChanged={() => {
            setOpenDialog('')
            setFeedbackKey('account.feedback.passwordChanged')
          }}
          onClose={() => setOpenDialog('')}
        />
      )}
    </section>
  )
}
