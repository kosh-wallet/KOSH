import TronWeb from 'tronweb'

// Helper function to get RPC URL (guarded for browser only)
function getTronRPCUrl() {
    if (typeof window === 'undefined' || !process.client) return 'https://api.trongrid.io'
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

// Helper function to create TronWeb instance
function createTronWebInstance(rpcUrl = null) {
    const url = rpcUrl || getTronRPCUrl()
    const HttpProvider = TronWeb.providers.HttpProvider
    const fullNode = new HttpProvider(url)
    const solidityNode = new HttpProvider(url)
    const eventServer = url

    return new TronWeb(fullNode, solidityNode, eventServer)
}

export default defineNuxtPlugin(() => {
    const tronWeb = createTronWebInstance()

    return {
        provide: {
            tronWeb,
            createTronWebInstance
        }
    }
})

// Refresh instance factory
export function refreshTronWeb(rpcUrl) {
    return createTronWebInstance(rpcUrl)
}
