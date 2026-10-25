import { verifyManagePassword } from './manageAuth';

const ENV_PASSWORD = import.meta.env.VITE_DELETE_PASSWORD || 'admin123';

/**
 * Verify a password against the admin password.
 */
export function verifyDeletePassword(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (verifyManagePassword(input)) {
    return { ok: true };
  }
  return { ok: false, reason: 'mismatch' };
}

export function isDeletePasswordConfigured() {
  return Boolean(ENV_PASSWORD);
}
