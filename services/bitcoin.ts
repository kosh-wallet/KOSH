// services/bitcoin.ts
import * as bitcoin from 'bitcoinjs-lib'
import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import { ECPairFactory } from 'ecpair'
import * as secp from '@bitcoinerlab/secp256k1'

// Initialize ECC lib (browser-friendly) and ECPair
bitcoin.initEccLib(secp as any)
const ECPair = ECPairFactory(secp as any)

export interface BitcoinBalance {
  address: string
  BTC: number
  confirmed: number
  unconfirmed: number
}

export interface BitcoinUTXO {
  txid: string
  vout: number
  value: number
  status: {
    confirmed: boolean
    block_height?: number
    block_hash?: string
    block_time?: number
  }
}

export interface TransactionResult {
  success: boolean
  txId?: string
  error?: string
}

export interface BitcoinTransaction {
  txid: string
  version: number
  locktime: number
  vin: Array<{
    txid: string
    vout: number
    prevout: {
      scriptpubkey: string
      scriptpubkey_asm: string
      scriptpubkey_type: string
      scriptpubkey_address: string
      value: number
    }
    scriptsig: string
    scriptsig_asm: string
    sequence: number
  }>
  vout: Array<{
    scriptpubkey: string
    scriptpubkey_asm: string
    scriptpubkey_type: string
    scriptpubkey_address: string
    value: number
  }>
  size: number
  weight: number
  fee: number
  status: {
    confirmed: boolean
    block_height?: number
    block_hash?: string
    block_time?: number
  }
}

export type AddressType = 'legacy' | 'segwit' | 'bech32'

export class BitcoinService {
  private network = bitcoin.networks.bitcoin
  private primaryRPC = 'https://bitcoin-rpc.publicnode.com'
  private fallbackRPC = 'https://mempool.space/api'
  private currentRPC: string

  constructor() {
    this.currentRPC = this.getPrimaryRPC()
  }

  // Get primary RPC URL from settings or default
  private getPrimaryRPC(): string {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return this.primaryRPC
      }
      
