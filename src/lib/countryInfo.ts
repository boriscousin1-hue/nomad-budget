// Infos pratiques par pays pour nomades : prises, tension, eau du robinet,
// pourboires, couverture data, numéro d'urgence. Données indicatives et curées
// (les plus fréquentes) — pas une source légale. Clé = nom FR normalisé.

export type TapWater = 'safe' | 'caution' | 'unsafe'

export type CountryInfo = {
  flag: string
  plugs: string // types de prises (lettres CEI)
  voltage: string // tension · fréquence
  tapWater: TapWater
  tipping: string // usage du pourboire, court
  data: string // couverture mobile, court
  emergency: string // numéro(s) d'urgence
}

// Normalise un nom de pays : minuscules, sans accents, tirets → espaces, espaces compressés.
export function normalizeCountry(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Variantes fréquentes → clé canonique (déjà normalisées).
const ALIASES: Record<string, string> = {
  bali: 'indonesie',
  java: 'indonesie',
  usa: 'etats unis',
  'etats unis d amerique': 'etats unis',
  amerique: 'etats unis',
  uk: 'royaume uni',
  angleterre: 'royaume uni',
  'grande bretagne': 'royaume uni',
  ecosse: 'royaume uni',
  coree: 'coree du sud',
  'south korea': 'coree du sud',
  dubai: 'emirats arabes unis',
  'abu dhabi': 'emirats arabes unis',
  emirats: 'emirats arabes unis',
  uae: 'emirats arabes unis',
  'viet nam': 'vietnam',
  hollande: 'pays bas',
  siam: 'thailande',
}

const DB: Record<string, CountryInfo> = {
  thailande: { flag: '🇹🇭', plugs: 'A / B / C', voltage: '230 V · 50 Hz', tapWater: 'unsafe', tipping: 'Pas obligatoire ; arrondir ou ~10 % au resto.', data: '4G/5G excellente en ville, bonne partout.', emergency: 'Police 191 · Secours 1669 · Touristes 1155' },
  vietnam: { flag: '🇻🇳', plugs: 'A / C / F', voltage: '220 V · 50 Hz', tapWater: 'unsafe', tipping: 'Peu courant ; apprécié dans le tourisme.', data: '4G très bon marché et rapide.', emergency: 'Police 113 · Ambulance 115 · Pompiers 114' },
  indonesie: { flag: '🇮🇩', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'unsafe', tipping: 'Pas attendu ; +10 % parfois ajouté.', data: '4G correcte à Bali/villes, variable ailleurs.', emergency: 'Urgences 112 · Police 110 · Ambulance 118' },
  portugal: { flag: '🇵🇹', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Non obligatoire ; arrondir suffit.', data: '4G/5G excellente.', emergency: 'Urgences 112' },
  espagne: { flag: '🇪🇸', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Facultatif ; petite pièce appréciée.', data: '4G/5G excellente.', emergency: 'Urgences 112' },
  mexique: { flag: '🇲🇽', plugs: 'A / B', voltage: '127 V · 60 Hz', tapWater: 'unsafe', tipping: 'Attendu : 10–15 % au resto.', data: '4G bonne en ville.', emergency: 'Urgences 911' },
  colombie: { flag: '🇨🇴', plugs: 'A / B', voltage: '110 V · 60 Hz', tapWater: 'caution', tipping: 'Souvent 10 % inclus ("servicio").', data: '4G bonne à Bogotá/Medellín.', emergency: 'Urgences 123' },
  georgie: { flag: '🇬🇪', plugs: 'C / F', voltage: '220 V · 50 Hz', tapWater: 'caution', tipping: 'Non attendu ; arrondir.', data: '4G rapide et pas chère.', emergency: 'Urgences 112' },
  turquie: { flag: '🇹🇷', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: '~10 % au resto ("bahşiş").', data: '4G bonne ; eSIM conseillée (data locale chère).', emergency: 'Urgences 112' },
  grece: { flag: '🇬🇷', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: 'Facultatif ; arrondir. Îles : eau souvent en bouteille.', data: '4G bonne.', emergency: 'Urgences 112' },
  italie: { flag: '🇮🇹', plugs: 'C / F / L', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Non obligatoire ; "coperto" souvent facturé.', data: '4G/5G excellente.', emergency: 'Urgences 112' },
  france: { flag: '🇫🇷', plugs: 'C / E', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Service compris ; arrondir si content.', data: '4G/5G excellente.', emergency: 'Urgences 112' },
  allemagne: { flag: '🇩🇪', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: '~5–10 %, annoncé en payant.', data: '4G/5G bonne (parfois faible en zone rurale).', emergency: 'Urgences 112' },
  croatie: { flag: '🇭🇷', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Facultatif ; ~10 % apprécié.', data: '4G très bonne.', emergency: 'Urgences 112' },
  japon: { flag: '🇯🇵', plugs: 'A / B', voltage: '100 V · 50/60 Hz', tapWater: 'safe', tipping: "Pas de pourboire — ça peut gêner.", data: '4G/5G excellente ; eSIM facile.', emergency: 'Police 110 · Ambulance/Pompiers 119' },
  'coree du sud': { flag: '🇰🇷', plugs: 'C / F', voltage: '220 V · 60 Hz', tapWater: 'caution', tipping: 'Pas de pourboire.', data: '4G/5G parmi les meilleures au monde.', emergency: 'Police 112 · Ambulance 119' },
  malaisie: { flag: '🇲🇾', plugs: 'G', voltage: '240 V · 50 Hz', tapWater: 'caution', tipping: 'Non attendu ; taxe de service parfois incluse.', data: '4G bonne en ville.', emergency: 'Urgences 999 (112 mobile)' },
  philippines: { flag: '🇵🇭', plugs: 'A / B / C', voltage: '220 V · 60 Hz', tapWater: 'unsafe', tipping: '~10 % apprécié ; parfois inclus.', data: '4G variable, mieux en ville.', emergency: 'Urgences 911' },
  cambodge: { flag: '🇰🇭', plugs: 'A / C / G', voltage: '230 V · 50 Hz', tapWater: 'unsafe', tipping: 'Apprécié, non obligatoire.', data: '4G correcte et bon marché.', emergency: 'Police 117 · Ambulance 119' },
  laos: { flag: '🇱🇦', plugs: 'A / B / C / E / F', voltage: '230 V · 50 Hz', tapWater: 'unsafe', tipping: 'Non attendu ; arrondir.', data: '4G limitée hors villes.', emergency: 'Police 191 · Ambulance 195' },
  inde: { flag: '🇮🇳', plugs: 'C / D / M', voltage: '230 V · 50 Hz', tapWater: 'unsafe', tipping: '~10 % ; pourboires courants.', data: '4G très bon marché, large couverture.', emergency: 'Urgences 112' },
  'sri lanka': { flag: '🇱🇰', plugs: 'D / G / M', voltage: '230 V · 50 Hz', tapWater: 'unsafe', tipping: '~10 % apprécié.', data: '4G correcte en ville.', emergency: 'Police 119 · Ambulance 1990' },
  maroc: { flag: '🇲🇦', plugs: 'C / E', voltage: '220 V · 50 Hz', tapWater: 'caution', tipping: 'Courant : quelques dirhams partout.', data: '4G bonne en ville.', emergency: 'Police 19 · Ambulance 15' },
  'afrique du sud': { flag: '🇿🇦', plugs: 'D / M / N', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: '10–15 % attendu au resto.', data: '4G bonne en ville ; coupures de courant (délestage).', emergency: 'Police 10111 · Ambulance 10177 (112 mobile)' },
  bresil: { flag: '🇧🇷', plugs: 'C / N', voltage: '127/220 V · 60 Hz', tapWater: 'caution', tipping: '~10 % souvent inclus ("serviço").', data: '4G bonne en ville.', emergency: 'Police 190 · Ambulance 192' },
  argentine: { flag: '🇦🇷', plugs: 'C / I', voltage: '220 V · 50 Hz', tapWater: 'caution', tipping: '~10 % en liquide apprécié.', data: '4G correcte en ville.', emergency: 'Urgences 911' },
  perou: { flag: '🇵🇪', plugs: 'A / B / C', voltage: '220 V · 60 Hz', tapWater: 'unsafe', tipping: '~10 %, non obligatoire.', data: '4G correcte en ville.', emergency: 'Police 105 · Pompiers 116' },
  chili: { flag: '🇨🇱', plugs: 'C / L', voltage: '220 V · 50 Hz', tapWater: 'caution', tipping: '10 % souvent suggéré sur l\'addition.', data: '4G bonne en ville.', emergency: 'Police 133 · Ambulance 131' },
  'etats unis': { flag: '🇺🇸', plugs: 'A / B', voltage: '120 V · 60 Hz', tapWater: 'safe', tipping: 'Attendu : 15–20 % quasi partout.', data: '4G/5G excellente.', emergency: 'Urgences 911' },
  canada: { flag: '🇨🇦', plugs: 'A / B', voltage: '120 V · 60 Hz', tapWater: 'safe', tipping: 'Attendu : 15–20 %.', data: '4G/5G bonne.', emergency: 'Urgences 911' },
  'royaume uni': { flag: '🇬🇧', plugs: 'G', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: '~10–12 %, souvent "service charge" inclus.', data: '4G/5G bonne.', emergency: 'Urgences 999 (112 aussi)' },
  'pays bas': { flag: '🇳🇱', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Facultatif ; arrondir.', data: '4G/5G excellente.', emergency: 'Urgences 112' },
  estonie: { flag: '🇪🇪', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: 'Non attendu ; ~10 % apprécié.', data: '4G/5G excellente (pays très connecté).', emergency: 'Urgences 112' },
  roumanie: { flag: '🇷🇴', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: '~10 % apprécié.', data: '4G/5G rapide et pas chère.', emergency: 'Urgences 112' },
  bulgarie: { flag: '🇧🇬', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'safe', tipping: '~10 % apprécié.', data: '4G bonne.', emergency: 'Urgences 112' },
  albanie: { flag: '🇦🇱', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: 'Arrondir ; ~10 % apprécié.', data: '4G correcte en ville.', emergency: 'Urgences 112' },
  montenegro: { flag: '🇲🇪', plugs: 'C / F', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: 'Facultatif ; ~10 %.', data: '4G bonne sur la côte.', emergency: 'Urgences 112' },
  'emirats arabes unis': { flag: '🇦🇪', plugs: 'G', voltage: '230 V · 50 Hz', tapWater: 'caution', tipping: '10–15 % apprécié (parfois inclus).', data: '4G/5G excellente ; VoIP souvent bloqué.', emergency: 'Police 999 · Ambulance 998 (112 mobile)' },
}

// Retourne les infos du pays, ou null si non répertorié.
export function lookupCountryInfo(name: string | null | undefined): CountryInfo | null {
  if (!name) return null
  const norm = normalizeCountry(name)
  const key = ALIASES[norm] || norm
  return DB[key] || null
}

export const TAP_WATER_LABEL: Record<TapWater, { label: string; emoji: string }> = {
  safe: { label: 'Eau du robinet potable', emoji: '🚰' },
  caution: { label: 'Eau du robinet : prudence', emoji: '⚠️' },
  unsafe: { label: 'Eau du robinet non potable', emoji: '🚱' },
}
