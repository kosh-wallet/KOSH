import TronWeb from 'tronweb'

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

  constructor() {
    this.initializeTronWeb()
  }

  // Initialize TronWeb instance
  private initializeTronWeb() {
    const HttpProvider = TronWeb.providers.HttpProvider
    const fullNode = new HttpProvider('https://api.trongrid.io')
    const solidityNode = new HttpProvider('https://api.trongrid.io')
    const eventServer = 'https://api.trongrid.io'

    this.tronWeb = new TronWeb(fullNode, solidityNode, eventServer)
  }

  // Create wallet from mnemonic with proper error handling
  createWalletFromMnemonic(mnemonic: string, path: string) {
    try {
      return this.tronWeb.fromMnemonic(mnemonic, path)
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error}`)
    }
  }

  // Get balance with proper error handling and rate limiting
  async getBalance(address: string): Promise<TronBalance> {
    try {
      // Validate address format
      if (!this.tronWeb.isAddress(address)) {
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

  // Format unknown error-like values into meaningful string for UI
  private formatUnknownError(error: unknown): string {
    try {
      if (error instanceof Error) return error.message
      if (typeof error === 'string') return error
      if (error && typeof error === 'object') {
        const anyErr: any = error
        const parts: string[] = []
        if (anyErr.message) parts.push(String(anyErr.message))
        if (anyErr.code) parts.push(`code: ${anyErr.code}`)
        if (anyErr.status) parts.push(`status: ${anyErr.status}`)
        if (anyErr.error) parts.push(`error: ${String(anyErr.error)}`)
        if (anyErr.response?.data) {
          try { parts.push(`response: ${JSON.stringify(anyErr.response.data)}`) } catch {}
        }
        if (parts.length) return parts.join(' | ')
        try { return JSON.stringify(error) } catch {}
      }
      return 'Transaction failed'
    } catch {
      return 'Transaction failed'
    }
  }

  // Wait for TRON transaction to be executed and return final receipt status
  private async waitForTxResult(txId: string, timeoutMs: number = 60000, pollMs: number = 3000): Promise<{ confirmed: boolean; success: boolean; reason?: string }> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      try {
        // getTransactionInfo returns execution result after inclusion
        const info = await this.tronWeb.trx.getTransactionInfo(txId)
        if (info && Object.keys(info).length > 0) {
          const receipt = info.receipt || {}
          const result = receipt.result || info.result

          // Decode possible hex message to readable string
          let reason: string | undefined
          const rawMessage = info.resMessage || info.code
          if (rawMessage && typeof rawMessage === 'string') {
            try {
              const hex = rawMessage.startsWith('0x') ? rawMessage.slice(2) : rawMessage
              reason = Buffer.from(hex, 'hex').toString('utf8') || rawMessage
            } catch {
              reason = String(rawMessage)
            }
          }

          // Map common failure due to energy
          if (reason && /OUT OF ENERGY/i.test(reason)) {
            return { confirmed: true, success: false, reason: 'Insufficient energy (OUT OF ENERGY)' }
          }

          // Enrich other failures with metrics if available
          const fee = (info.fee != null ? info.fee : info.receipt?.fee) as number | undefined
          const energy = (info.receipt?.energy_usage_total || info.receipt?.EnergyUsageTotal || info.energy_usage_total) as number | undefined
          const builderMessage = info.receipt?.reject_message
          if (!reason && builderMessage) {
            reason = String(builderMessage)
          }
          if (result === 'SUCCESS') {
            return { confirmed: true, success: true }
          }

          if (result && result !== 'SUCCESS') {
            const details: string[] = []
            if (reason) details.push(reason)
            details.push(String(result))
            if (typeof fee === 'number') details.push(`fee: ${fee}`)
            if (typeof energy === 'number') details.push(`energy_used: ${energy}`)
            return { confirmed: true, success: false, reason: details.join(' | ') }
          }
        }
      } catch {
        // ignore intermittent RPC errors and continue polling
      }

      await new Promise(r => setTimeout(r, pollMs))
    }

    return { confirmed: false, success: false, reason: 'Timed out waiting for confirmation' }
  }

  // Get USDT balance from contract
  private async getUSDTBalance(address: string): Promise<number> {
    try {
      // Set the address before making contract calls
      this.tronWeb.setAddress(address)
      const contract = await this.tronWeb.contract().at(this.usdtContractAddress)
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
      const account = await this.tronWeb.trx.getAccount(address)
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
      // Validate inputs
      if (!this.tronWeb.isAddress(fromAddress) || !this.tronWeb.isAddress(toAddress)) {
        throw new Error('Invalid address format')
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      // Set private key temporarily (normalize like TRX flow: strip 0x and uppercase)
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2).toUpperCase() : privateKey.toUpperCase()
      this.tronWeb.setPrivateKey(cleanPrivateKey)
      this.tronWeb.setAddress(fromAddress)

      // Get contract instance
      const contract = await this.tronWeb.contract().at(this.usdtContractAddress)

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

      // Verify execution result (detect energy failures and reverts)
      const receipt = await this.waitForTxResult(transaction)
      if (!receipt.success) {
        return {
          success: false,
          error: receipt.reason || 'Transaction failed during execution',
          txId: transaction
        }
      }

      return { success: true, txId: transaction }
    } catch (error) {
      return {
        success: false,
        error: this.formatUnknownError(error)
      }
    } finally {
      // Clear private key from memory by creating new TronWeb instance
      this.initializeTronWeb()
    }
  }

  // Send TRX with proper validation
  async sendTRX(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<TransactionResult> {
    try {
      // Validate inputs
      if (!this.tronWeb.isAddress(fromAddress) || !this.tronWeb.isAddress(toAddress)) {
        throw new Error('Invalid address format')
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }

      // Set private key temporarily - strip 0x prefix and uppercase
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2).toUpperCase() : privateKey.toUpperCase()
      this.tronWeb.setPrivateKey(cleanPrivateKey)
      // Convert TRX to sun
      const amountInSun = this.tronWeb.toSun(amount)

      // Check balance before transaction
      const balance = await this.getTRXBalance(fromAddress)
      if (balance.balance < amount) {
        throw new Error('Insufficient TRX balance')
      }

      // Create and broadcast transaction
      const transaction = await this.tronWeb.trx.sendTransaction(toAddress, amountInSun)

      // Verify execution result
      const receipt = await this.waitForTxResult(transaction.txid)
      if (!receipt.success) {
        return {
          success: false,
          error: receipt.reason || 'Transaction failed during execution',
          txId: transaction.txid
        }
      }

      return { success: true, txId: transaction.txid }
    } catch (error) {
      return {
        success: false,
        error: this.formatUnknownError(error)
      }
    } finally {
      // Clear private key from memory by creating new TronWeb instance
      this.initializeTronWeb()
    }
  }

  // Validate address format
  isValidAddress(address: string): boolean {
    try {
      return this.tronWeb.isAddress(address)
    } catch {
      return false
    }
  }

  // Get transaction details
  async getTransaction(txId: string) {
    try {
      return await this.tronWeb.trx.getTransaction(txId)
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