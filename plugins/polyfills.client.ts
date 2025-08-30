import { Buffer } from 'buffer'

export default defineNuxtPlugin(() => {
  // Minimal polyfills for browser compatibility
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.Buffer = window.Buffer || Buffer
    // @ts-ignore
    window.global = window.global || window
    // @ts-ignore
    window.process = window.process || { env: {}, browser: true }
  }
})