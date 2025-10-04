// plugins/client-init.client.ts
export default defineNuxtPlugin(async () => {
  // This plugin only runs on client side
  const { useSecurityStore } = await import('~/stores/security')
  const { useWalletStore } = await import('~/stores/wallet')
  
  const securityStore = useSecurityStore()
  const walletStore = useWalletStore()
  
  // Initialize stores only on client
  try {
    await securityStore.initialize()
    await walletStore.loadWallets()
  } catch (error) {
    console.error('Failed to initialize stores:', error)
  }
})
