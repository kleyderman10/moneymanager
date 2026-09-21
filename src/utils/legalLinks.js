import { Capacitor } from '@capacitor/core'

export const PRIVACY_POLICY_URL = '/privacy.html'
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

// A plain <a target="_blank"> inside the iOS WebView loads the page over the app itself,
// leaving no way back to the SPA. Capacitor's Browser opens a real in-app browser with a
// close button instead, which is what App Review expects of the privacy policy link.
export const openLegalLink = async (url) => {
  const absolute = url.startsWith('http') ? url : new URL(url, window.location.origin).href
  if (!Capacitor.isNativePlatform()) {
    window.open(absolute, '_blank', 'noopener')
    return
  }
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: absolute, presentationStyle: 'popover' })
}
