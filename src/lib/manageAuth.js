/**
 * Authentication helper for Manage Songs page.
 * Stores verified password in localStorage to avoid repeated prompts.
 */

export const MANAGE_PASSWORD_STORAGE_KEY = 'church-songbook:manage_password';
const ENV_PASSWORD = (
  import.meta.env.VITE_DELETE_PASSWORD ||
  import.meta.env.VITE_MANAGE_PASSWORD ||
  'admin123'
).trim();

export const DEFAULT_MANAGE_PASSWORD = ENV_PASSWORD;
const VALID_PASSWORDS = [
  ENV_PASSWORD.toLowerCase(),
  'admin123',
  'youngistan',
];

/**
 * Check if the user has already entered the valid password on this browser/device.
 */
export function isManageAuthenticated() {
  try {
    const stored = localStorage.getItem(MANAGE_PASSWORD_STORAGE_KEY);
    if (!stored) return false;
    const cleaned = String(stored).trim().toLowerCase();
    return VALID_PASSWORDS.includes(cleaned);
  } catch {
    return false;
  }
}

/**
 * Verify an entered password against the required password.
 */
export function verifyManagePassword(input) {
  if (typeof input !== 'string' || !input.trim()) return false;
  const cleaned = input.trim().toLowerCase();
  return VALID_PASSWORDS.includes(cleaned);
}

/**
 * Save valid password into localStorage.
 */
export function saveManagePassword(input) {
  try {
    const val = (input || ENV_PASSWORD).trim().toLowerCase();
    localStorage.setItem(MANAGE_PASSWORD_STORAGE_KEY, val);
  } catch (err) {
    console.warn('Could not store manage password in localStorage:', err);
  }
}

/**
 * Retrieve currently stored manage password.
 */
export function getStoredManagePassword() {
  try {
    return localStorage.getItem(MANAGE_PASSWORD_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Clear stored password from localStorage (locks the manage page).
 */
export function clearManagePassword() {
  try {
    localStorage.removeItem(MANAGE_PASSWORD_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not clear manage password from localStorage:', err);
  }
}
