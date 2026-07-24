import { Search } from 'lucide-react'

import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { propertyTypes } from '../constants/property-types.js'
import { usePropertySearch } from '../hooks/usePropertySearch.js'
import Button from '../../../components/ui/Button.jsx'
import SelectField from '../../../components/ui/SelectField.jsx'
import { useLocale } from '../../../hooks/useLocale.js'
import { messages } from '../../../i18n/messages/index.js'

export default function PropertySearch() {
  const { locale } = useLocale()
  const t = messages[locale]
  const { searchParams, handleChange, handleSubmit } = usePropertySearch()

  return (
    <form
      aria-label={t.accessibility.searchProperties}
      className="grid gap-3 rounded-2xl border border-white/70 bg-white p-3 shadow-[0_22px_60px_rgba(24,42,35,0.13)] sm:p-4 md:grid-cols-2 lg:grid-cols-[0.8fr_1.15fr_1fr_auto]"
      id="search"
      onSubmit={handleSubmit}
    >
      <SelectField
        label={t.search.intent}
        name="intent"
        value={searchParams.intent}
        onChange={handleChange}
      >
        <option value="buy">{t.intentTypes.buy}</option>
        <option value="rent">{t.intentTypes.rent}</option>
      </SelectField>

      <SelectField
        label={t.search.governorate}
        name="governorate"
        value={searchParams.governorate}
        onChange={handleChange}
      >
        <option value="">{t.search.allGovernorate}</option>
        {syrianGovernorates.map((gov) => (
          <option key={gov.id} value={gov.id}>
            {locale === 'ar' ? gov.ar : locale === 'de' ? gov.de : gov.en}
          </option>
        ))}
      </SelectField>

      <SelectField
        label={t.search.propertyType}
        name="propertyType"
        value={searchParams.propertyType}
        onChange={handleChange}
      >
        <option value="">{t.search.allProperties}</option>
        {propertyTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {t.propertyTypes[type.id]}
          </option>
        ))}
      </SelectField>

      <Button className="mt-auto min-h-12 rounded-xl px-6" type="submit">
        <Search aria-hidden="true" size={18} />
        {t.actions.search}
      </Button>
    </form>
  )
}
