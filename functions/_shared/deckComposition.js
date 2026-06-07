import { cardsById } from './cardManifest.generated.js';
import {
  collectDeckStructureViolations,
  formatDeckCompositionError,
} from '../../shared/deckCompositionCore.js';

function resolveCard(id) {
  const meta = cardsById.get(id);
  if (!meta) return null;
  return { id, ...meta };
}

export function validateDeckComposition(deckJson, ruleJson) {
  const leader = [];
  for (const id of deckJson.leader) {
    const card = resolveCard(id);
    if (!card) return `Unknown card id: ${id}`;
    leader.push(card);
  }

  const rituals = [];
  for (const id of deckJson.rituals) {
    const card = resolveCard(id);
    if (!card) return `Unknown card id: ${id}`;
    rituals.push(card);
  }

  const main = [];
  for (const id of deckJson.main) {
    const card = resolveCard(id);
    if (!card) return `Unknown card id: ${id}`;
    main.push(card);
  }

  const issues = collectDeckStructureViolations({ leader, rituals, main }, ruleJson);
  return formatDeckCompositionError(issues);
}
