// plugins/noble-hashes-fix.client.ts
// NOTE: Security hardening - disable unsafe noble polyfills
export default defineNuxtPlugin({
  name: 'noble-hashes-fix-disabled',
  enforce: 'pre',
  setup() {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[Security] noble-hashes-fix plugin disabled')
    }
  }
})