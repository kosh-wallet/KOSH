// middleware/ssr-guard.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // This middleware ensures that certain operations only happen on client side
  if (process.server) {
    // On server side, we can't access browser APIs
    // This is just a guard to prevent SSR issues
    return
  }
})
