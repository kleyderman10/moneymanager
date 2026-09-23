import { getActivePinia } from 'pinia'

// Snapshot of every store's state right after it's created, so logout can put them all
// back. Otherwise the previous account's transactions, wallets or AI chat stay in memory
// (logout navigates client-side, without a reload) and the next account signing in on
// the same device briefly sees them.
const initialStates = new Map()

const clone = (value) => JSON.parse(JSON.stringify(value))

export const snapshotStatePlugin = ({ store }) => {
  initialStates.set(store.$id, clone(store.$state))
}

export const resetAllStores = (except = []) => {
  const pinia = getActivePinia()
  if (!pinia) return
  pinia._s.forEach((store, id) => {
    if (except.includes(id) || !initialStates.has(id)) return
    const initial = clone(initialStates.get(id))
    store.$patch((state) => {
      for (const key of Object.keys(state)) {
        if (!(key in initial)) delete state[key]
      }
      Object.assign(state, initial)
    })
  })
}
