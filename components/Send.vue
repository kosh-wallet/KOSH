<template>
    <!-- Modal toggle -->
    <!-- <button data-modal-target="send-modal" data-modal-toggle="send-modal"
        class="block text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        type="button">
        Toggle modal
    </button> -->

    <!-- Main modal -->
    <div v-if="show" id="send-modal" tabindex="-1" aria-hidden="false" @click.self="closeModal"
        class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
        <div class="relative w-full max-w-md max-h-full">
            <!-- Modal content -->
            <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <button type="button" @click="closeModal"
                    class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-800 dark:hover:text-white">
                    <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd"></path>
                    </svg>
                    <span class="sr-only">Close modal</span>
                </button>
                <div class="px-6 py-6 lg:px-8">

                    <h3 class="mb-4 text-md font-medium text-gray-900 dark:text-white">
                        From {{ wallet && wallet.address }} 
                        <span class="text-xs px-2 py-1 rounded ml-2" :class="{
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': wallet?.network === 'TRON',
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': wallet?.network === 'ETHEREUM',
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': wallet?.network === 'BSC',
                            'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200': wallet?.network === 'BITCOIN'
                        }">
                            {{ getNetworkDisplayName(wallet?.network) }}
                        </span>
                    </h3>

                    <form class="space-y-6" action="#" autocomplete="off" @submit.prevent="submit">




                        <!-- Asset selector - hidden for Bitcoin -->
                        <div v-if="wallet?.network !== 'BITCOIN'" class=" block w-full inline-flex rounded-md shadow-sm" role="group">
                            <button type="button" @click="setAsset('USDT')"
                                :class="{ [`z-10 ring-2 ring-blue-500`]: asset == 'USDT' }"
                                class="w-1/2 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white">
                                USDT
                            </button>
                            <button type="button" @click="setAsset(getNativeCurrency(wallet?.network))"
                                :class="{ [`z-10 ring-2 ring-blue-500`]: asset == getNativeCurrency(wallet?.network) }"
                                class="w-1/2 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white">
                                {{ getNativeCurrency(wallet?.network) }}
                            </button>
                        </div>

                        <!-- Bitcoin-only asset display -->
                        <div v-if="wallet?.network === 'BITCOIN'" class="mb-4">
                            <div class="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900/20 dark:border-orange-700">
                                <span class="text-lg font-medium text-orange-800 dark:text-orange-200">
                                    Sending {{ getNativeCurrency(wallet?.network) }}
                                </span>
                            </div>
                        </div>





                        <div>
                            <label for="amount" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Amo&#8205;unt</label>
                            <input type="decimal" name="amount" autocomplete="off" v-model="amount"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                                placeholder="Enter Amount" required>
                        </div>


                        <div>
                            <label for="address"
                                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Send
                                to
                                add&#8205;ress</label>
                            <input type="search" name="address" autocomplete="off" v-model="toAddress"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                                placeholder="Recepient address" required>
                        </div>
                        <div>
                            <label for="password"
                                class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Wallet
                                pass&#8205;word</label>
                            <input autocomplete="new-password" type="password" placeholder="••••••••" v-model="password"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
                                required>
                        </div>
                        <!-- <div class="flex justify-between">
                            <div class="flex items-start">
                                <div class="flex items-center h-5">
                                    <input id="remember" type="checkbox" value=""
                                        class="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-600 dark:border-gray-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800"
                                        required>
                                </div>
                                <label for="remember"
                                    class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Remember me</label>
                            </div>
                            <a href="#" class="text-sm text-blue-700 hover:underline dark:text-blue-500">Lost Password?</a>
                        </div> -->


                        <button type="submit" :disabled="isDisabled" @click="submit()"
                            :class="{ 'bg-gray-300 cursor-not-allowed': isDisabled }"
                            class="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">

                            <svg v-if="isSending" aria-hidden="true" role="status"
                                class="inline w-4 h-4 mr-3 text-white animate-spin" viewBox="0 0 100 101" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                    fill="#E5E7EB" />
                                <path
                                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                    fill="currentColor" />
                            </svg>

                            {{ isSending ? 'Sending...' : isDisabled ? 'Fill everything' : 'Send' }}</button>
                        
                        <!-- Wallet activation message - hidden for Bitcoin -->
                        <div v-if="wallet?.network !== 'BITCOIN'" class="text-sm font-medium text-gray-500 dark:text-gray-300">
                            Wallet not active? <a href="#" class="text-blue-700 hover:underline dark:text-blue-500">
                                Activate with card</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div v-if="showResult" class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
        <div class="relative w-full max-w-md max-h-full">
            <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                <button type="button" @click="showResult = false" class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-800 dark:hover:text-white">
                    <svg aria-hidden="true" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    <span class="sr-only">Close modal</span>
                </button>
                <div class="px-6 py-6 lg:px-8">
                    <h3 class="mb-2 text-md font-semibold" :class="resultSuccess ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">{{ resultTitle }}</h3>
                    <p class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{{ resultMessage }}</p>
                    <div v-if="resultTxId" class="mt-3 text-xs text-gray-600 dark:text-gray-300 break-all">
                        TX: {{ resultTxId }}
                    </div>
                    <div v-if="resultTips.length" class="mt-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Suggestions</div>
                        <ul class="list-disc list-inside text-sm text-gray-800 dark:text-gray-200">
                            <li v-for="(tip, idx) in resultTips" :key="idx">{{ tip }}</li>
                        </ul>
                    </div>
                    <div class="mt-6 flex gap-2">
                        <button type="button" class="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white" @click="showResult = false">Close</button>
                        <a v-if="resultTxId && (wallet?.network === 'TRON')" :href="`https://tronscan.org/#/transaction/${resultTxId}`" target="_blank" class="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white">View on Explorer</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>




