/* eslint-disable camelcase */
import mixpanel from 'mixpanel-browser'

let isInitialized = false

function initMixpanel() {
  if (isInitialized) {
    return
  }

  mixpanel.init('5800e2b9e077ccdaf4cadb637f919c14', {
    track_pageview: true,
    autocapture: true,
    record_sessions_percent: 30,
    record_heatmap_data: true,
    debug: process.env.NODE_ENV === 'development',
    persistence: 'localStorage',
    api_host: 'https://api-eu.mixpanel.com'
  })

  isInitialized = true
}

function track(...args: Parameters<typeof mixpanel.track>) {
  if (!isInitialized) {
    return
  }

  mixpanel.track(...args)
}

function identify(...args: Parameters<typeof mixpanel.identify>) {
  if (!isInitialized) {
    return
  }

  mixpanel.identify(...args)
}

function peopleSet(...args: Parameters<typeof mixpanel.people.set>) {
  if (!isInitialized) {
    return
  }

  mixpanel.people.set(...args)
}

function deleteMixpanelUser() {
  if (!isInitialized) {
    return
  }

  mixpanel.people.delete_user()
  mixpanel.reset()
}

export { deleteMixpanelUser, identify, initMixpanel, peopleSet, track }
