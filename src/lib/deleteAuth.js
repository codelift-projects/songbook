const ENV_PASSWORD = import.meta.env.VITE_DELETE_PASSWORD;

/**
 * Verify a password against the env-stored value.
 *
 * ⚠️ SECURITY NOTE: This is a client-side gate only. The value is baked into
 * the built JS bundle and is visible to anyone who inspects it. It is suitable
 * for preventing accidental deletes by well-meaning users — it is NOT a
 * security control against a motivated attacker. If real access control is
 * needed, move delete behind Supabase Auth + RLS.
 */
export function verifyDeletePassword(input) {
  if (!ENV_PASSWORD) {
    // Fail closed: if the env var is missing, refuse rather than allow.
    console.warn('[deleteAuth] VITE_DELETE_PASSWORD is not set. Deletes are disabled.');
    return { ok: false, reason: 'not_configured' };
  }
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  const expected = String(ENV_PASSWORD);
  // Constant-time-ish compare (length-then-char)
  if (input.length !== expected.length) return { ok: false, reason: 'mismatch' };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: 'mismatch' };
}

export function isDeletePasswordConfigured() {
  return Boolean(ENV_PASSWORD);
}
