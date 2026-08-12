/**
 * Maps the API's `Governorate` enum onto the message keys under
 * `governorates.*`. Only the multi-word values need an entry; every other
 * value lowercases onto its own key.
 */
const governorateKeys = {
  AL_HASAKAH: 'alHasakah',
  AS_SUWAYDA: 'asSuwayda',
  DEIR_EZ_ZOR: 'deirEzZor',
  RIF_ALEPPO: 'rifAleppo',
  RIF_DIMASHQ: 'rifDimashq',
}

/**
 * @param {string} value A `Governorate` enum value such as `RIF_DIMASHQ`.
 * @returns {string} The message key suffix, e.g. `rifDimashq`.
 */
export function governorateKey(value) {
  return governorateKeys[value] ?? String(value ?? '').toLowerCase()
}

/**
 * @param {string} value A `Governorate` enum value.
 * @param {(key: string) => string} t
 * @returns {string} The governorate name in the active locale.
 */
export function governorateLabel(value, t) {
  return value ? t(`governorates.${governorateKey(value)}`) : ''
}
