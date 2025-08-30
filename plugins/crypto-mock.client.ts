// plugins/crypto-mock.client.ts
// NOTE: Security hardening - disable crypto mock to avoid weakening primitives
export default defineNuxtPlugin({
  name: 'crypto-mock-disabled',
  enforce: 'pre',
  setup() {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[Security] crypto-mock plugin disabled')
    }
  }
})