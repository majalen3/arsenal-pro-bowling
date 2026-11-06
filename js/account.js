import { db } from './hub.js';
// Optional account glue: one shared client (core + tests: js/data/account.js). Emits 'account' when the session changes.
import { API_BASE, emit, objGet, rawSet } from './store.js';
import { createAccount } from './data/account.js';
import { createTeamClient } from './data/team.js';
export const account = createAccount({ base: API_BASE, storage: localStorage, canUse: user => { const guard = objGet('ap_sync_guard') || {}; const bound = guard.account || db?.meta.accountBinding; return !guard.blocked && !db?.meta.privacyConflict && (!bound || bound === user.id); }, onChange: s => { if (s && !s.pending) { rawSet('ap_sync_guard', JSON.stringify({ v:1, account:s.user.id })); if (db) db.setMeta('accountBinding', s.user.id).catch(() => {}); } if (!s) rawSet('ap_backup_sync', 'false'); if (!s && team) team.forget(); emit('account', s); } });
// My Team (needs an account). Signing out clears the cached team view from this phone.
export const team = createTeamClient({ account, storage: localStorage });

// Team calls cannot race the IndexedDB privacy migration during first paint.
const request0 = account.request; account.request = async (...args) => { await (await import('./hub.js')).ready(); return request0(...args); };