<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { decryptAsync } from '~/composables/utils';
import type { NetworkType } from '~/stores/wallet';

interface Props {
    wallet: any
    show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    show: false
})

const emit = defineEmits<{
    'close': []
}>()

const password = ref('');
const toAddress = ref('');
const amount = ref('');
const asset = ref('');
const isDisabled = computed(() => {
    return !password.value || !toAddress.value || !amount.value || !asset.value
})
const isSending = ref(false)
const result = ref({})

// Result dialog state
const showResult = ref(false)
const resultSuccess = ref<boolean | null>(null)
const resultTitle = ref('')
const resultMessage = ref('')
const resultTxId = ref<string | null>(null)
const resultTips = ref<string[]>([])

const buildTips = (message?: string, network?: NetworkType) => {
    const tips: string[] = []
    const msg = (message || '').toUpperCase()
    if (network === 'TRON') {
        if (msg.includes('OUT OF ENERGY') || msg.includes('ENERGY')) {
            tips.push('Freeze TRX to gain Energy or hold more TRX for fees')
        }
        if (msg.includes('FEE') || msg.includes('FEE LIMIT')) {
            tips.push('Increase fee limit or ensure enough TRX balance')
        }
    }
    if (msg.includes('INVALID ADDRESS')) {
        tips.push('Verify recipient address format for the selected network')
    }
    if (msg.includes('INSUFFICIENT')) {
        tips.push('Check token and native coin balances for fees')
    }
    return tips
}

const sendTransaction = async (wallet: any) => {
    isSending.value = true

    try {
        const { $sendUSDT, $sendNative, $decryptInWorker } = useNuxtApp()
        
        // Try worker first for AEAD v2
        let plain = await $decryptInWorker({ ciphertext: wallet.privateKey, password: password.value })
        if (!plain) {
            // Fallback: main-thread decrypt for legacy
            plain = await decryptAsync(wallet.privateKey, password.value)
        }
        if (!plain) {
            resultSuccess.value = false
            resultTitle.value = 'Invalid password'
            resultMessage.value = 'Please double-check your wallet password.'
            resultTips.value = ['Ensure CapsLock is off', 'Try re-entering the password']
            showResult.value = true
            isSending.value = false
            return
        }

        const network = wallet.network || 'TRON'
        let result

        if (asset.value === 'USDT') {
            result = await $sendUSDT(wallet.address, plain, toAddress.value, parseFloat(amount.value), network)
        } else {
            result = await $sendNative(wallet.address, plain, toAddress.value, parseFloat(amount.value), network)
        }

        if (result.success) {
            resultSuccess.value = true
            resultTitle.value = `${asset.value} transaction sent`
            resultMessage.value = `Transaction broadcasted successfully.`
            resultTxId.value = result.txId || null
            resultTips.value = []
            showResult.value = true
            cleanup()
        } else {
            resultSuccess.value = false
            resultTitle.value = `Transaction failed`
            resultMessage.value = result.error || 'Unknown error'
            resultTxId.value = result.txId || null
            resultTips.value = buildTips(result.error, network)
            showResult.value = true
            isSending.value = false
        }
    } catch (error) {
        console.error('Send transaction error:', error)
        resultSuccess.value = false
        resultTitle.value = 'Transaction failed'
        // @ts-ignore
        resultMessage.value = error?.message || String(error)
        resultTips.value = buildTips(resultMessage.value, props.wallet?.network)
        showResult.value = true
        isSending.value = false
    }
}

