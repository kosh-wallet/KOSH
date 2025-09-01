// services/tron.ts
// Lazy-load TronWeb only on client to avoid SSR/prerender crashes
let LoadedTronWeb: any | null = null
async function loadTronWeb() {
  if (typeof window === 'undefined') {
    // Prevent server-side import during prerender
    throw new Error('TronWeb is only available on the client')
  }
  if (!LoadedTronWeb) {
    const mod: any = await import('tronweb/dist/TronWeb')
    LoadedTronWeb = mod.default || mod
  }
  return LoadedTronWeb
}

export interface TronBalance {
  address: string
  USDT: number
  TRX: number
  frozen?: number
}

export interface TransactionResult {
  success: boolean
  txId?: string
  error?: string
}

export class TronService {
  private tronWeb: any
  private usdtContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

  constructor() {}

  // Initialize TronWeb instance
  private async ensureTronWeb(): Promise<any> {
    if (this.tronWeb) return this.tronWeb
    const TronWeb = await loadTronWeb()
    const HttpProvider = TronWeb.providers.HttpProvider
    const fullNode = new HttpProvider('https://api.trongrid.io')
    const solidityNode = new HttpProvider('https://api.trongrid.io')
    const eventServer = 'https://api.trongrid.io'
    this.tronWeb = new TronWeb(fullNode, solidityNode, eventServer)
    return this.tronWeb
  }

  // Create wallet from mnemonic with proper error handling
  async createWalletFromMnemonic(mnemonic: string, path: string) {
    try {
      const tronWeb = await this.ensureTronWeb()
      return tronWeb.fromMnemonic(mnemonic, path)
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error}`)
    }
  }

  // Get balance with proper error handling and rate limiting
  async getBalance(address: string): Promise<TronBalance> {
    try {
      const tronWeb = await this.ensureTronWeb()
      // Validate address format
      if (!tronWeb.isAddress(address)) {
        throw new Error('Invalid TRON address')
      }

      const [usdtBalance, account] = await Promise.all([
        this.getUSDTBalance(address),
        this.getTRXBalance(address)
      ])

      return {
        address,
        USDT: usdtBalance,
        TRX: account.balance,
        frozen: account.frozen
      }
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`)
    }
  }

  // Get USDT balance from contract
  private async getUSDTBalance(address: string): Promise<number> {
    try {
      const tronWeb = await this.ensureTronWeb()
      // Set the address before making contract calls
      tronWeb.setAddress(address)
      const contract = await tronWeb.contract().at(this.usdtContractAddress)
      const balance = await contract.balanceOf(address).call()
      return balance.toNumber() / 1000000 // Convert from 6 decimals
    } catch (error) {
      console.error('USDT balance error:', error)
      return 0
    }
  }

  // Get TRX balance and account info
  private async getTRXBalance(address: string): Promise<{ balance: number; frozen?: number }> {
    try {
      const tronWeb = await this.ensureTronWeb()
      const account = await tronWeb.trx.getAccount(address)
      const balance = (account.balance || 0) / 1000000 // Convert from sun to TRX
      const frozen = account.account_resource?.frozen_balance_for_energy?.frozen_balance || 0
      
      return { balance, frozen }
    } catch (error) {
      console.error('TRX balance error:', error)
      return { balance: 0 }
    }
  }

  // Send USDT with proper validation
  async sendUSDT(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<TransactionResult> {
    try {
      const tronWeb = await this.ensureTronWeb()
      // Validate inputs
      if (!tronWeb.isAddress(fromAddress) || !tronWeb.isAddress(toAddress)) {
        throw new Error('Invalid address format')
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      // Set private key temporarily
      tronWeb.setPrivateKey(privateKey)
      tronWeb.setAddress(fromAddress)

      // Get contract instance
      const contract = await tronWeb.contract().at(this.usdtContractAddress)

      // Convert amount to contract units (6 decimals)
      const amountInUnits = Math.floor(amount * 1000000)

      // Check balance before transaction
      const balance = await this.getUSDTBalance(fromAddress)
      if (balance < amount) {
        throw new Error('Insufficient USDT balance')
      }

      // Execute transaction
      const transaction = await contract.transfer(toAddress, amountInUnits).send({
        feeLimit: 15000000 // 15 TRX fee limit
      })

      return {
        success: true,
        txId: transaction
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }
    } finally {
      // Clear private key from memory by creating new TronWeb instance
      this.tronWeb = null
    }
  }

  // Send TRX with proper validation
  async sendTRX(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<TransactionResult> {
    try {
      const tronWeb = await this.ensureTronWeb()
      // Validate inputs
      if (!tronWeb.isAddress(fromAddress) || !tronWeb.isAddress(toAddress)) {
        throw new Error('Invalid address format')
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      // Set private key temporarily - strip 0x prefix and uppercase
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2).toUpperCase() : privateKey.toUpperCase()
      tronWeb.setPrivateKey(cleanPrivateKey)
      // Convert TRX to sun
      const amountInSun = tronWeb.toSun(amount)

      // Check balance before transaction
      const balance = await this.getTRXBalance(fromAddress)
      if (balance.balance < amount) {
        throw new Error('Insufficient TRX balance')
      }

      // Create and broadcast transaction
      const transaction = await tronWeb.trx.sendTransaction(toAddress, amountInSun)

      return {
        success: true,
        txId: transaction.txid
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }
    } finally {
      // Clear private key from memory by creating new TronWeb instance
      this.tronWeb = null
    }
  }

  // Validate address format
  isValidAddress(address: string): boolean {
    try {
      // Avoid SSR usage; if not initialized yet, try to use client-side API only
      if (!this.tronWeb) return false
      return this.tronWeb.isAddress(address)
    } catch {
      return false
    }
  }

  // Get transaction details
  async getTransaction(txId: string) {
    try {
      const tronWeb = await this.ensureTronWeb()
      return await tronWeb.trx.getTransaction(txId)
    } catch (error) {
      throw new Error(`Failed to get transaction: ${error}`)
    }
  }

  // Format amount for display
  formatAmount(amount: number, decimals: number = 6): string {
    return amount.toFixed(decimals).replace(/\.?0+$/, '')
  }
}

// Export singleton instance
export const tronService = new TronService()