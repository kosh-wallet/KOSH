<template>
  <div v-if="show" @click.self="closeModal"
      class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
      <div class="relative w-full max-w-2xl max-h-full">
          <!-- Modal content -->
          <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <!-- Modal header -->
              <div class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
                  <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                      RPC Settings
                  </h3>
                  <button type="button" @click="closeModal"
                      class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white">
                      <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clip-rule="evenodd"></path>
                      </svg>
                      <span class="sr-only">Close modal</span>
                  </button>
              </div>
              <!-- Modal body -->
              <div class="p-6 space-y-6">
                  <!-- PIN Security Settings -->
                  <div class="border-b border-gray-200 dark:border-gray-600 pb-6 mb-6">
                      <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          PIN Security
                      </h4>
                      <div class="space-y-4">
                          <div class="flex items-center justify-between">
                              <div>
                                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      PIN Protection
                                  </label>
                                  <p class="text-xs text-gray-500 dark:text-gray-400">
                                      {{ securityStore.isPinSet ? 'PIN установлен и активен' : 'PIN не установлен' }}
                                  </p>
                              </div>
                              <button 
                                  @click="securityStore.isPinSet ? showChangePinModal = true : showSetPinModal = true"
                                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700"
                              >
                                    {{ securityStore.isPinSet ? 'Change PIN' : 'Set PIN' }}
                              </button>
                          </div>
                          
                          <div v-if="securityStore.isPinSet" class="flex items-center justify-between">
                              <div>
                                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Remove PIN
                                  </label>
                                  <p class="text-xs text-gray-500 dark:text-gray-400">
                                      Disable PIN protection (not recommended)
                                  </p>
                              </div>
                              <button 
                                  @click="showRemovePinModal = true"
                                  class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:ring-4 focus:ring-red-300"
                              >
                                  Remove PIN
                              </button>
                          </div>
                      </div>
                  </div>

                  <div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Configure RPC endpoints for each blockchain network. Changes will be applied immediately.
                  </div>
                  
                  <!-- TRON RPC Settings -->
                  <div class="space-y-2">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          TRON (TRC20) RPC Endpoint
                      </label>
                      <input 
                          v-model="localSettings.tron"
                          type="url"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
                          placeholder="https://api.trongrid.io"
                      />
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                          Default: https://api.trongrid.io
                      </p>
                  </div>

                  <!-- Ethereum RPC Settings -->
                  <div class="space-y-2">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Ethereum (ERC20) RPC Endpoint
                      </label>
                      <input 
                          v-model="localSettings.ethereum"
                          type="url"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
                          placeholder="https://eth-mainnet.public.blastapi.io/"
                      />
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                          Default: https://eth-mainnet.public.blastapi.io/
                      </p>
                  </div>

                  <!-- BSC RPC Settings -->
                  <div class="space-y-2">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          BSC (BEP20) RPC Endpoint
                      </label>
                      <input 
                          v-model="localSettings.bsc"
                          type="url"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
                          placeholder="https://bsc-rpc.publicnode.com"
                      />
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                          Default: https://bsc-rpc.publicnode.com
                      </p>
                  </div>

                  <!-- Bitcoin RPC Settings -->
                  <div class="space-y-2">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Bitcoin RPC Endpoint
                      </label>
                      <input 
                          v-model="localSettings.bitcoin"
                          type="url"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400"
                          placeholder="https://bitcoin-rpc.publicnode.com"
                      />
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                          Default: https://bitcoin-rpc.publicnode.com
                      </p>
                  </div>

                  <!-- Connection Status -->
                  <div v-if="connectionStatus" class="mt-4 p-3 rounded-lg" 
                       :class="connectionStatus.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'">
                      <div class="flex items-center">
                          <svg v-if="connectionStatus.success" class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                          </svg>
                          <svg v-else class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                          <span class="text-sm font-medium">{{ connectionStatus.message }}</span>
                      </div>
                  </div>
              </div>
              <!-- Modal footer -->
              <div class="flex items-center justify-between p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
                  <button @click="resetToDefaults" type="button"
                      class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                      Reset to Defaults
                  </button>
                  <div class="flex space-x-2">
                      <button @click="testConnection" type="button" :disabled="isTesting"
                          class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed">
                          <span v-if="isTesting" class="flex items-center">
                              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Testing...
                          </span>
                          <span v-else>Test Connection</span>
                      </button>
                      <button @click="saveSettings" type="button"
                          class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                          Save Settings
                      </button>
                  </div>
              </div>
          </div>
      </div>
  </div>

  <!-- PIN Setup Modal -->
  <div v-if="showSetPinModal" @click.self="showSetPinModal = false"
      class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
      <div class="relative w-full max-w-md max-h-full">
          <div class="relative bg-white rounded-lg shadow dark:bg-gray-700 p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Set PIN
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  PIN will be requested when opening the application
              </p>
              <PinLock @pin-set="handlePinSet" />
          </div>
      </div>
  </div>

  <!-- Change PIN Modal -->
  <div v-if="showChangePinModal" @click.self="showChangePinModal = false"
      class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
      <div class="relative w-full max-w-md max-h-full">
          <div class="relative bg-white rounded-lg shadow dark:bg-gray-700 p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Change PIN
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Enter new 6-digit PIN
              </p>
              <PinLock @pin-set="handlePinChange" />
          </div>
      </div>
  </div>

  <!-- Remove PIN Confirmation Modal -->
  <div v-if="showRemovePinModal" @click.self="showRemovePinModal = false"
      class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
      <div class="relative w-full max-w-md max-h-full">
          <div class="relative bg-white rounded-lg shadow dark:bg-gray-700 p-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Remove PIN
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to disable PIN protection? This will reduce the security of the application.
              </p>
              <div class="flex space-x-4">
                  <button @click="handleRemovePin"
                      class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">
                      Yes, remove
                  </button>
                  <button @click="showRemovePinModal = false"
                      class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                      Cancel
                  </button>
              </div>
          </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { useSecurityStore } from '~/stores/security'