      const saved = localStorage.getItem('kosh_rpc_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        return settings.bitcoin || this.primaryRPC
      }
      return this.primaryRPC
    } catch (error) {
      console.error('[Bitcoin Service] Error getting RPC URL:', error)
      return this.primaryRPC
    }
  }

  // Update RPC endpoint when settings change
  updateProvider() {
    this.currentRPC = this.getPrimaryRPC()
    console.log('[Bitcoin Service] Using RPC:', this.currentRPC)
  }

  // Make JSON-RPC call to Bitcoin Core
  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    }

    let response: Response
    try {
      response = await fetch(this.currentRPC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    } catch (primaryError) {
      console.warn('[Bitcoin Service] Primary RPC failed, trying REST API fallback:', primaryError)
      // Fallback to REST API for compatibility
      throw primaryError
    }

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`)
    }

    return data.result
  }

  // Fallback to REST API when RPC is not available
  private async restCall(endpoint: string): Promise<any> {
    const url = `${this.fallbackRPC}/${endpoint}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`REST request failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  // Create Bitcoin wallet from mnemonic with proper derivation
  async createWalletFromMnemonic(mnemonic: string, path: string, addressType: AddressType = 'bech32') {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase')
      }

      // Convert mnemonic to seed
      const seed = bip39.mnemonicToSeedSync(mnemonic)
      
      // Create master key from seed
      const masterKey = HDKey.fromMasterSeed(seed)
      
      // Derive child key using the specified path
      const childKey = masterKey.derive(path)
      
      // Get private key
      const privateKey = childKey.privateKey
      if (!privateKey) {
        throw new Error('Failed to derive private key')
      }

      // Create key pair
      const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey), { network: this.network })
      
      // Generate address based on type
      let address: string
      let scriptType: string

      switch (addressType) {
        case 'legacy':
          // P2PKH (starts with 1)
          const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: this.network })
          address = p2pkh.address!
          scriptType = 'p2pkh'
          break
          
        case 'segwit':
          // P2WPKH nested in P2SH (starts with 3)
          const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.network })
          const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network: this.network })
          address = p2sh.address!
          scriptType = 'p2sh-p2wpkh'
          break
          
        case 'bech32':
        default:
          // Native SegWit P2WPKH (starts with bc1)
          const p2wpkhNative = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.network })
          address = p2wpkhNative.address!
          scriptType = 'p2wpkh'
          break
      }

      return {
        address,
        privateKey: Buffer.from(privateKey).toString('hex'),
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        scriptType,
        addressType
      }
    } catch (error) {
      throw new Error(`Failed to create Bitcoin wallet: ${error}`)
    }
  }

  // Get balance for Bitcoin address
  async getBalance(address: string): Promise<BitcoinBalance> {
    try {
      // Try RPC method first
      try {
        // Use scantxoutset to get UTXO balance for address
        const utxos = await this.rpcCall('scantxoutset', ['start', [`addr(${address})`]])
        
        if (utxos && utxos.unspents) {
          const totalSatoshis = Math.round(utxos.total_amount * 100000000)
          return {
            address,
            BTC: utxos.total_amount,
            confirmed: utxos.total_amount,
            unconfirmed: 0 // RPC doesn't distinguish confirmed/unconfirmed in scantxoutset
          }
        }
      } catch (rpcError) {
        console.warn('[Bitcoin Service] RPC balance failed, trying REST fallback:', rpcError)
      }

      // Fallback to REST API
      const data = await this.restCall(`address/${address}`)
      
      // Convert satoshis to BTC
      const confirmed = (data.chain_stats?.funded_txo_sum || 0) - (data.chain_stats?.spent_txo_sum || 0)
      const unconfirmed = (data.mempool_stats?.funded_txo_sum || 0) - (data.mempool_stats?.spent_txo_sum || 0)
      const totalSatoshis = confirmed + unconfirmed
      
      return {
        address,
        BTC: totalSatoshis / 100000000, // Convert satoshis to BTC
        confirmed: confirmed / 100000000,
        unconfirmed: unconfirmed / 100000000
      }
    } catch (error) {
      console.error('[Bitcoin Service] Balance fetch error:', error)
      throw new Error(`Failed to get balance: ${error}`)
    }
  }

  // Get UTXOs for address
  async getUTXOs(address: string): Promise<BitcoinUTXO[]> {
    try {
      // Try RPC method first
      try {
        const result = await this.rpcCall('scantxoutset', ['start', [`addr(${address})`]])
        
        if (result && result.unspents) {
          return result.unspents.map((utxo: any) => ({
            txid: utxo.txid,
            vout: utxo.vout,
            value: Math.round(utxo.amount * 100000000), // Convert BTC to satoshis
            status: {
              confirmed: true, // scantxoutset only returns confirmed UTXOs
              block_height: utxo.height
            }
          }))
        }
      } catch (rpcError) {
        console.warn('[Bitcoin Service] RPC UTXO failed, trying REST fallback:', rpcError)
      }

      // Fallback to REST API
      return await this.restCall(`address/${address}/utxo`)
    } catch (error) {
      console.error('[Bitcoin Service] UTXO fetch error:', error)
      throw new Error(`Failed to get UTXOs: ${error}`)
    }
  }

  // Get recommended fee rates
  async getFeeRates(): Promise<{ fastestFee: number; halfHourFee: number; hourFee: number }> {
    try {
      // Try RPC method first
      try {
        // Use estimatesmartfee for different confirmation targets
        const [fastFee, mediumFee, slowFee] = await Promise.all([
          this.rpcCall('estimatesmartfee', [1]), // 1 block
          this.rpcCall('estimatesmartfee', [3]), // 3 blocks
          this.rpcCall('estimatesmartfee', [6])  // 6 blocks
        ])

        return {
          fastestFee: Math.ceil((fastFee.feerate || 0.0002) * 100000000 / 1000), // Convert BTC/kB to sat/vB
          halfHourFee: Math.ceil((mediumFee.feerate || 0.00015) * 100000000 / 1000),
          hourFee: Math.ceil((slowFee.feerate || 0.0001) * 100000000 / 1000)
        }
      } catch (rpcError) {
        console.warn('[Bitcoin Service] RPC fee estimation failed, trying REST fallback:', rpcError)
      }

      // Fallback to REST API
      const feeEstimates = await this.restCall('fee-estimates')
      
      return {
        fastestFee: Math.ceil(feeEstimates['1'] || 20), // 1 block (~10 min)
        halfHourFee: Math.ceil(feeEstimates['3'] || 15), // 3 blocks (~30 min)
        hourFee: Math.ceil(feeEstimates['6'] || 10)      // 6 blocks (~1 hour)
      }
    } catch (error) {
      console.error('[Bitcoin Service] Fee estimation error:', error)
      // Return default fee rates if API fails
      return {
        fastestFee: 20,
        halfHourFee: 15,
        hourFee: 10
      }
    }
  }

  // Send Bitcoin transaction
  async sendBTC(privateKey: string, fromAddress: string, toAddress: string, amount: number, feeRate?: number): Promise<TransactionResult> {
    try {
      // ECC is initialized globally via @bitcoinerlab/secp256k1
      // Validate inputs
      if (!this.isValidAddress(toAddress)) {
        throw new Error('Invalid recipient address')
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      // Get UTXOs
      const utxos = await this.getUTXOs(fromAddress)
      const confirmedUTXOs = utxos.filter(utxo => utxo.status.confirmed)
      
      if (confirmedUTXOs.length === 0) {
        throw new Error('No confirmed UTXOs available')
      }

      // Get fee rate
      if (!feeRate) {
        const feeRates = await this.getFeeRates()
        feeRate = feeRates.halfHourFee
      }

      // Convert amount to satoshis
      const amountSatoshis = Math.floor(amount * 100000000)
      
      // Create key pair from private key
      const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network: this.network })
      
      // Build transaction
      const psbt = new bitcoin.Psbt({ network: this.network })
      
      let inputSum = 0
      let inputCount = 0
      
      // Add inputs (UTXOs)
      for (const utxo of confirmedUTXOs) {
        if (inputSum >= amountSatoshis + (inputCount + 1) * 150 * feeRate) break // Rough fee estimation
        
        // Get transaction details for this UTXO
        let txHex: string
        try {
          // Try RPC first
          txHex = await this.rpcCall('getrawtransaction', [utxo.txid])
        } catch (rpcError) {
          // Fallback to REST API
          const txResponse = await fetch(`${this.fallbackRPC}/tx/${utxo.txid}/hex`)
          txHex = await txResponse.text()
        }
        
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex || '', 'hex') // For legacy addresses
        })
        
        inputSum += utxo.value
        inputCount++
      }
      
      // Estimate transaction size and fee
      const estimatedSize = inputCount * 148 + 2 * 34 + 10 // Rough estimation
      const fee = estimatedSize * feeRate
      
      if (inputSum < amountSatoshis + fee) {
        throw new Error(`Insufficient funds. Need ${(amountSatoshis + fee) / 100000000} BTC, have ${inputSum / 100000000} BTC`)
      }
      
      // Add output to recipient
      psbt.addOutput({
        address: toAddress,
        value: amountSatoshis
      })
      
      // Add change output if needed
      const change = inputSum - amountSatoshis - fee
      if (change > 546) { // Dust limit
        psbt.addOutput({
          address: fromAddress,
          value: change
        })
      }
      
      // Sign all inputs
      for (let i = 0; i < inputCount; i++) {
        psbt.signInput(i, keyPair)
      }
      
      // Finalize and extract transaction
      psbt.finalizeAllInputs()
      const txHex = psbt.extractTransaction().toHex()
      
      // Broadcast transaction
      let txId: string
      
      try {
        // Try RPC method first
        txId = await this.rpcCall('sendrawtransaction', [txHex])
      } catch (rpcError) {
        console.warn('[Bitcoin Service] RPC broadcast failed, trying REST fallback:', rpcError)
        
        // Fallback to REST API
        const broadcastResponse = await fetch(`${this.fallbackRPC}/tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: txHex
        })
        
        if (!broadcastResponse.ok) {
          const errorText = await broadcastResponse.text()
          throw new Error(`Transaction broadcast failed: ${errorText}`)
        }
        
        txId = await broadcastResponse.text()
      }
      
      return {
        success: true,
        txId: txId.trim()
      }
    } catch (error) {
      console.error('[Bitcoin Service] Send BTC error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }
    }
  }

  // Get transaction details
  async getTransaction(txId: string): Promise<BitcoinTransaction | null> {
    try {
      // Try RPC method first
      try {
        const rawTx = await this.rpcCall('getrawtransaction', [txId, true])
        
        if (rawTx) {
          // Convert RPC format to expected format
          return {
            txid: rawTx.txid,
            version: rawTx.version,
            locktime: rawTx.locktime,
            vin: rawTx.vin.map((input: any) => ({
              txid: input.txid,
              vout: input.vout,
              prevout: {
                scriptpubkey: input.scriptSig?.hex || '',
                scriptpubkey_asm: input.scriptSig?.asm || '',
                scriptpubkey_type: 'unknown',
                scriptpubkey_address: '',
                value: 0
              },
              scriptsig: input.scriptSig?.hex || '',
              scriptsig_asm: input.scriptSig?.asm || '',
              sequence: input.sequence
            })),
            vout: rawTx.vout.map((output: any) => ({
              scriptpubkey: output.scriptPubKey?.hex || '',
              scriptpubkey_asm: output.scriptPubKey?.asm || '',
              scriptpubkey_type: output.scriptPubKey?.type || 'unknown',
              scriptpubkey_address: output.scriptPubKey?.address || '',
              value: Math.round(output.value * 100000000) // Convert BTC to satoshis
            })),
            size: rawTx.size || 0,
            weight: rawTx.weight || 0,
            fee: 0,
            status: {
              confirmed: rawTx.confirmations > 0,
              block_height: rawTx.blockheight,
              block_hash: rawTx.blockhash,
              block_time: rawTx.blocktime
            }
          }
        }
      } catch (rpcError) {
        console.warn('[Bitcoin Service] RPC transaction failed, trying REST fallback:', rpcError)
      }

      // Fallback to REST API
      return await this.restCall(`tx/${txId}`)
    } catch (error) {
      console.error('[Bitcoin Service] Transaction fetch error:', error)
      return null
    }
  }

  // Get transaction history for address
  async getTransactionHistory(address: string, limit: number = 25): Promise<BitcoinTransaction[]> {
    try {
      // RPC doesn't have direct address history method, fallback to REST API
      // Note: Bitcoin Core RPC would require importing address first with importaddress
      console.warn('[Bitcoin Service] Transaction history requires REST API fallback')
      
      const transactions = await this.restCall(`address/${address}/txs`)
      return transactions.slice(0, limit)
    } catch (error) {
      console.error('[Bitcoin Service] Transaction history error:', error)
      return []
    }
  }

  // Validate Bitcoin address
  isValidAddress(address: string): boolean {
    try {
      // Try to decode the address using bitcoinjs-lib
      bitcoin.address.toOutputScript(address, this.network)
      return true
    } catch (error) {
      return false
    }
  }

  // Get address type from address string
  getAddressType(address: string): AddressType | null {
    try {
      if (address.startsWith('1')) {
        return 'legacy'
      } else if (address.startsWith('3')) {
        return 'segwit'
      } else if (address.startsWith('bc1')) {
        return 'bech32'
      }
      return null
    } catch (error) {
      return null
    }
  }

  // Format BTC amount for display
  formatAmount(amount: number, decimals: number = 8): string {
    return amount.toFixed(decimals).replace(/\.?0+$/, '')
  }

  // Convert satoshis to BTC
  satoshisToBTC(satoshis: number): number {
    return satoshis / 100000000
  }

  // Convert BTC to satoshis
  btcToSatoshis(btc: number): number {
    return Math.floor(btc * 100000000)
  }
}

// Export singleton instance
export const bitcoinService = new BitcoinService()
