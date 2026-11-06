// Phase1: explicit destination, never silently downgrade an account log to a bearer-code log.
export const accountIdOf = code => typeof code === 'string' && code.startsWith('acct:') ? code.slice(5) : null;
export function destination({ session = null, bound = null, allowLegacy = false, code = null } = {}) {
  if (session) return !session.pending && session.user && (!bound || bound === session.user.id) ? { code: 'acct:' + session.user.id, token: session.token } : null;
  return !bound && allowLegacy && code ? { code, token: null } : null;
}
export const BOUND_MESSAGE = 'This browser holds another account’s private history. Sign in to its original account. Switching accounts in this browser is not supported yet; nothing was copied.';