interface Props {
    show?: boolean
}

interface RPCSettings {
    tron: string
    ethereum: string
    bsc: string
    bitcoin: string
}

interface ConnectionStatus {
    success: boolean
    message: string
}

const props = withDefaults(defineProps<Props>(), {
    show: false
})

const emit = defineEmits<{
    'close': []
    'settings-updated': [settings: RPCSettings]
}>()

const securityStore = useSecurityStore()

// PIN modals state
const showSetPinModal = ref(false)
const showChangePinModal = ref(false) 
const showRemovePinModal = ref(false)

// Default RPC endpoints
const defaultSettings: RPCSettings = {
    tron: 'https://api.trongrid.io',
    ethereum: 'https://eth-mainnet.public.blastapi.io/',
    bsc: 'https://bsc-rpc.publicnode.com',
    bitcoin: 'https://bitcoin-rpc.publicnode.com'
}

// Local settings state
const localSettings = ref<RPCSettings>({ ...defaultSettings })
const connectionStatus = ref<ConnectionStatus | null>(null)
const isTesting = ref(false)

// Load settings from localStorage on mount
onMounted(() => {
    loadSettings()
})

// Watch for show prop changes to reset local state
watch(() => props.show, (newShow) => {
    if (newShow) {
        loadSettings()
        connectionStatus.value = null
    }
})

const loadSettings = () => {
    try {
        const saved = localStorage.getItem('kosh_rpc_settings')
        if (saved) {
            const parsed = JSON.parse(saved)
            localSettings.value = { ...defaultSettings, ...parsed }
        } else {
            localSettings.value = { ...defaultSettings }
        }
    } catch (error) {
        console.error('Failed to load RPC settings:', error)
        localSettings.value = { ...defaultSettings }
    }
}

const saveSettings = () => {
    try {
        // Validate URLs
        const urlValidation = validateUrls()
        if (!urlValidation.valid) {
            connectionStatus.value = {
                success: false,
                message: urlValidation.message
            }
            return
        }

        localStorage.setItem('kosh_rpc_settings', JSON.stringify(localSettings.value))
        emit('settings-updated', { ...localSettings.value })
        connectionStatus.value = {
            success: true,
            message: 'Settings saved successfully!'
        }
        
        // Auto-close after success
        setTimeout(() => {
            closeModal()
        }, 1500)
    } catch (error) {
        connectionStatus.value = {
            success: false,
            message: 'Failed to save settings'
        }
    }
}

const resetToDefaults = () => {
    localSettings.value = { ...defaultSettings }
    connectionStatus.value = null
}

