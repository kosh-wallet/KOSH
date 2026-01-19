import { Buffer } from 'buffer'

// Eager polyfill to ensure Buffer/global/process exist as early as possible in browser
if (typeof window !== 'undefined') {
  // @ts-ignore
  if (!globalThis.Buffer) globalThis.Buffer = Buffer
  // @ts-ignore
  if (!window.global) window.global = window
  // @ts-ignore
  if (!window.process) window.process = { env: {}, browser: true }
}

export default defineNuxtPlugin(() => {
  // No-op: polyfill is applied at module evaluation time to support static hosting
})