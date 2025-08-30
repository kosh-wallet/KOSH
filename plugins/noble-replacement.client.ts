// plugins/noble-replacement.client.ts
// NOTE: Security hardening - disable unsafe noble stubs
// This plugin is intentionally a no-op to avoid overriding cryptographic primitives.
export default defineNuxtPlugin({
  name: 'noble-replacement-disabled',
  enforce: 'pre',
  setup() {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[Security] noble-replacement plugin disabled')
    }
  }
})