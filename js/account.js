// Optional account glue: one shared client (core + tests: js/data/account.js). Emits 'account' when the session changes.
import { API_BASE, emit } from './store.js';
import { createAccount } from './data/account.js';
export const account = createAccount({ base: API_BASE, storage: localStorage, onChange: s => emit('account', s) });
