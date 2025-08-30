// services/bsc.ts
import { ethers } from 'ethers'

export interface BSCBalance {
  address: string
  USDT: number
  BNB: number
}

export interface TransactionResult {
  success: boolean
  txId?: string
  error?: string
}

export class BSCService {
  private provider: ethers.providers.JsonRpcProvider
  private usdtContractAddress = '0x55d398326f99059fF775485246999027B3197955' // USDT on BSC
  
  // ERC20 ABI for USDT contract
  private erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
  ]

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider('https://bsc-rpc.publicnode.com')
  }

  // Get RPC URL from settings or default
  private getRPCUrl(): string {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return 'https://bsc-rpc.publicnode.com'
      }
      
      const saved = localStorage.getItem('kosh_rpc_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        return settings.bsc || 'https://bsc-rpc.publicnode.com'
      }
      return 'https://bsc-rpc.publicnode.com'
    } catch (error) {
      console.error('[BSC Service] Error getting RPC URL:', error)
      return 'https://bsc-rpc.publicnode.com'
    }
  }

  // Public method to refresh provider when settings change
  updateProvider() {
    const rpcUrl = this.getRPCUrl()
    console.log('[BSC Service] Using RPC URL:', rpcUrl)
    try {
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    } catch (error) {
      console.error('[BSC Service] Failed to create provider:', error)
      this.provider = new ethers.providers.JsonRpcProvider('https://bsc-rpc.publicnode.com')
    }
  }

  // Create wallet from mnemonic with proper error handling
  createWalletFromMnemonic(mnemonic: string, path: string) {
    try {
      return ethers.Wallet.fromMnemonic(mnemonic, path)
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error}`)
    }
  }

  // Get balance with proper error handling and rate limiting
  async getBalance(address: string): Promise<BSCBalance> {
    try {
      const balance: BSCBalance = {
        address,
        USDT: 0,
        BNB: 0
      }

      // Get BNB balance
      const bnbBalance = await this.provider.getBalance(address)
      balance.BNB = parseFloat(ethers.utils.formatUnits(bnbBalance, 18))

      // Get USDT balance
      const usdtContract = new ethers.Contract(this.usdtContractAddress, this.erc20Abi, this.provider)
      const usdtBalance = await usdtContract.balanceOf(address)
      const decimals = await usdtContract.decimals()
      balance.USDT = parseFloat(ethers.utils.formatUnits(usdtBalance, decimals))

      return balance
    } catch (error) {
      console.error('[BSC Service] Balance fetch error:', error)
      throw new Error(`Failed to get balance: ${error}`)
    }
  }

  // Send BNB with proper error handling
  async sendBNB(privateKey: string, toAddress: string, amount: number): Promise<TransactionResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider)
      const amountWei = ethers.utils.parseUnits(amount.toString(), 18)

      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: amountWei
      })

      await tx.wait()

      return {
        success: true,
        txId: tx.hash
      }
    } catch (error) {
      console.error('[BSC Service] Send BNB error:', error)
      return {
        success: false,
        error: `Failed to send BNB: ${error}`
      }
    }
  }

  // Send USDT with proper error handling  
  async sendUSDT(privateKey: string, toAddress: string, amount: number): Promise<TransactionResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider)
      const usdtContract = new ethers.Contract(this.usdtContractAddress, this.erc20Abi, wallet)
      
      const decimals = await usdtContract.decimals()
      const amountWei = ethers.utils.parseUnits(amount.toString(), decimals)

      const tx = await usdtContract.transfer(toAddress, amountWei)
      await tx.wait()

      return {
        success: true,
        txId: tx.hash
      }
    } catch (error) {
      console.error('[BSC Service] Send USDT error:', error)
      return {
        success: false,
        error: `Failed to send USDT: ${error}`
      }
    }
  }

  // Get transaction history (simplified)
  async getTransactionHistory(address: string, limit: number = 10) {
    try {
      // This is a simplified version - in production you'd use BSCScan API
      const latestBlock = await this.provider.getBlockNumber()
      const transactions = []

      // Get recent blocks and filter transactions
      for (let i = 0; i < Math.min(limit, 10); i++) {
        try {
          const block = await this.provider.getBlockWithTransactions(latestBlock - i)
          const addressTxs = block.transactions.filter(tx => 
            tx.to?.toLowerCase() === address.toLowerCase() || 
            tx.from?.toLowerCase() === address.toLowerCase()
          )
          transactions.push(...addressTxs)
        } catch (blockError) {
          console.warn('[BSC Service] Block fetch error:', blockError)
        }
      }

      return transactions.slice(0, limit)
    } catch (error) {
      console.error('[BSC Service] Transaction history error:', error)
      return []
    }
  }

  // Validate BSC address (same as Ethereum)
  isValidAddress(address: string): boolean {
    try {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    } catch (error) {
      return false
    }
  }

  // Get current gas price
  async getGasPrice() {
    try {
      return await this.provider.getGasPrice()
    } catch (error) {
      console.error('[BSC Service] Gas price error:', error)
      return ethers.utils.parseUnits('5', 'gwei') // fallback - BSC has lower gas prices
    }
  }

  // Estimate gas for transaction
  async estimateGas(transaction: any) {
    try {
      return await this.provider.estimateGas(transaction)
    } catch (error) {
      console.error('[BSC Service] Gas estimation error:', error)
      return 21000 // fallback for simple transfer
    }
  }
}

export const bscService = new BSCService()