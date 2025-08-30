<template>
    <div v-if="wallets" :key-refresh="wallets.values.length"
        class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 sm:grid-cols-2 gap-4 overflow-x-hidden">
        <div v-for="(wallet, idx) in wallets" :key="idx"
            @click="toggleExpanded(idx)"
            class="relative self-center block max-w-lg p-4 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 w-100 cursor-pointer transition-all duration-200"
            :class="[
                { 'ring-blue-500': expandedCard === idx }
            ]">

            <!-- Expand/Collapse indicator -->
            <div class="absolute bottom-2 right-2 text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': expandedCard === idx }">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
            <button @click.stop.prevent="checkBalance(wallet.address, wallet.network)"
                class="z-50 absolute top-1 right-1 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-transform duration-200"
                :class="{ 'animate-spin': loadingWallets[wallet.address] }">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                </svg>
            </button>

            <div class="absolute top-1 left-1" type="button">
                <div @click.stop.prevent="checkBalance(wallet.address, wallet.network)" :class="[
                    'text-lg font-medium mr-2 px-2.5 py-0.5 rounded',
                    getAddressElementStyles(wallet.network),
                    isNaN(balances[wallet.address]?.native) ? 'opacity-50' : ''
                ]">
                    {{ '...' + wallet.address.slice(-4) }}
                </div>
            </div>

            <div class="absolute top-10 left-2">
                <div :class="[
                    isEmptyWallet(wallet.address) ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-400'
                ]">
                    {{ getNativeCurrency(wallet.network) }} {{ balances[wallet.address]?.native || '0.00' }}
                </div>
            </div>

            <div class="relative left-20 bottom-4">
                <p :class="[
                    'font-normal',
                    isEmptyWallet(wallet.address) ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-300'
                ]">
                    <span class="text-sm">{{ wallet.network === 'BITCOIN' ? '' : 'USDT' }} </span><span class="text-3xl ml-2">{{ 
                            (wallet.network === 'BITCOIN' 
                                ? (balances[wallet.address]?.native || '0.00')
                                : ($stripExtraDecimals(balances[wallet.address]?.USDT) || '0.00')).split('.')[0]
                        }}</span><span class="text-sm">.{{
                            (wallet.network === 'BITCOIN' 
                                ? (balances[wallet.address]?.native || '0.00')
                                : ($stripExtraDecimals(balances[wallet.address]?.USDT) || '0.00')).split('.')[1] || '00'
                        }}</span>
                </p>
            </div>

            <!-- Action buttons - shown when expanded -->
            <div v-show="expandedCard === idx" class="mt-6 text-center transition-all duration-200">
                <button type="button"
                    @click.stop.prevent="openSendModal(wallet, balances[wallet.address])"
                    class="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 transition-all duration-200">
                    SEND
                </button>

                <button type="button"
                    @click.stop.prevent="openReceiveModal(wallet, balances[wallet.address])"
                    class="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 transition-all duration-200">
                    RECEIVE
                </button>
            </div>
        </div>


        <button @click="handleAddAddress" type="button"
            class="relative self-center block max-w-lg p-4 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 w-full cursor-pointer transition-colors">
            <div class="flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clip-rule="evenodd">
                    </path>
                </svg>
                <h5 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Add Address
                </h5>
            </div>
        </button>

        <!--modals to send and receive -->
        <Send :wallet="sendwallet" :show="showSendModal" @close="closeSendModal" />
        <Receive :wallet="sendwallet" :show="showReceiveModal" @close="closeReceiveModal" />
    </div>
</template>

<script setup lang="ts">
import type { NetworkType } from '~/stores/wallet'

interface Props {
    wallets: any[]
    balances: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'check-balance': [address: string, network?: NetworkType]
    'add-address': []
}>()

const { $stripExtraDecimals } = useNuxtApp()
const sendwallet = ref({})
const expandedCard = ref<number | null>(null)
const showSendModal = ref(false)
const showReceiveModal = ref(false)
const loadingWallets = ref<Record<string, boolean>>({})

const checkBalance = async (address: string, network: NetworkType) => {
    loadingWallets.value[address] = true
    try {
        emit('check-balance', address, network)
        // Emit event and wait for its processing
        await nextTick()
        // Add small delay for visual effect
        setTimeout(() => {
            loadingWallets.value[address] = false
        }, 1000)
    } catch (error) {
        loadingWallets.value[address] = false
    }
}

const toggleExpanded = (index: number) => {
    expandedCard.value = expandedCard.value === index ? null : index
}

const openSendModal = (wallet: any, balance: any) => {
    setWallet(wallet, balance)
    showSendModal.value = true
}

const openReceiveModal = (wallet: any, balance: any) => {
    setWallet(wallet, balance)
    showReceiveModal.value = true
}

const closeSendModal = () => {
    showSendModal.value = false
}

const closeReceiveModal = () => {
    showReceiveModal.value = false
}

const getNativeCurrency = (network?: NetworkType) => {
    switch (network) {
        case 'TRON': return 'TRX'
        case 'ETHEREUM': return 'ETH'
        case 'BSC': return 'BNB'
        case 'BITCOIN': return 'BTC'
        default: return 'TRX' // Default to TRX for backward compatibility
    }
}

const getAddressElementStyles = (network?: NetworkType) => {
    switch (network) {
        case 'TRON':
            return 'bg-red-500 text-white dark:bg-red-600'
        case 'ETHEREUM':
            return 'bg-blue-500 text-white dark:bg-blue-600'
        case 'BSC':
            return 'bg-yellow-500 text-white dark:bg-yellow-600'
        case 'BITCOIN':
            return 'bg-orange-500 text-white dark:bg-orange-600'
        default:
            // Default to TRON styling for backward compatibility
            return 'bg-red-500 text-white dark:bg-red-600'
    }
}

const isEmptyWallet = (address: string) => {
    const balance = props.balances[address]
    if (!balance) return true
    
    const nativeBalance = parseFloat(balance.native || '0')
    const usdtBalance = parseFloat(balance.USDT || '0')
    
    return nativeBalance === 0 && usdtBalance === 0
}

const setWallet = (wallet: any, balance: any) => {
    const walletCopy = { ...wallet }
    if (balance && balance.address) {
        const balanceCopy = { ...balance }
        delete balanceCopy.address
        walletCopy.balance = balanceCopy
    } else {
        walletCopy.balance = { ...balance }
    }
    sendwallet.value = walletCopy
}

const handleAddAddress = () => {
    emit('add-address')
}
</script>
