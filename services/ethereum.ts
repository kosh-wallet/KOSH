// services/ethereum.ts
import { ethers } from 'ethers'

export interface EthereumBalance {
  address: string
  USDT: number
  ETH: number
}

export interface TransactionResult {
  success: boolean
  txId?: string
  error?: string
}

export class EthereumService {
  private provider: ethers.providers.JsonRpcProvider
  private usdtContractAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7' // USDT on Ethereum mainnet
  private usdcContractAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC on Ethereum mainnet
  private chainlinkContractAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA' // LINK on Ethereum mainnet

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
    this.provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io/')
  }

  // Get RPC URL from settings or default
  private getRPCUrl(): string {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return 'https://eth-mainnet.public.blastapi.io/'
      }
      
      const saved = localStorage.getItem('kosh_rpc_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        return settings.ethereum || 'https://eth-mainnet.public.blastapi.io/'
      }
      return 'https://eth-mainnet.public.blastapi.io/'
    } catch (error) {
      console.error('[Ethereum Service] Error getting RPC URL:', error)
      return 'https://eth-mainnet.public.blastapi.io/'
    }
  }

  // Public method to refresh provider when settings change
  updateProvider() {
    const rpcUrl = this.getRPCUrl()
    console.log('[Ethereum Service] Using RPC URL:', rpcUrl)
    try {
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    } catch (error) {
      console.error('[Ethereum Service] Failed to create provider:', error)
      this.provider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.public.blastapi.io/')
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
  async getBalance(address: string): Promise<EthereumBalance> {
    try {
      const balance: EthereumBalance = {
        address,
        USDT: 0,
        ETH: 0
      }

      // Get ETH balance
      const ethBalance = await this.provider.getBalance(address)
      balance.ETH = parseFloat(ethers.utils.formatUnits(ethBalance, 18))

      // Get USDT balance
      const usdtContract = new ethers.Contract(this.usdtContractAddress, this.erc20Abi, this.provider)
      const usdtBalance = await usdtContract.balanceOf(address)
      const decimals = await usdtContract.decimals()
      balance.USDT = parseFloat(ethers.utils.formatUnits(usdtBalance, decimals))


      return balance
    } catch (error) {
      console.error('[Ethereum Service] Balance fetch error:', error)
      throw new Error(`Failed to get balance: ${error}`)
    }
  }

  // Send ETH with proper error handling
  async sendETH(privateKey: string, toAddress: string, amount: number): Promise<TransactionResult> {
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
      console.error('[Ethereum Service] Send ETH error:', error)
      return {
        success: false,
        error: `Failed to send ETH: ${error}`
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
      console.error('[Ethereum Service] Send USDT error:', error)
      return {
        success: false,
        error: `Failed to send USDT: ${error}`
      }
    }
  }

  // Get transaction history (simplified)
  async getTransactionHistory(address: string, limit: number = 10) {
    try {
      // This is a simplified version - in production you'd use a service like Etherscan API
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
          console.warn('[Ethereum Service] Block fetch error:', blockError)
        }
      }

      return transactions.slice(0, limit)
    } catch (error) {
      console.error('[Ethereum Service] Transaction history error:', error)
      return []
    }
  }

  // Validate Ethereum address
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
      console.error('[Ethereum Service] Gas price error:', error)
      return ethers.utils.parseUnits('20', 'gwei') // fallback
    }
  }

  // Estimate gas for transaction
  async estimateGas(transaction: any) {
    try {
      return await this.provider.estimateGas(transaction)
    } catch (error) {
      console.error('[Ethereum Service] Gas estimation error:', error)
      return 21000 // fallback for simple transfer
    }
  }
}

export const ethereumService = new EthereumService()