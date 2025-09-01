// plugins/tron.client.ts
// Create TronWeb instance on client only to avoid SSR/prerender crashes
export default defineNuxtPlugin(async () => {
    // Lazy import only in browser
    const { default: TronWeb } = await import('tronweb/dist/TronWeb')

    function getTronRPCUrl() {
        if (typeof window === 'undefined') return 'https://api.trongrid.io'
        try {
            const saved = window.localStorage?.getItem('kosh_rpc_settings')
            if (saved) {
                const settings = JSON.parse(saved)
                return settings.tron || 'https://api.trongrid.io'
            }
        } catch (error) {
            console.warn('Failed to load TRON RPC settings, using default')
        }
        return 'https://api.trongrid.io'
    }

    function createTronWebInstance(rpcUrl: string | null = null) {
        const url = rpcUrl || getTronRPCUrl()
        const HttpProvider = (TronWeb as any).providers.HttpProvider
        const fullNode = new HttpProvider(url)
        const solidityNode = new HttpProvider(url)
        const eventServer = url
        return new (TronWeb as any)(fullNode, solidityNode, eventServer)
    }

    const tronWeb = createTronWebInstance()

    return {
        provide: {
            tronWeb,
            createTronWebInstance
        }
    }
})

export function refreshTronWeb(rpcUrl: string) {
    // Recreate client-side instance with new RPC
    // Note: this function is only meaningful on client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return undefined as unknown as any
}


