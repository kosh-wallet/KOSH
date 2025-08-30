<template>
    <!-- Modal backdrop -->
    <div 
        v-if="showModal" 
        class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
        @click.self="closeModal"
    >
        <div class="relative w-full max-w-md bg-white rounded-lg shadow dark:bg-gray-700">
            <!-- Modal header -->
            <div class="flex items-start justify-between p-5 border-b rounded-t dark:border-gray-600">
                <h3 class="text-xl font-semibold text-gray-900 lg:text-2xl dark:text-white">
                    Add New Address
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
            <div class="p-6 space-y-4">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    Choose network and enter your wallet password to add a new address.
                </p>
                
                <form @submit.prevent="sendPassword" class="space-y-4">
                    <!-- Network Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select Network
                        </label>
                        <select 
                            v-model="selectedNetwork"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        >
                            <option value="TRON">TRON (TRC20)</option>
                            <option value="ETHEREUM">Ethereum (ERC20)</option>
                            <option value="BSC">Binance Smart Chain (BEP20)</option>
                            <option value="BITCOIN">Bitcoin (BTC)</option>
                        </select>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Network for the new address
                        </p>
                    </div>
                    
                    <div>
                        <label for="passwordinput" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Wallet Password
                        </label>
                        <input 
                            v-model="password"
                            ref="passwordInput"
                            type="password" 
                            id="passwordinput"
                            placeholder="Enter your password"
                            autocomplete="current-password"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                            required 
                            @keyup.enter="sendPassword"
                        />
                        
                        <div v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">
                            {{ error }}
                        </div>
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
                    @click="sendPassword"
                    :disabled="!password || isProcessing"
                    type="button"
                    class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span v-if="isProcessing" class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </span>
                    <span v-else>Add {{ selectedNetwork }} Address</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NetworkType } from '~/stores/wallet'

interface Props {
    show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    show: false
})

const emit = defineEmits<{
    'get-password': [password: string, network: NetworkType]
    'close': []
}>()

const showModal = ref(false)
const password = ref('')
const selectedNetwork = ref<NetworkType>('TRON')
const error = ref('')
const isProcessing = ref(false)
const passwordInput = ref<HTMLInputElement>()

// Watch for external show prop (for future use)
watch(() => props.show, (newShow) => {
    if (newShow) {
        showModal.value = true
        nextTick(() => {
            passwordInput.value?.focus()
        })
    }
})

// Expose method to show modal
const show = () => {
    showModal.value = true
    error.value = ''
    nextTick(() => {
        passwordInput.value?.focus()
    })
}

const sendPassword = async () => {
    if (!password.value) return
    
    try {
        isProcessing.value = true
        error.value = ''
        
        emit('get-password', password.value, selectedNetwork.value)
        closeModal()
    } catch (err) {
        error.value = 'Failed to process password'
    } finally {
        isProcessing.value = false
    }
}

const closeModal = () => {
    showModal.value = false
    password.value = ''
    selectedNetwork.value = 'TRON'
    error.value = ''
    emit('close')
}

// Handle escape key
const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showModal.value) {
        closeModal()
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
})

// Expose show method for parent components
defineExpose({
    show
})
</script>
