import { FILTER_OPTIONS } from '../../constants/filterOptions.js';

const BASE_FACTION_OPTIONS = FILTER_OPTIONS.faction.filter(
  (option) => option.value !== 'all' && option.value !== '放逐者'
);

export function buildFactionOptions(placeholder, excludeValue = null) {
  return [
    { value: '', label: placeholder, iconSrc: null, muted: true },
    ...BASE_FACTION_OPTIONS.filter((option) => option.value !== excludeValue),
  ];
}
