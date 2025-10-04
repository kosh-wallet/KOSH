import { Buffer } from 'buffer'

export default defineNuxtPlugin((nuxtApp) => {
  // Only set Buffer on client side to avoid SSR issues
  if (process.client) {
    globalThis.Buffer = Buffer
  }
})