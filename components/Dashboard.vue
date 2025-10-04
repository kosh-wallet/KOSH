<script setup lang="ts">
import * as FileSaver from 'file-saver'
const { saveAs } = FileSaver
import { useWalletStore } from '~/stores/wallet'
import { useSecurityStore } from '~/stores/security'
import { CryptoService } from '~/services/crypto'
import type { NetworkType } from '~/stores/wallet'

const { $checkBalance } = useNuxtApp()
const walletStore = useWalletStore()
const securityStore = useSecurityStore()

const isLoading = ref(false)
const error = ref<string | null>(null)
const seed = ref<string | null>(null)
const showPassword = ref(false)
const showSeedModal = ref(false)
const passwordModal = ref()
const selectedNetwork = ref<NetworkType>('TRON')
const showSettings = ref(false)

// PIN модалы для бэкапов
const showPinBackupModal = ref(false)
const pinBackupMode = ref<'export' | 'import'>('export')
const pendingImportFile = ref<string | Uint8Array | null>(null)

// Initialize wallet store
onMounted(async () => {
  await walletStore.loadWallets()
  
  if (!walletStore.hasWallets) {
    try {
      // First run: generate a single master mnemonic and ask user to save it
      seed.value = await CryptoService.generateSecureMnemonic()
    } catch (err) {
      error.value = 'Failed to generate secure seed'
    }
  } else {
    // Load balances for existing wallets with rate limiting
    walletStore.getAllWallets.forEach((wallet, index) => {
      setTimeout(async () => {
        try {
          const balance = await walletStore.fetchBalance(wallet.address, wallet.network)
          walletStore.updateBalance(wallet.address, balance)
        } catch (err) {
          console.error(`Failed to load balance for ${wallet.address} on ${wallet.network}:`, err)
        }
      }, index * 1200) // 1.2 second delay between requests
    })
  }
})

