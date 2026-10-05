import { OpenWakeWordProvider } from './OpenWakeWordProvider'

// The only entry point Vue uses. To change the engine, change what `createProvider` returns
// (a PorcupineWakeWordProvider, for instance) without touching stores or components.
let provider = null

export const createProvider = () => new OpenWakeWordProvider()

export const getWakeWordProvider = () => {
  if (!provider) provider = createProvider()
  return provider
}

// Tests and alternative engines inject their own provider here.
export const setWakeWordProvider = (next) => { provider = next }
