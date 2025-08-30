<template>
    <!-- Modal backdrop -->
    <div 
        v-if="showModal" 
        class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        @click.self="closeModal"
    >
        <div class="relative w-full max-w-2xl bg-white rounded-lg shadow dark:bg-gray-700">
            <!-- Modal header -->
            <div class="flex items-start justify-between p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-xl font-semibold text-gray-900 lg:text-2xl dark:text-white">
                    Secure Your Recovery Phrase
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
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900 dark:border-yellow-700">
                    <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                        <strong>⚠️ Important:</strong> Write down these 12 words in order and store them safely. This single phrase recovers all your networks and addresses.
                    </p>
                    <p class="text-xs text-yellow-700 dark:text-yellow-300">
                        Network (current): {{ getNetworkDisplayName(network) }}
                    </p>
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p class="text-lg font-mono font-bold leading-relaxed text-gray-900 dark:text-gray-100 text-center break-words">
                        {{ seed }}
                    </p>
                </div>
                
                <form @submit.prevent="createWallet" class="space-y-4">
                    <div>
                        <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Create Wallet Password *
                        </label>
                        <input 
                            v-model="password"
                            type="password" 
                            id="password" 
                            placeholder="Enter a strong password"
                            autocomplete="new-password"
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
                    
                    <div class="flex items-center">
                        <input 
                            v-model="savedSeed" 
                            id="savedSeed" 
                            type="checkbox" 
                            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            required
                        />
                        <label for="savedSeed" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                            I have written down and safely stored my 12-word recovery phrase *
                        </label>
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
                    @click="createWallet"
                    :disabled="!canCreateWallet || isCreating"
                    type="button"
                    class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span v-if="isCreating" class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                    </span>
                    <span v-else>Create Wallet</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { validatePassword } from '~/composables/utils'
import type { NetworkType } from '~/stores/wallet'

interface Props {
    seed?: string | null
    network: NetworkType
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'seed-to-store': [password: string]
    'close': []
}>()

const getNetworkDisplayName = (network: NetworkType) => {
    switch (network) {
        case 'TRON': return 'TRON (TRC20)'
        case 'ETHEREUM': return 'Ethereum (ERC20)'
        case 'BSC': return 'Binance Smart Chain (BEP20)'
        default: return network
    }
}

const showModal = computed(() => !!props.seed)
const password = ref('')
const confirmPassword = ref('')
const savedSeed = ref(false)
const isCreating = ref(false)

const passwordValidation = computed(() => {
    if (!password.value) return null
    return validatePassword(password.value)
})

const canCreateWallet = computed(() => {
    return password.value && 
           confirmPassword.value && 
           password.value === confirmPassword.value &&
           passwordValidation.value?.isValid &&
           savedSeed.value
})

const createWallet = async () => {
    if (!canCreateWallet.value) return
    
    try {
        isCreating.value = true
        emit('seed-to-store', password.value)
        closeModal()
    } catch (error) {
        console.error('Failed to create wallet:', error)
    } finally {
        isCreating.value = false
    }
}

const closeModal = () => {
    password.value = ''
    confirmPassword.value = ''
    savedSeed.value = false
    emit('close')
}

// Handle escape key
onMounted(() => {
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && showModal.value) {
            closeModal()
        }
    }
    
    document.addEventListener('keydown', handleEscape)
    
    onUnmounted(() => {
        document.removeEventListener('keydown', handleEscape)
    })
})
</script>
