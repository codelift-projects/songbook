/**
 * Authentication helper for Manage Songs page.
 * Stores verified password in localStorage to avoid repeated prompts.
 */

export const MANAGE_PASSWORD_STORAGE_KEY = 'church-songbook:manage_password';
export const DEFAULT_MANAGE_PASSWORD = 'youngistan';

/**
 * Check if the user has already entered the valid password on this browser/device.
 */
export function isManageAuthenticated() {
  try {
    const stored = localStorage.getItem(MANAGE_PASSWORD_STORAGE_KEY);
    if (!stored) return false;
    return String(stored).trim().toLowerCase() === DEFAULT_MANAGE_PASSWORD;
  } catch {
    return false;
  }
}

/**
 * Verify an entered password against the required password.
 */
export function verifyManagePassword(input) {
  if (typeof input !== 'string') return false;
  const cleaned = input.trim().toLowerCase();
  return cleaned === DEFAULT_MANAGE_PASSWORD;
}

/**
 * Save valid password into localStorage.
 */
export function saveManagePassword(input) {
  try {
    localStorage.setItem(
      MANAGE_PASSWORD_STORAGE_KEY,
      (input || DEFAULT_MANAGE_PASSWORD).trim().toLowerCase()
    );
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
