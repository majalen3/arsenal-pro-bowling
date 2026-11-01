// Pro shop kit helpers (no DOM): the link a printed code carries and the parse addball does with it.
export const KIT_MAX = 24;
export const kitUrl = (id, base) => `${base}#/add-ball?cat=${encodeURIComponent(id)}`;
export const catFromHash = hash => new URLSearchParams(String(hash || '').split('?')[1] || '').get('cat');
