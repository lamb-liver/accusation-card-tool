import { handleAdminStatusPatch } from '../../../../_shared/statusPatch.js';

export async function onRequestPatch(context) {
  return handleAdminStatusPatch(context, 'deck');
}
