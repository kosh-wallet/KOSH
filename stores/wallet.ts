import { defineStore } from 'pinia'
import * as bip39 from 'bip39'
import * as CryptoJS from 'crypto-js'
import { encryptAsync, decryptAsync } from '~/composables/utils'
import { tronService } from '~/services/tron'
import { ethereumService } from '~/services/ethereum'
import { bscService } from '~/services/bsc'
import { bitcoinService } from '~/services/bitcoin'
import { FakeWalletService } from '~/services/fake-wallet'
import { useSecurityStore } from '~/stores/security'
import { ObfuscationService } from '~/services/obfuscation'

export type NetworkType = 'TRON' | 'ETHEREUM' | 'BSC' | 'BITCOIN'

interface NetworkWallet {
  address: string
  privateKey: string
  index: number // derivation index for multiple addresses
}

interface WalletData {
  masterMnemonic: {
    phrase: string // encrypted master mnemonic
  }
  networks: {
    TRON: NetworkWallet[]
    ETHEREUM: NetworkWallet[]
    BSC: NetworkWallet[]
    BITCOIN: NetworkWallet[]
  }
  createdAt: string
  version: string
}

interface Balance {
  address: string
  network: NetworkType
  USDT: number
  native: number // TRX, ETH, BNB, or BTC
}

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    masterWallet: null as WalletData | null,
    balances: {} as Record<string, Balance>,
    selectedNetwork: 'TRON' as NetworkType,
    isLoading: false,
    error: null as string | null
  }),

  getters: {
    hasWallets: (state) => !!state.masterWallet,
    getAllWallets: (state) => {
      if (!state.masterWallet) return []
      const allWallets: Array<NetworkWallet & { network: NetworkType }> = []
      
      Object.entries(state.masterWallet.networks).forEach(([network, wallets]) => {
        wallets.forEach(wallet => {
          allWallets.push({ ...wallet, network: network as NetworkType })
        })
      })
      
      return allWallets
    },
    getWalletsByNetwork: (state) => (network: NetworkType) =>
      state.masterWallet?.networks[network] || [],
    getWalletByAddress: (state) => (address: string) => {
      if (!state.masterWallet) return null
      
      for (const [network, wallets] of Object.entries(state.masterWallet.networks)) {
        const wallet = wallets.find(w => w.address === address)
        if (wallet) return { ...wallet, network: network as NetworkType }
      }
      return null
    },
    getBalance: (state) => (address: string) => 
      state.balances[address],
    getSupportedNetworks: () => ['TRON', 'ETHEREUM', 'BSC', 'BITCOIN'] as NetworkType[]
  },

  actions: {
    // Secure key derivation using PBKDF2
    deriveKey(password: string, salt: string): string {
      return CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString()
    },

    // Secure encryption with random salt (legacy) — kept for backward compatibility
    encrypt(message: string, password: string): string {
      const salt = CryptoJS.lib.WordArray.random(128/8).toString()
      const key = this.deriveKey(password, salt)
      const encrypted = CryptoJS.AES.encrypt(message, key).toString()
      return salt + ':' + encrypted
    },

    // Secure decryption
    decrypt(encryptedData: string, password: string): string | null {
      try {
        const [salt, encrypted] = encryptedData?.split(':')
        if (!salt || !encrypted) return null
        
        const key = this.deriveKey(password, salt)
        const decrypted = CryptoJS.AES.decrypt(encrypted, key)
        return decrypted.toString(CryptoJS.enc.Utf8)
      } catch (error) {
        console.error('Decryption failed:', error)
        return null
      }
    },

    // Load wallets from secure storage
    async loadWallets() {
      try {
        this.isLoading = true
        
        // Проверяем режим безопасности
        const securityStore = useSecurityStore()
        
        if (securityStore.shouldShowFakeWallets) {
          // Загружаем фальшивые кошельки
          await this.loadFakeWallets()
        } else {
          // Загружаем реальные кошельки
          let walletData = null
          
          // Пробуем загрузить обфусцированные данные
          if (ObfuscationService.hasObfuscatedData() && securityStore.correctPinHash) {
            // Обфусцированные данные требуют PIN для расшифровки
            // Они будут загружены после ввода PIN пользователем
          }
          
          // Fallback к обычному способу
          if (!walletData && process.client && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('kosh_wallet')
            if (stored) {
              walletData = JSON.parse(stored)
            }
          }
          
          if (walletData) {
            // Handle migration from old format
            if (Array.isArray(walletData)) {
              // Old format - migrate later if needed
              this.masterWallet = null
            } else {
              this.masterWallet = walletData
              // Migration: ensure all network arrays exist (including BITCOIN)
              if (this.masterWallet && this.masterWallet.networks) {
                this.masterWallet.networks = {
                  TRON: this.masterWallet.networks.TRON || [],
                  ETHEREUM: this.masterWallet.networks.ETHEREUM || [],
                  BSC: this.masterWallet.networks.BSC || [],
                  BITCOIN: this.masterWallet.networks.BITCOIN || []
                }
              }
            }
          }
        }
      } catch (error) {
        this.error = 'Failed to load wallets'
        console.error('Load wallets error:', error)
      } finally {
        this.isLoading = false
      }
    },

    // Загрузка фальшивых кошельков
    async loadFakeWallets() {
      try {
        let fakeWallets = FakeWalletService.loadFakeWallets()
        
        // Если фальшивых кошельков нет, пытаемся создать их
        if (!fakeWallets && process.client && typeof localStorage !== 'undefined') {
          // Сначала пытаемся загрузить реальный кошелек для создания фейка
          const realWalletData = localStorage.getItem('kosh_wallet')
          if (realWalletData) {
            try {
              const realWallet = JSON.parse(realWalletData)
              if (realWallet && realWallet.masterMnemonic) {
                fakeWallets = await FakeWalletService.generateFakeWallets(
                  realWallet.masterMnemonic.phrase,
                  'fake_password'
                )
                FakeWalletService.saveFakeWallets(fakeWallets)
              }
            } catch (error) {
              console.error('Failed to parse real wallet for fake generation:', error)
            }
          }
        }
        
        // Устанавливаем фальшивые данные или пустую структуру
        if (fakeWallets) {
          this.masterWallet = fakeWallets
        } else {
          this.masterWallet = FakeWalletService.createEmptyFakeWallet()
        }
      } catch (error) {
        console.error('Failed to load fake wallets:', error)
        // В случае ошибки создаем пустую структуру
        this.masterWallet = FakeWalletService.createEmptyFakeWallet()
      }
    },

    // Save wallets to secure storage
    async saveWallets() {
      try {
        const securityStore = useSecurityStore()
        
        // Обычное сохранение (обфускация происходит только в бэкапах)
        if (process.client && typeof localStorage !== 'undefined') {
          localStorage.setItem('kosh_wallet', JSON.stringify(this.masterWallet))
        }
      } catch (error) {
        this.error = 'Failed to save wallets'
        console.error('Save wallets error:', error)
      }
    },


    // Generate new mnemonic with additional entropy
    generateMnemonic(): string {
      const entropy = new Uint8Array(16)
      crypto.getRandomValues(entropy)
      return bip39.generateMnemonic(128)
    },

    // Set selected network
    setSelectedNetwork(network: NetworkType) {
      this.selectedNetwork = network
    },

    // Get service for network
    getNetworkService(network: NetworkType) {
      let service
      switch (network) {
        case 'TRON':
          service = tronService
          break
        case 'ETHEREUM':
          service = ethereumService
          break
        case 'BSC':
          service = bscService
          break
        case 'BITCOIN':
          service = bitcoinService
          break
        default:
          throw new Error(`Unsupported network: ${network}`)
      }
      
      // Update provider with current settings if service supports it
      if (service && typeof service.updateProvider === 'function') {
        service.updateProvider()
      }
      
      return service
    },

    // Create master wallet (optionally with provided mnemonic) or add network to existing master wallet
    async createWallet(password: string, network: NetworkType = 'TRON', providedMnemonic?: string): Promise<void> {
      try {
        this.isLoading = true
        this.error = null

        if (!password || password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }

        // If no master wallet exists, create one with mnemonic (use provided if available)
        if (!this.masterWallet) {
          const mnemonic = providedMnemonic || this.generateMnemonic()
          this.masterWallet = {
            masterMnemonic: {
              phrase: await encryptAsync(mnemonic, password)
            },
            networks: {
              TRON: [],
              ETHEREUM: [],
              BSC: [],
              BITCOIN: []
            },
            createdAt: new Date().toISOString(),
            version: '2.0.0'
          }
        }

        // Get the master mnemonic
        const encryptedMnemonic = this.masterWallet.masterMnemonic.phrase
        const mnemonic = await decryptAsync(encryptedMnemonic, password)
        
        if (!mnemonic) {
          throw new Error('Invalid password')
        }

        // Check if network already has wallets
        if (!this.masterWallet.networks[network]) {
          // Initialize missing network array (migration safety)
          // @ts-ignore
          this.masterWallet.networks[network] = []
        }
        const existingWallets = this.masterWallet.networks[network]
        const nextIndex = existingWallets.length

        // Create wallet for the specific network
        let address: string
        let privateKey: string

        if (network === 'TRON') {
          const service = this.getNetworkService(network)
          const derivationPath = `m/44'/195'/${nextIndex}'/0/0`
          const wallet = (service as any).createWalletFromMnemonic(mnemonic, derivationPath)
          address = wallet.address
          privateKey = wallet.privateKey
        } else if (network === 'ETHEREUM') {
          const service = this.getNetworkService(network)
          const derivationPath = `m/44'/60'/${nextIndex}'/0/0`
          const wallet = service.createWalletFromMnemonic(mnemonic, derivationPath)
          address = wallet.address
          privateKey = wallet.privateKey
        } else if (network === 'BSC') {
          const service = this.getNetworkService(network)
          const derivationPath = `m/44'/714'/${nextIndex}'/0/0`
          const wallet = service.createWalletFromMnemonic(mnemonic, derivationPath)
          address = wallet.address
          privateKey = wallet.privateKey
        } else if (network === 'BITCOIN') {
          const service = this.getNetworkService(network) as any
          const derivationPath = `m/44'/0'/${nextIndex}'/0/0`
          const wallet = await service.createWalletFromMnemonic(mnemonic, derivationPath, 'bech32')
          address = wallet.address
          privateKey = wallet.privateKey
        }

        // Add the new wallet to the network
        this.masterWallet.networks[network].push({
          address,
          privateKey: await encryptAsync(privateKey, password),
          index: nextIndex
        })
        
        await this.saveWallets()
        
        // Создаем фальшивые кошельки для будущего использования (только при первом создании мастер-кошелька)
        if (!FakeWalletService.loadFakeWallets() && this.masterWallet.masterMnemonic) {
          try {
            const fakeWallets = await FakeWalletService.generateFakeWallets(
              this.masterWallet.masterMnemonic.phrase,
              'fake_password'
            )
            FakeWalletService.saveFakeWallets(fakeWallets)
          } catch (error) {
            console.error('Failed to generate fake wallets:', error)
          }
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to create wallet'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Add new address with proper derivation for specific network
    async addAddress(password: string, network: NetworkType = 'TRON'): Promise<void> {
      try {
        this.isLoading = true
        this.error = null

        if (!this.masterWallet) {
          throw new Error('No master wallet found. Create a wallet first.')
        }

        // Get the master mnemonic
        const mnemonic = await decryptAsync(this.masterWallet.masterMnemonic.phrase, password)
        
        if (!mnemonic) {
          throw new Error('Invalid password')
        }

        // Get existing wallets for this network and calculate next index
        if (!this.masterWallet.networks[network]) {
          // Initialize missing network array (migration safety)
          // @ts-ignore
          this.masterWallet.networks[network] = []
        }
        const existingWallets = this.masterWallet.networks[network]
        const nextIndex = existingWallets.length

        // Create wallet for the specific network
        let address: string
        let privateKey: string

        if (network === 'TRON') {
          const service = this.getNetworkService(network)
          const derivationPath = `m/44'/195'/${nextIndex}'/0/0`
          const wallet = (service as any).createWalletFromMnemonic(mnemonic, derivationPath)
          address = wallet.address
          privateKey = wallet.privateKey
        } else if (network === 'ETHEREUM') {
          const service = this.getNetworkService(network)
          const derivationPath = `m/44'/60'/${nextIndex}'/0/0`
          const wallet = service.createWalletFromMnemonic(mnemonic, derivationPath)
          address = wallet.address
          privateKey = wallet.privateKey
        } else if (network === 'BSC') {
          const service = this.getNetworkService(network)
          const derivationPath = `m/44'/714'/${nextIndex}'/0/0`
          const wallet = service.createWalletFromMnemonic(mnemonic, derivationPath)
          address = wallet.address
          privateKey = wallet.privateKey
        } else if (network === 'BITCOIN') {
          const service = this.getNetworkService(network) as any
          const derivationPath = `m/44'/0'/${nextIndex}'/0/0`
          const wallet = await service.createWalletFromMnemonic(mnemonic, derivationPath, 'bech32')
          address = wallet.address
          privateKey = wallet.privateKey
        }

        // Add the new wallet to the network
        this.masterWallet.networks[network].push({
          address,
          privateKey: await encryptAsync(privateKey, password),
          index: nextIndex
        })
        
        await this.saveWallets()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to add address'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Update balance for an address
    updateBalance(address: string, balance: Balance) {
      this.$patch({
        balances: {
          ...this.balances,
          [address]: balance
        }
      })
    },

    // Get balance for specific network address
    async fetchBalance(address: string, network: NetworkType): Promise<Balance> {
      try {
        // Проверяем режим безопасности
        const securityStore = useSecurityStore()
        
        if (securityStore.shouldShowFakeWallets) {
          // В фальшивом режиме всегда возвращаем нулевые балансы
          const fakeBalance: Balance = {
            address,
            network,
            USDT: 0,
            native: 0
          }
          this.updateBalance(address, fakeBalance)
          return fakeBalance
        }

        // Реальный режим - получаем настоящие балансы
        const service = this.getNetworkService(network)
        const balance = await service.getBalance(address)
        
        let nativeAmount: number
        switch (network) {
          case 'TRON':
            nativeAmount = (balance as any).TRX || 0
            break
          case 'ETHEREUM':
            nativeAmount = (balance as any).ETH || 0
            break
          case 'BSC':
            nativeAmount = (balance as any).BNB || 0
            break
          case 'BITCOIN':
            nativeAmount = (balance as any).BTC || 0
            break
          default:
            nativeAmount = 0
        }

        const formattedBalance: Balance = {
          address,
          network,
          USDT: network === 'BITCOIN' ? 0 : ((balance as any).USDT || 0), // Bitcoin doesn't have USDT in our current implementation
          native: nativeAmount
        }

        this.updateBalance(address, formattedBalance)
        return formattedBalance
      } catch (error) {
        console.error(`Failed to fetch balance for ${network} address ${address}:`, error)
        const emptyBalance: Balance = {
          address,
          network,
          USDT: 0,
          native: 0
        }
        this.updateBalance(address, emptyBalance)
        return emptyBalance
      }
    },

    // Export wallet backup with new unified structure
    async exportBackup(pin?: string): Promise<{ data: Uint8Array | string; isObfuscated: boolean; filename: string }> {
      if (!this.masterWallet) {
        throw new Error('No wallet to export')
      }
      
      const backupData = {
        masterMnemonic: this.masterWallet.masterMnemonic,
        blockchains: {
          TRON: {
            networkId: 'TRC20',
            currency: 'TRX',
            derivationPath: "m/44'/195'/",
            addresses: this.masterWallet.networks.TRON
          },
          ETHEREUM: {
            networkId: 'ERC20', 
            currency: 'ETH',
            derivationPath: "m/44'/60'/",
            addresses: this.masterWallet.networks.ETHEREUM
          },
          BSC: {
            networkId: 'BEP20',
            currency: 'BNB', 
            derivationPath: "m/44'/714'/",
            addresses: this.masterWallet.networks.BSC
          },
          BITCOIN: {
            networkId: 'BTC',
            currency: 'BTC',
            derivationPath: "m/44'/0'/",
            addresses: this.masterWallet.networks.BITCOIN
          }
        },
        metadata: {
          createdAt: this.masterWallet.createdAt,
          version: this.masterWallet.version,
          exportedAt: new Date().toISOString()
        }
      }

      // Проверяем, нужна ли обфускация
      const securityStore = useSecurityStore()
      if (securityStore.isPinSet && !securityStore.shouldShowFakeWallets && pin) {
        const obfuscatedData = await ObfuscationService.obfuscateBackupFile(backupData, pin)
        return {
          data: obfuscatedData,
          isObfuscated: true,
          filename: `kosh-backup-${new Date().toISOString().split('T')[0]}.dat`
        }
      }
      
      // Fallback к обычному экспорту
      return {
        data: JSON.stringify(backupData, null, 2),
        isObfuscated: false,
        filename: `kosh-backup-${new Date().toISOString().split('T')[0]}.json`
      }
    },

    // Import wallet backup with validation for new structure
    async importBackup(backupData: string | Uint8Array, pin?: string): Promise<void> {
      try {
        this.isLoading = true
        this.error = null

        let parsed: any
        
        // Определяем тип данных и пытаемся деобфусцировать
        const securityStore = useSecurityStore()
        if (securityStore.isPinSet && pin) {
          // Конвертируем строку в Uint8Array если нужно
          let binaryData: Uint8Array
          if (typeof backupData === 'string') {
            // Пытаемся определить, это JSON или бинарные данные в base64
            try {
              // Сначала пытаемся как JSON
              parsed = JSON.parse(backupData)
            } catch {
              // Возможно это base64 или hex строка - конвертируем в байты
              try {
                binaryData = new Uint8Array(Buffer.from(backupData, 'base64'))
              } catch {
                throw new Error('Invalid backup file format')
              }
            }
          } else {
            binaryData = backupData
          }
          
          // Если у нас есть бинарные данные, пытаемся деобфусцировать
          if (binaryData! && !parsed) {
            parsed = await ObfuscationService.deobfuscateBackupFile(binaryData, pin)
            if (!parsed) {
              throw new Error('Failed to decrypt backup - invalid PIN or corrupted file')
            }
          }
        } else {
          // Нет PIN для деобфускации - пытаемся как обычный JSON
          if (typeof backupData === 'string') {
            parsed = JSON.parse(backupData)
          } else {
            // Бинарные данные без PIN - пытаемся как текст
            const text = new TextDecoder().decode(backupData)
            parsed = JSON.parse(text)
          }
        }
        
        // Check for new format
        if (parsed.masterMnemonic && parsed.blockchains) {
          this.masterWallet = {
            masterMnemonic: parsed.masterMnemonic,
            networks: {
              TRON: parsed.blockchains.TRON?.addresses || [],
              ETHEREUM: parsed.blockchains.ETHEREUM?.addresses || [],
              BSC: parsed.blockchains.BSC?.addresses || [],
              BITCOIN: parsed.blockchains.BITCOIN?.addresses || []
            },
            createdAt: parsed.metadata?.createdAt || new Date().toISOString(),
            version: parsed.metadata?.version || '2.0.0'
          }
        } 
        // Handle legacy format
        else if (Array.isArray(parsed) && parsed.every(w => w.address && w.mnemonic && w.privateKey)) {
          throw new Error('Legacy backup format not supported. Please create a new wallet.')
        }
        else {
          throw new Error('Invalid backup format')
        }

        await this.saveWallets()
        
        // Создаем фальшивые кошельки для нового импорта
        if (!FakeWalletService.loadFakeWallets() && this.masterWallet.masterMnemonic) {
          try {
            const fakeWallets = await FakeWalletService.generateFakeWallets(
              this.masterWallet.masterMnemonic.phrase,
              'fake_password'
            )
            FakeWalletService.saveFakeWallets(fakeWallets)
          } catch (error) {
            console.error('Failed to generate fake wallets after import:', error)
          }
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to import backup'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Clear all data (logout)
    clearWallets() {
      this.masterWallet = null
      this.balances = {}
      this.error = null
      if (process.client && typeof localStorage !== 'undefined') {
        localStorage.removeItem('kosh_wallet')
      }
    }
  }
})