const setAsset = (newAsset: string) => {
    asset.value = newAsset;
}

const submit = () => {
    sendTransaction(props.wallet);
}

const getNetworkDisplayName = (network?: NetworkType) => {
    switch (network) {
        case 'TRON': return 'TRC20'
        case 'ETHEREUM': return 'ERC20'
        case 'BSC': return 'BEP20'
        case 'BITCOIN': return 'BTC'
        default: return network || 'TRC20'
    }
}

const getNativeCurrency = (network?: NetworkType) => {
    switch (network) {
        case 'TRON': return 'TRX'
        case 'ETHEREUM': return 'ETH'
        case 'BSC': return 'BNB'
        case 'BITCOIN': return 'BTC'
        default: return 'TRX'
    }
}

const closeModal = () => {
    cleanup()
    emit('close')
}

const cleanup = () => {
    password.value = null
    asset.value = null
    toAddress.value = null
    amount.value = null
    isSending.value = false
    result.value = null
    resultTxId.value = null
}

// Auto-select asset for Bitcoin wallets
watch(() => props.wallet?.network, (network) => {
    if (network === 'BITCOIN') {
        asset.value = 'BTC'
    }
}, { immediate: true })

</script>


<!-- <script>
import tronWeb from '~/plugins/tron';
import { decrypt } from '~/composables/utils'

export default {
    data() {
        return {
            password: "",
            toAddress: "",
            amount: "",
            asset: ""
        };
    },
    props: {
        wallet: {
            type: Object,
            required: true,
            default: false,
        },
    },
    methods: {
        async sendTransaction(wallet) {
            console.log(wallet.privateKey)
            console.log(this.password)
            console.log(wallet.address + '->' + this.toAddress)
            let plain = decrypt(wallet.privateKey, this.password)
            const addressnew = tronWeb.address.fromPrivateKey(plain);
            console.log(addressnew)
            if (this.asset === 'TRX') {
                //Creates an unsigned TRX transfer transaction
                let transaction = await tronWeb.transactionBuilder.sendTrx(
                    tronWeb.address.toHex(this.toAddress),
                    tronWeb.toSun(this.amount),
                    tronWeb.address.toHex(wallet.address)
                );
                const signedtxn = await tronWeb.trx.sign(
                    transaction,
                    plain.replace(/^0x/, '')
                );
                const receipt = await tronWeb.trx.sendRawTransaction(
                    signedtxn
                ).then(output => { console.log('- Output:', output, '\n'); });
            } else if (this.asset == 'USDT') {
                var senderAddress = wallet.address;
                var receiverAddress = this.toAddress;
                var amount = this.amount;
                var parameter = [{ type: 'address', value: receiverAddress }, { type: 'uint256', value: tronWeb.toSun(amount) }]
                var options = {
                    feeLimit: 100000000
                }

                const transactionObject = await tronWeb.transactionBuilder.triggerSmartContract(
                    tronWeb.address.toHex("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"),
                    "transfer(address,uint256)",
                    options,
                    parameter,
                    tronWeb.address.toHex(senderAddress)
                );
                var signedTransaction = await tronWeb.trx.sign(transactionObject.transaction, plain.replace(/^0x/, ''));
                var broadcastTransaction = await tronWeb.trx.sendRawTransaction(signedTransaction);
                console.log(broadcastTransaction);
            }


        },
        setAsset(asset) {
            this.asset = asset
        }
    }
}
</script> -->