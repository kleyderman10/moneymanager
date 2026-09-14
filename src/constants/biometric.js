// Shared between src/stores/auth.js and src/api/client.js — kept in its own module so
// client.js (loaded by auth.js) doesn't have to import back from the auth store.
export const BIOMETRIC_SERVER = 'online.knexura.moneymanager'