// Create new wallet with secure practices
const seedToStore = async (password: string, network?: NetworkType) => {
  if (!seed.value) {
    error.value = 'No seed available'
    return
  }

  try {
    isLoading.value = true
    error.value = null
    
    // Create the master wallet using the generated mnemonic once
    await walletStore.createWallet(password, network || selectedNetwork.value, seed.value)
    
    // Clear sensitive data
    CryptoService.secureCleanup(seed.value)
    seed.value = null
    showSeedModal.value = false
    
    // Load balance for new wallet
    const allWallets = walletStore.getAllWallets
    const newWallet = allWallets[allWallets.length - 1]
    if (newWallet) {
      const balance = await walletStore.fetchBalance(newWallet.address, newWallet.network)
      walletStore.updateBalance(newWallet.address, balance)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create wallet'
  } finally {
    isLoading.value = false
  }
}

// Add new address with proper validation
const addAddress = async (password: string, network?: NetworkType) => {
  try {
    isLoading.value = true
    error.value = null
    
    await walletStore.addAddress(password, network || selectedNetwork.value)
    
    // Load balance for new address with proper error handling
    const allWallets = walletStore.getAllWallets
    const newWallet = allWallets[allWallets.length - 1]
    if (newWallet && newWallet.address) {
      setTimeout(async () => {
        try {
          const balance = await walletStore.fetchBalance(newWallet.address, newWallet.network)
          if (balance) {
            walletStore.updateBalance(newWallet.address, balance)
          }
        } catch (err) {
          console.error('Failed to load balance for new address:', err)
          // Set default balance if balance check fails
          const emptyBalance: any = { 
            address: newWallet.address, 
            network: newWallet.network,
            USDT: 0, 
            native: 0
          }
          walletStore.updateBalance(newWallet.address, emptyBalance)
        }
      }, 1200) // Increased delay to avoid rate limiting
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add address'
  } finally {
    isLoading.value = false
  }
}

// Get balance with error handling
const getBalance = async (address: string, network?: NetworkType) => {
  try {
    const wallet = walletStore.getWalletByAddress(address)
    const targetNetwork = network || wallet?.network || 'TRON'
    await walletStore.fetchBalance(address, targetNetwork)
  } catch (err) {
    console.error(`Failed to get balance for ${address}:`, err)
  }
}

// Handle add address button click
const handleAddAddress = () => {
  if (passwordModal.value) {
    passwordModal.value.show()
  }
}

// Handle password input
const getPassword = async (password: string, network: NetworkType) => {
  await addAddress(password, network)
}

// Handle create wallet button click from menu
const handleCreateWallet = async () => {
  try {
    // If a wallet already exists, just open add-address password modal
    if (walletStore.hasWallets) {
      if (passwordModal.value) passwordModal.value.show()
      return
    }
    // Otherwise generate seed for first-time setup
    seed.value = await CryptoService.generateSecureMnemonic()
    // Reset selected network to default
    selectedNetwork.value = 'TRON'
    // This will trigger the CreateWallet component to show since there's a seed
  } catch (err) {
    error.value = 'Failed to generate secure seed for new wallet'
  }
}

// Handle settings modal
const handleOpenSettings = () => {
  showSettings.value = true
}

const handleCloseSettings = () => {
  showSettings.value = false
}

const handleSettingsUpdated = (settings: any) => {
  // Refresh service providers when settings are updated
  try {
    walletStore.getNetworkService('ETHEREUM')
    walletStore.getNetworkService('BSC')
    walletStore.getNetworkService('BITCOIN')
    // TRON will be refreshed when next accessed through the updated plugin
    console.log('RPC settings updated successfully')
  } catch (err) {
    console.error('Failed to update service providers:', err)
  }
}

// Export wallet backup securely
const saveToFile = () => {
  // Если PIN установлен, запрашиваем его для обфускации
  if (securityStore.isPinSet) {
    pinBackupMode.value = 'export'
    showPinBackupModal.value = true
  } else {
    // Обычный экспорт без обфускации
    performExport()
  }
}

// Выполнение экспорта
const performExport = async (pin?: string) => {
  try {
    const backupResult = await walletStore.exportBackup(pin)
    
    let blob: Blob
    if (backupResult.isObfuscated) {
      // Бинарные данные для обфусцированного файла
      blob = new Blob([backupResult.data], { type: 'application/octet-stream' })
    } else {
      // Обычный JSON файл
      blob = new Blob([backupResult.data], { type: 'application/json;charset=utf-8' })
    }
    
    saveAs(blob, backupResult.filename)
  } catch (err) {
    error.value = 'Failed to export backup'
  }
}

// Open file dialog
const openFile = () => {
  if (process.client) {
    const fileInput = document.getElementById('fileloader') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }
}

// Restore from backup with validation
const restoreFromFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  try {
    // Определяем тип файла по расширению
    const isObfuscated = file.name.endsWith('.dat') || file.name.endsWith('.bin')
    
    let fileData: string | Uint8Array
    if (isObfuscated) {
      // Читаем как бинарные данные
      const arrayBuffer = await file.arrayBuffer()
      fileData = new Uint8Array(arrayBuffer)
    } else {
      // Читаем как текст
      fileData = await file.text()
    }
    
    // Если PIN установлен, запрашиваем его для деобфускации
    if (securityStore.isPinSet) {
      pendingImportFile.value = fileData
      pinBackupMode.value = 'import'
      showPinBackupModal.value = true
    } else {
      // Обычный импорт без деобфускации
      await performImport(fileData)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to read backup file'
  } finally {
    // Clear file input
    target.value = ''
  }
}

// Выполнение импорта
const performImport = async (backupData: string | Uint8Array, pin?: string) => {
  try {
    isLoading.value = true
    error.value = null
    
    await walletStore.importBackup(backupData, pin)
    
    // Load balances for restored wallets
    walletStore.getAllWallets.forEach((wallet, index) => {
      setTimeout(async () => {
        try {
          const balance = await walletStore.fetchBalance(wallet.address, wallet.network || 'TRON')
          walletStore.updateBalance(wallet.address, balance)
        } catch (err) {
          console.error(`Failed to load balance for ${wallet.address} on ${wallet.network}:`, err)
        }
      }, index * 1200)
    })

    // Reload page if there are wallets present after import
    if (walletStore.hasWallets && process.client) {
      setTimeout(() => {
        window.location.reload()
      }, 1000) // Small delay to ensure UI updates are complete
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to restore backup'
  } finally {
    isLoading.value = false
  }
}

// Computed properties for reactive data
const wallets = computed(() => walletStore.getAllWallets)
const balances = computed(() => walletStore.balances)
const hasWallets = computed(() => walletStore.hasWallets)
const storeError = computed(() => walletStore.error)

// Watch for store errors
watch(storeError, (newError) => {
  if (newError) {
    error.value = newError
  }
})

// Обработчики PIN модала для бэкапов
const handlePinEntered = async (pin: string) => {
  showPinBackupModal.value = false
  
  if (pinBackupMode.value === 'export') {
    // Выполняем экспорт с PIN
    performExport(pin)
  } else if (pinBackupMode.value === 'import' && pendingImportFile.value) {
    // Выполняем импорт с PIN
    await performImport(pendingImportFile.value, pin)
    pendingImportFile.value = null
  }
}

const handlePinBackupClose = () => {
  showPinBackupModal.value = false
  pendingImportFile.value = null
}

// Cleanup on unmount
onUnmounted(() => {
  if (seed.value) {
    CryptoService.secureCleanup(seed.value)
  }
})
</script>


<template>
  <div class="p-5 pt-8 overflow-y-auto scrollbar-hide h-full rounded-lg">
    <!-- Hidden file input -->
    <input 
      id="fileloader" 
      type="file" 
      accept=".json,.dat,.bin" 
      @change="restoreFromFile"
      class="hidden"
    >
    
    <!-- Error display -->
    <div v-if="error || storeError" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      <p class="font-medium">Error:</p>
      <p>{{ error || storeError }}</p>
      <button 
        @click="error = null; walletStore.error = null" 
        class="mt-2 text-sm underline hover:no-underline"
      >
        Dismiss
      </button>
    </div>
    
    <!-- Loading indicator -->
    <div v-if="isLoading || walletStore.isLoading" class="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
        <span>Loading...</span>
      </div>
    </div>
    
    <!-- Main content -->
    <Address 
      v-if="hasWallets && !seed" 
      :wallets="wallets" 
      :balances="balances" 
      @check-balance="getBalance"
      @add-address="handleAddAddress"
    />
    
    <CreateWallet 
      v-if="seed && !showSeedModal" 
      :seed="seed" 
      @show-seed-modal="(network) => { selectedNetwork = network; showSeedModal = true }"
    />
    
    <!-- Modals -->
    <Seed 
      v-if="showSeedModal && seed" 
      :seed="seed" 
      :network="selectedNetwork"
      @seed-to-store="(password) => seedToStore(password, selectedNetwork)" 
      @close="showSeedModal = false"
    />
    
    <Password 
      ref="passwordModal"
      @get-password="getPassword" 
    />
    
    <!-- Settings Modal -->
    <Settings 
      :show="showSettings"
      @close="handleCloseSettings"
      @settings-updated="handleSettingsUpdated"
    />
    
    <!-- PIN Backup Modal -->
    <PinBackup 
      :show="showPinBackupModal"
      :mode="pinBackupMode"
      @pin-entered="handlePinEntered"
      @close="handlePinBackupClose"
    />
    
    <!-- Menu -->
    <Menu 
      @save-to-file="saveToFile" 
      @add-address="handleAddAddress" 
      @open-file="openFile" 
      @backup-to-file="saveToFile"
      @create-wallet="handleCreateWallet"
      @open-settings="handleOpenSettings"
    />
  </div>
</template>

<style scoped>
.hidden {
  display: none;
}

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