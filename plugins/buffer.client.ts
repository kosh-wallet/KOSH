import { Buffer } from 'buffer'

export default defineNuxtPlugin(() => {
  // Make Buffer available globally for browser compatibility
  if (process.client && !globalThis.Buffer) {
    globalThis.Buffer = Buffer
  }
})