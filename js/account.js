// Optional account glue: one shared client (core + tests: js/data/account.js). Emits 'account' when the session changes.
import { API_BASE, emit } from './store.js';
import { createAccount } from './data/account.js';
import { createTeamClient } from './data/team.js';
export const account = createAccount({ base: API_BASE, storage: localStorage, onChange: s => { if (!s && team) team.forget(); emit('account', s); } });
// My Team (needs an account). Signing out clears the cached team view from this phone.
export const team = createTeamClient({ account, storage: localStorage });
