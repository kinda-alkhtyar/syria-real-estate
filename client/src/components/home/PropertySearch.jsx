import { Search } from 'lucide-react'

import Button from '../ui/Button.jsx'
import SelectField from '../ui/SelectField.jsx'

export default function PropertySearch() {
  function handleSubmit(event) {
    event.preventDefault()
  }

  return (
    <form
      aria-label="Search properties"
      className="grid gap-3 rounded-2xl border border-white/70 bg-white p-3 shadow-[0_22px_60px_rgba(24,42,35,0.13)] sm:p-4 md:grid-cols-2 lg:grid-cols-[0.8fr_1.15fr_1fr_auto]"
      id="search"
      onSubmit={handleSubmit}
    >
      <SelectField label="I want to" name="intent">
        <option value="buy">Buy</option>
        <option value="rent">Rent</option>
      </SelectField>

      <SelectField label="Governorate" name="governorate">
        <option value="">All governorates</option>
        <option value="damascus">Damascus</option>
        <option value="aleppo">Aleppo</option>
        <option value="homs">Homs</option>
        <option value="latakia">Latakia</option>
      </SelectField>

      <SelectField label="Property type" name="propertyType">
        <option value="">All properties</option>
        <option value="apartment">Apartment</option>
        <option value="house">House</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
      </SelectField>

      <Button className="mt-auto min-h-12 rounded-xl px-6" type="submit">
        <Search aria-hidden="true" size={18} />
        Search
      </Button>
    </form>
  )
}