const validateUrls = () => {
    for (const [network, url] of Object.entries(localSettings.value)) {
        if (!url.trim()) {
            return { valid: false, message: `${network.toUpperCase()} RPC URL cannot be empty` }
        }
        
        try {
            new URL(url)
        } catch (error) {
            return { valid: false, message: `Invalid ${network.toUpperCase()} RPC URL format` }
        }
    }
    return { valid: true, message: '' }
}

const testConnection = async () => {
    isTesting.value = true
    connectionStatus.value = null
    
    try {
        // Validate URLs first
        const urlValidation = validateUrls()
        if (!urlValidation.valid) {
            connectionStatus.value = {
                success: false,
                message: urlValidation.message
            }
            return
        }

        // Test each RPC endpoint
        const results = await Promise.allSettled([
            testRpcEndpoint(localSettings.value.tron, 'TRON'),
            testRpcEndpoint(localSettings.value.ethereum, 'Ethereum'),
            testRpcEndpoint(localSettings.value.bsc, 'BSC'),
            testRpcEndpoint(localSettings.value.bitcoin, 'Bitcoin')
        ])

        const failures = results.filter(result => result.status === 'rejected')
        
        if (failures.length === 0) {
            connectionStatus.value = {
                success: true,
                message: 'All RPC endpoints are responding correctly!'
            }
        } else {
            connectionStatus.value = {
                success: false,
                message: `${failures.length} endpoint(s) failed to respond. Check console for details.`
            }
        }
    } catch (error) {
        connectionStatus.value = {
            success: false,
            message: 'Connection test failed. Please check your URLs.'
        }
    } finally {
        isTesting.value = false
    }
}

const testRpcEndpoint = async (url: string, network: string): Promise<void> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
        let response: Response
        
        if (network === 'TRON') {
            // TRON uses specific endpoints with POST method
            const testUrl = url.endsWith('/') ? url + 'wallet/getnowblock' : url + '/wallet/getnowblock'
            
            response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: '', // Empty body for getnowblock
                signal: controller.signal
            })
        } else if (network === 'Bitcoin') {
            // Bitcoin uses JSON-RPC - test with getblockchaininfo
            const testPayload = {
                jsonrpc: '2.0',
                method: 'getblockchaininfo',
                params: [],
                id: 1
            }
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload),
                signal: controller.signal
            })
        } else {
            // Ethereum and BSC use standard JSON-RPC
            const testPayload = {
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            }
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload),
                signal: controller.signal
            })
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // All APIs now return JSON
        const data = await response.json()
        
        if (network === 'TRON') {
            // TRON returns block data directly, check if we have blockID
            if (!data.blockID && !data.block_header) {
                throw new Error(`TRON RPC Error: Invalid response format`)
            }
        } else if (network === 'Bitcoin') {
            // Bitcoin JSON-RPC returns blockchain info
            if (data.error) {
                throw new Error(`Bitcoin RPC Error: ${data.error.message}`)
            }
            if (!data.result || !data.result.chain) {
                throw new Error(`Bitcoin RPC Error: Invalid blockchain info response`)
            }
        } else {
            // Ethereum/BSC JSON-RPC error handling
            if (data.error) {
                throw new Error(`RPC Error: ${data.error.message}`)
            }
        }

        console.log(`${network} RPC test successful:`, data)
    } catch (error) {
        console.error(`${network} RPC test failed:`, error)
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

// Обработчики PIN
const handlePinSet = (pin: string) => {
    try {
        securityStore.setPIN(pin)
        showSetPinModal.value = false
        connectionStatus.value = {
            success: true,
            message: 'PIN успешно установлен!'
        }
    } catch (error) {
        connectionStatus.value = {
            success: false,
            message: 'Ошибка установки PIN'
        }
    }
}

const handlePinChange = (newPin: string) => {
    try {
        securityStore.setPIN(newPin)
        showChangePinModal.value = false
        connectionStatus.value = {
            success: true,
            message: 'PIN успешно изменен!'
        }
    } catch (error) {
        connectionStatus.value = {
            success: false,
            message: 'Ошибка изменения PIN'
        }
    }
}

const handleRemovePin = () => {
    try {
        securityStore.resetPIN()
        showRemovePinModal.value = false
        connectionStatus.value = {
            success: true,
            message: 'PIN удален. Перезапустите приложение.'
        }
    } catch (error) {
        connectionStatus.value = {
            success: false,
            message: 'Ошибка удаления PIN'
        }
    }
}

const closeModal = () => {
    emit('close')
}
</script>

<style scoped>
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>