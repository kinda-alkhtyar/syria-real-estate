/**
 * Syrian Governorates (Muhafazat)
 * Stable identifiers for locations across the application
 */

export const syrianGovernorates = [
  { id: 'damascus', en: 'Damascus', ar: 'دمشق', de: 'Damaskus' },
  { id: 'rif-damascus', en: 'Rural Damascus', ar: 'ريف دمشق', de: 'Ländliches Damaskus' },
  { id: 'aleppo', en: 'Aleppo', ar: 'حلب', de: 'Aleppo' },
  { id: 'latakia', en: 'Latakia', ar: 'اللاذقية', de: 'Latakia' },
  { id: 'homs', en: 'Homs', ar: 'حمص', de: 'Homs' },
  { id: 'hama', en: 'Hama', ar: 'حماة', de: 'Hama' },
  { id: 'idlib', en: 'Idlib', ar: 'إدلب', de: 'Idlib' },
  { id: 'tartus', en: 'Tartus', ar: 'طرطوس', de: 'Tartus' },
  { id: 'daraa', en: 'Daraa', ar: 'درعا', de: 'Daraa' },
  { id: 'sweida', en: 'Sweida', ar: 'السويداء', de: 'Sweida' },
  { id: 'raqqa', en: 'Raqqa', ar: 'الرقة', de: 'Raqqa' },
  { id: 'hasaka', en: 'Hasaka', ar: 'الحسكة', de: 'Hasaka' },
  { id: 'deir-ez-zor', en: 'Deir ez-Zor', ar: 'دير الزور', de: 'Deir ez-Zor' },
  { id: 'quneitra', en: 'Quneitra', ar: 'القنيطرة', de: 'Quneitra' },
]

export const getGovernorateLabel = (id, locale = 'en') => {
  const governorate = syrianGovernorates.find((g) => g.id === id)
  if (!governorate) return ''
  
  return governorate[locale] || governorate.en
}
