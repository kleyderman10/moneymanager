import { driver } from 'driver.js'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay, useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { TOURS } from '@/tours/definitions'

// Shared across every caller: only one tour can be on screen at a time.
let activeDriver = null
let activeTourId = null
let pendingTimer = null

// Lets the view render its data (and any skeletons turn into real cards) before anchoring.
const START_DELAY_MS = 700

// The same data-tour can exist twice (sidebar item and bottom-nav button); only the one that
// is actually on screen can be highlighted — the closed mobile drawer sits off-canvas.
const isOnScreen = (el) => {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth
}

export function useTour() {
  const { t } = useI18n()
  const route = useRoute()
  const { mobile } = useDisplay()
  const theme = useTheme()
  const authStore = useAuthStore()
  const billingStore = useSubscriptionStore()

  const resolveElement = (anchor) => {
    const name = typeof anchor === 'string' ? anchor : anchor?.[mobile.value ? 'mobile' : 'desktop']
    if (!name) return undefined
    return [...document.querySelectorAll(`[data-tour="${name}"]`)].find(isOnScreen)
  }

  const buildSteps = (id) => TOURS[id].steps
    .map((step) => ({ step, element: resolveElement(step.element) }))
    .filter(({ step, element }) => element || !step.optional)
    .map(({ step, element }) => ({
      element,
      popover: {
        title: t(`tour.${id}.${step.key}.title`),
        description: t(`tour.${id}.${step.key}.body`),
      },
    }))

  // driver.js renders its popover straight into <body>, outside the Vuetify theme scope, so
  // the current theme's colors are handed to it as CSS variables (see styles/tour.css).
  const applyTheme = (wrapper) => {
    // Colors the theme doesn't define (e.g. on-primary) keep the fallbacks from tour.css.
    const { colors } = theme.current.value
    const vars = {
      '--tour-surface': colors.surface,
      '--tour-on-surface': colors['on-surface'],
      '--tour-primary': colors.primary,
      '--tour-on-primary': colors['on-primary'],
    }
    Object.entries(vars).forEach(([name, value]) => {
      if (value) wrapper.style.setProperty(name, value)
    })
  }

  const addSkipButton = (popover, onSkip) => {
    if (activeDriver?.isLastStep()) return
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'tour-skip-btn'
    skip.textContent = t('tour.skip')
    skip.addEventListener('click', onSkip)
    popover.footer.prepend(skip)
  }

  const isActive = () => Boolean(activeDriver?.isActive())

  const startTour = (id, { force = false } = {}) => {
    if (!TOURS[id] || isActive()) return false
    // A tour scheduled for a screen the user has already left would anchor to nothing.
    if (TOURS[id].route !== route.name) return false
    if (!force && authStore.hasCompletedTour(id)) return false

    const steps = buildSteps(id)
    if (!steps.length) return false

    // Finishing, closing (✕ / Esc) and skipping all count as "seen": the tour doesn't nag
    // again, and it can always be replayed from the help menu or the help center. This runs
    // from onDestroyStarted rather than onDestroyed because driver.js skips onDestroyed when
    // the tour is closed before the first step finishes animating in.
    const finish = () => {
      if (!authStore.hasCompletedTour(id)) authStore.completeTour(id)
      activeTourId = null
      activeDriver?.destroy()
    }

    activeTourId = id
    activeDriver = driver({
      steps,
      showProgress: steps.length > 1,
      progressText: t('tour.progress', { current: '{{current}}', total: '{{total}}' }),
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      popoverClass: 'app-tour',
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 14,
      // Highlighted nav items must not navigate away mid-tour.
      disableActiveInteraction: true,
      onPopoverRender: (popover) => {
        applyTheme(popover.wrapper)
        addSkipButton(popover, finish)
      },
      onDestroyStarted: finish,
    })
    activeDriver.drive()
    return true
  }

  const scheduleTour = (id, options) => {
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => startTour(id, options), START_DELAY_MS)
  }

  // Tears the tour down without marking it as seen (e.g. the user navigated away with the
  // system back button), so it's offered again next time. destroy() bypasses onDestroyStarted.
  const stopTour = () => {
    if (!isActive()) return
    activeTourId = null
    activeDriver.destroy()
  }

  // Automatic first-visit start. Page tours wait for the welcome tour, so the first thing a
  // new user sees is the overview rather than whichever screen they happened to open.
  const canAutoStart = (id) => (
    Boolean(authStore.user)
    && !billingStore.requiresSubscription
    && !authStore.hasCompletedTour(id)
    && (id === 'welcome' || authStore.hasCompletedTour('welcome'))
  )

  const maybeStartTour = (id) => {
    if (canAutoStart(id)) scheduleTour(id)
  }

  return {
    startTour,
    scheduleTour,
    stopTour,
    maybeStartTour,
    isActive,
    activeTourRoute: () => (isActive() && activeTourId ? TOURS[activeTourId].route : null),
  }
}
