<template>
    <!-- Modal backdrop -->
    <div 
        v-if="show"
        class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        @click.self="closeModal"
    >
        <div class="relative w-full max-w-2xl bg-white rounded-lg shadow dark:bg-gray-700">
            <!-- Modal header -->
            <div class="flex items-start justify-between p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-xl font-semibold text-gray-900 lg:text-2xl dark:text-white">
                    Restore from Mnemonic
                </h3>
                <button 
                    @click="closeModal"
                    type="button"
                    class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd">
                        </path>
                    </svg>
                </button>
            </div>
            
            <!-- Modal body -->
            <div class="p-6 space-y-6">
                <div v-if="walletStore.hasWallets" class="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900 dark:border-red-700">
                    <p class="text-sm text-red-800 dark:text-red-200">
                        <strong>⚠️ Warning:</strong> Restoring from mnemonic will replace your existing wallet. Make sure you have a backup of your current wallet before proceeding.
                    </p>
                </div>
                
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900 dark:border-blue-700">
                    <p class="text-sm text-blue-800 dark:text-blue-200">
                        Enter your 12 or 24-word recovery phrase to restore your wallet. The phrase is used to derive addresses for all supported networks.
                    </p>
                </div>
                
                <!-- Network Selection -->
                <div>
                    <label for="network" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Network
                    </label>
                    <select 
                        id="network"
                        v-model="selectedNetwork"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    >
                        <option value="TRON">TRON (TRC20)</option>
                        <option value="ETHEREUM">Ethereum (ERC20)</option>
                        <option value="BSC">Binance Smart Chain (BEP20)</option>
                        <option value="BITCOIN">Bitcoin</option>
                    </select>
                </div>
                
                <!-- Mnemonic Input -->
                <div>
                    <label for="mnemonic" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        Recovery Phrase *
                    </label>
                    <textarea
                        id="mnemonic"
                        v-model="mnemonicInput"
                        rows="3"
                        placeholder="Enter your 12 or 24-word recovery phrase separated by spaces"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white font-mono"
                        required
                    ></textarea>
                    <p v-if="mnemonicError" class="mt-2 text-sm text-red-600 dark:text-red-400">
                        {{ mnemonicError }}
                    </p>
                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Words: {{ wordCount }}
                    </p>
                </div>
                
                <form @submit.prevent="restoreWallet" class="space-y-4" autocomplete="off">
                    <!-- Password -->
                    <div>
                        <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Wallet Password *
                        </label>
                        <input 
                            v-model="password"
                            type="password" 
                            id="password" 
                            placeholder="Enter a strong password"
                            autocomplete="off"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                            required 
                        />
                        <div v-if="passwordValidation && !passwordValidation.isValid" class="mt-2">
                            <p class="text-sm text-red-600 dark:text-red-400">Password requirements:</p>
                            <ul class="text-xs text-red-600 dark:text-red-400 ml-4 list-disc">
                                <li v-for="error in passwordValidation.errors" :key="error">{{ error }}</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Confirm Password -->
                    <div>
                        <label for="confirmPassword" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Confirm Password *
                        </label>
                        <input 
                            v-model="confirmPassword"
                            type="password" 
                            id="confirmPassword" 
                            placeholder="Confirm your password"
                            autocomplete="new-password"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                            required 
                        />
                        <p v-if="confirmPassword && password !== confirmPassword" class="mt-1 text-sm text-red-600 dark:text-red-400">
                            Passwords do not match
                        </p>
                    </div>
                </form>
            </div>

            <!-- Modal footer -->
            <div class="flex items-center justify-end p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
                <button 
                    @click="closeModal"
                    type="button"
                    class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
                >
                    Cancel
                </button>
                <button 
                    @click="restoreWallet"
                    :disabled="!canRestore || isRestoring"
                    type="button"
                    class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span v-if="isRestoring" class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Restoring...
                    </span>
                    <span v-else>Restore Wallet</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { validatePassword } from '~/composables/utils'
import { useWalletStore } from '~/stores/wallet'
import type { NetworkType } from '~/stores/wallet'

interface Props {
    show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'restore': [mnemonic: string, password: string, network: NetworkType]
    'close': []
}>()

const walletStore = useWalletStore()

const selectedNetwork = ref<NetworkType>('TRON')
const mnemonicInput = ref('')
const password = ref('')
const confirmPassword = ref('')
const isRestoring = ref(false)

const wordCount = computed(() => {
    if (!mnemonicInput.value.trim()) return 0
    return mnemonicInput.value.trim().split(/\s+/).filter(w => w.length > 0).length
})

const mnemonicError = computed(() => {
    if (!mnemonicInput.value.trim()) return null
    const words = wordCount.value
    if (words !== 12 && words !== 24) {
        return 'Mnemonic must be 12 or 24 words'
    }
    return null
})

const passwordValidation = computed(() => {
    if (!password.value) return null
    return validatePassword(password.value)
})

const canRestore = computed(() => {
    return mnemonicInput.value.trim() &&
           wordCount.value === 12 || wordCount.value === 24 &&
           password.value &&
           confirmPassword.value &&
           password.value === confirmPassword.value &&
           passwordValidation.value?.isValid
})

const restoreWallet = async () => {
    if (!canRestore.value) return
    
    try {
        isRestoring.value = true
        emit('restore', mnemonicInput.value.trim(), password.value, selectedNetwork.value)
        closeModal()
    } catch (error) {
        console.error('Failed to restore wallet:', error)
    } finally {
        isRestoring.value = false
    }
}

const closeModal = () => {
    // Reset form
    mnemonicInput.value = ''
    password.value = ''
    confirmPassword.value = ''
    selectedNetwork.value = 'TRON'
    emit('close')
}

// Handle escape key
onMounted(() => {
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && props.show) {
            closeModal()
        }
    }
    
    document.addEventListener('keydown', handleEscape)
    
    onUnmounted(() => {
        document.removeEventListener('keydown', handleEscape)
    })
})
</script>
