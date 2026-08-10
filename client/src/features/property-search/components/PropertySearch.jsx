import { Search } from 'lucide-react'

import Button from '../../../components/ui/Button.jsx'
import SelectField from '../../../components/ui/SelectField.jsx'
import { syrianGovernorates } from '../../../constants/syrian-governorates.js'
import { useLocale } from '../../../hooks/useLocale.js'
import { propertyTypes } from '../constants/property-types.js'
import { transactionTypes } from '../constants/search-options.js'
import { usePropertySearch } from '../hooks/usePropertySearch.js'

/**
 * Composes the accessible property-search form with its URL-backed state.
 *
 * @param {object} props
 * @param {string} [props.id]
 */
export default function PropertySearch({ id = 'property-search' }) {
  const { t } = useLocale()
  const { criteria, submitSearch, updateCriterion } = usePropertySearch()
  const headingId = `${id}-heading`

  return (
    <form
      aria-labelledby={headingId}
      className="h-full rounded-[20px] bg-white px-[24px] pb-[24px] pt-[16px] shadow-[0px_16px_4px_0px_rgba(18,36,59,0.14)]"
      id={id}
      onSubmit={submitSearch}
      role="search"
    >
      <h2 className="sr-only" id={headingId}>
        {t('search.label')}
      </h2>

      <div className="flex gap-[8px] overflow-x-auto pt-1 pb-[28px] desktop:overflow-x-visible desktop:pt-0">
        {transactionTypes.map((option) => {
          const isActive = criteria.transactionType === option.id
          return (
            <button
              key={option.id}
              type="button"
              className={`inline-flex h-[44px] w-auto min-w-[84px] shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] px-[14px] py-[10px] text-[16px] font-medium leading-[24px] text-[#12243B] transition duration-fast ease-standard desktop:w-[96px] desktop:px-[20px] desktop:text-[18px] desktop:ltr:w-auto desktop:ltr:min-w-[96px] ${
                isActive ? 'bg-[#D0A64A]' : 'bg-transparent hover:bg-[#F7F4EE]'
              }`}
              onClick={() => updateCriterion('transactionType', option.id)}
            >
              {t(option.labelKey)}
            </button>
          )
        })}
      </div>

      <div className="grid min-w-0 gap-[12px] desktop:grid-cols-[300px_240px_240px_256px] desktop:rtl:[direction:rtl]">
        <div className="lg:col-span-1">
          <SelectField
            id={`${id}-governorate`}
            label={t('search.governorate')}
            name="governorate"
            hideLabelOnDesktop
            onChange={(event) =>
              updateCriterion('governorate', event.target.value)
            }
            selectClassName="h-[64px]! rounded-[12px]! border-[#DED8CE]! bg-[#F7F4EE]! px-[17px]! text-[18px]! font-normal! leading-[24px]! text-[#566170]!"
            value={criteria.governorate}
          >
            <option value="">{t('search.allGovernorate')}</option>
            {syrianGovernorates.map((governorate) => (
              <option key={governorate.id} value={governorate.id}>
                {t(governorate.labelKey)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="lg:col-span-1">
          <SelectField
            id={`${id}-property-type`}
            label={t('search.propertyType')}
            name="propertyType"
            hideLabelOnDesktop
            onChange={(event) =>
              updateCriterion('propertyType', event.target.value)
            }
            selectClassName="h-[64px]! rounded-[12px]! border-[#DED8CE]! bg-[#F7F4EE]! px-[17px]! text-[18px]! font-normal! leading-[24px]! text-[#566170]!"
            value={criteria.propertyType}
          >
            <option value="">{t('search.allProperties')}</option>
            {propertyTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {t(type.labelKey)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="lg:col-span-1">
          <SelectField
            id={`${id}-price-range`}
            label={t('search.price')}
            name="price"
            hideLabelOnDesktop
            onChange={() => {}}
            selectClassName="h-[64px]! rounded-[12px]! border-[#DED8CE]! bg-[#F7F4EE]! px-[17px]! text-[18px]! font-normal! leading-[24px]! text-[#566170]!"
            value=""
          >
            <option value="">{t('search.allPrices')}</option>
          </SelectField>
        </div>

        <div className="lg:col-span-1">
          <Button
            className="h-[64px]! min-h-[64px]! w-full min-w-0 rounded-[12px]! bg-[#12243B]! text-[18px]! font-normal! leading-[24px]! text-white! shadow-none!"
            type="submit"
          >
            <Search aria-hidden="true" size={18} />
            {t('actions.search')}
          </Button>
        </div>
      </div>
    </form>
  )
}
