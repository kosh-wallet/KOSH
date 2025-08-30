<template>
    <div class="flex items-center justify-center min-h-screen p-4">
        <div class="relative self-center block max-w-lg p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 w-full">
            <h5 class="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                Welcome to KOSH Wallet
            </h5>
            <p class="font-normal text-gray-700 dark:text-gray-400 mb-6 text-center">
                Create your secure multi-chain wallet. You'll receive a 12-word mnemonic phrase that you must keep safe.
            </p>
            
            <!-- Network Selection -->
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Network
                </label>
                <select 
                    v-model="selectedNetwork"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="TRON">TRON (TRC20)</option>
                    <option value="ETHEREUM">Ethereum (ERC20)</option>
                    <option value="BSC">Binance Smart Chain (BEP20)</option>
                    <option value="BITCOIN">Bitcoin (BTC)</option>
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose the blockchain network for your wallet
                </p>
            </div>
            
            <div class="text-center">
                <button 
                    @click="showSeedModal"
                    :disabled="!seed || isLoading"
                    class="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span v-if="isLoading" class="flex items-center justify-center">
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </span>
                    <span v-else>Create {{ selectedNetwork }} Wallet</span>
                </button>
            </div>
            
            <div v-if="!seed" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-sm text-yellow-800 text-center">
                    <strong>Note:</strong> Generating secure random seed phrase...
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NetworkType } from '~/stores/wallet'

interface Props {
    seed?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'show-seed-modal': [network: NetworkType]
}>()

const isLoading = ref(false)
const selectedNetwork = ref<NetworkType>('TRON')

const showSeedModal = () => {
    if (props.seed) {
        emit('show-seed-modal', selectedNetwork.value)
    }
}
</script>