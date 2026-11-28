// In-memory cache of the last data each partner page loaded (stale-while-revalidate).
// A page reads it on mount to render instantly, then refetches in the background.
// Entries are scoped to the logged-in tailor and cleared on logout / account switch.

const store = new Map();

const scopedKey = (userId, key) => `${userId || 'anon'}:${key}`;

export const getPageCache = (userId, key) => store.get(scopedKey(userId, key));

export const setPageCache = (userId, key, value) => {
    store.set(scopedKey(userId, key), value);
};

export const clearPageCache = () => store.clear();
