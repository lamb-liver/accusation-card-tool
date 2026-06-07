import { STATUSES } from './constants.js';

const TRANSITIONS = {
  pending: new Set(['approved', 'hidden', 'deleted']),
  approved: new Set(['hidden', 'deleted']),
  hidden: new Set(['approved', 'deleted']),
  deleted: new Set(),
};

export function isValidStatus(status) {
  return STATUSES.includes(status);
}

export function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  return TRANSITIONS[from].has(to);
}
