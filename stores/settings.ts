import { defineStore } from 'pinia'

export interface RPCSettings {
  tron: string
  ethereum: string
  bsc: string
  bitcoin: string
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    rpcSettings: {
      tron: 'https://api.trongrid.io',
      ethereum: 'https://eth-mainnet.public.blastapi.io/',
      bsc: 'https://bsc-rpc.publicnode.com',
      bitcoin: 'https://blockstream.info/api'
    } as RPCSettings
  }),

  actions: {
    // Load settings from localStorage
    loadSettings() {
      try {
        const saved = localStorage.getItem('kosh_rpc_settings')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              this.rpcSettings = { ...this.rpcSettings, ...parsed }
            } else {
              // Remove invalid value to prevent future errors
              localStorage.removeItem('kosh_rpc_settings')
            }
          } catch (e) {
            console.error('Failed to parse RPC settings:', e)
            localStorage.removeItem('kosh_rpc_settings')
          }
        }
      } catch (error) {
        console.error('Failed to load RPC settings:', error)
      }
    },

    // Update RPC settings
    updateRPCSettings(settings: RPCSettings) {
      // Merge with current to keep defaults for missing keys
      const next: RPCSettings = { ...this.rpcSettings, ...(settings || {}) }
      this.rpcSettings = next
      try {
        localStorage.setItem('kosh_rpc_settings', JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save RPC settings:', error)
      }
    },

    // Get RPC endpoint for specific network
    getRPCEndpoint(network: 'tron' | 'ethereum' | 'bsc' | 'bitcoin'): string {
      const val = this.rpcSettings?.[network]
      if (typeof val === 'string' && val) return val
      switch (network) {
        case 'tron': return 'https://api.trongrid.io'
        case 'ethereum': return 'https://eth-mainnet.public.blastapi.io/'
        case 'bsc': return 'https://bsc-rpc.publicnode.com'
        case 'bitcoin': return 'https://blockstream.info/api'
        default: return ''
      }
    }
  }
})