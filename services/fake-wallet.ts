// services/fake-wallet.ts
import * as bip39 from 'bip39'
import { tronService } from './tron'
import { ethereumService } from './ethereum'
import { bscService } from './bsc'
import { bitcoinService } from './bitcoin'
import type { NetworkType } from '~/stores/wallet'

interface FakeWalletData {
  masterMnemonic: {
    phrase: string // зашифрованный обратный мнемоник
  }
  networks: {
    TRON: Array<{ address: string; privateKey: string; index: number }>
    ETHEREUM: Array<{ address: string; privateKey: string; index: number }>
    BSC: Array<{ address: string; privateKey: string; index: number }>
    BITCOIN: Array<{ address: string; privateKey: string; index: number }>
  }
  createdAt: string
  version: string
}

interface FakeBalance {
  address: string
  network: NetworkType
  USDT: number
  native: number
}

export class FakeWalletService {
  
  // Создание обратного мнемоника из реального
  static createReverseMnemonic(realMnemonic: string): string {
    return realMnemonic.split(' ').reverse().join(' ')
  }

  // Генерация фальшивых кошельков из обратного мнемоника
  static async generateFakeWallets(realEncryptedMnemonic: string, password: string): Promise<FakeWalletData> {
    try {
      // Расшифровываем реальный мнемоник (используем тот же метод что в wallet store)
      const [salt, encrypted] = realEncryptedMnemonic?.split(':')
      if (!salt || !encrypted) {
        throw new Error('Invalid mnemonic format')
      }
      
      const CryptoJS = await import('crypto-js')
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString()
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, key)
      const realMnemonic = decrypted.toString(CryptoJS.enc.Utf8)
      
      if (!realMnemonic) {
        throw new Error('Failed to decrypt mnemonic')
      }

      // Создаем обратный мнемоник
      const reverseMnemonic = this.createReverseMnemonic(realMnemonic)
      
      // Шифруем обратный мнемоник тем же паролем
      const newSalt = CryptoJS.lib.WordArray.random(128/8).toString()
      const newKey = CryptoJS.PBKDF2(password, newSalt, {
        keySize: 256/32,
        iterations: 10000
      }).toString()
      const encryptedReverse = CryptoJS.AES.encrypt(reverseMnemonic, newKey).toString()

      // Генерируем фальшивые кошельки для всех сетей
      const fakeWallets: FakeWalletData = {
        masterMnemonic: {
          phrase: newSalt + ':' + encryptedReverse
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

      // Создаем по одному кошельку для каждой сети
      const networks: NetworkType[] = ['TRON', 'ETHEREUM', 'BSC', 'BITCOIN']
      
      for (const network of networks) {
        const wallet = await this.createFakeWalletForNetwork(reverseMnemonic, network, 0, password)
        fakeWallets.networks[network].push(wallet)
      }

      return fakeWallets
      
    } catch (error) {
      console.error('Failed to generate fake wallets:', error)
      // В случае ошибки возвращаем пустую структуру
      return this.createEmptyFakeWallet()
    }
  }

  // Создание фальшивого кошелька для конкретной сети
  static async createFakeWalletForNetwork(
    reverseMnemonic: string, 
    network: NetworkType, 
    index: number,
    password: string
  ) {
    let address: string
    let privateKey: string

    try {
      if (network === 'TRON') {
        const derivationPath = `m/44'/195'/${index}'/0/0`
        const wallet = (tronService as any).createWalletFromMnemonic(reverseMnemonic, derivationPath)
        address = wallet.address
        privateKey = wallet.privateKey
      } else if (network === 'ETHEREUM') {
        const derivationPath = `m/44'/60'/${index}'/0/0`
        const wallet = ethereumService.createWalletFromMnemonic(reverseMnemonic, derivationPath)
        address = wallet.address
        privateKey = wallet.privateKey
      } else if (network === 'BSC') {
        const derivationPath = `m/44'/714'/${index}'/0/0`
        const wallet = bscService.createWalletFromMnemonic(reverseMnemonic, derivationPath)
        address = wallet.address
        privateKey = wallet.privateKey
      } else if (network === 'BITCOIN') {
        const derivationPath = `m/44'/0'/${index}'/0/0`
        const wallet = await (bitcoinService as any).createWalletFromMnemonic(reverseMnemonic, derivationPath, 'bech32')
        address = wallet.address
        privateKey = wallet.privateKey
      } else {
        throw new Error(`Unsupported network: ${network}`)
      }

      // Шифруем приватный ключ
      const CryptoJS = await import('crypto-js')
      const salt = CryptoJS.lib.WordArray.random(128/8).toString()
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString()
      const encryptedPrivateKey = salt + ':' + CryptoJS.AES.encrypt(privateKey, key).toString()

      return {
        address,
        privateKey: encryptedPrivateKey,
        index
      }
    } catch (error) {
      console.error(`Failed to create fake wallet for ${network}:`, error)
      // Возвращаем заглушку в случае ошибки
      return {
        address: this.generateFakeAddress(network),
        privateKey: 'fake:encrypted:key',
        index
      }
    }
  }

  // Генерация фальшивого адреса как заглушка
  static generateFakeAddress(network: NetworkType): string {
    const random = Math.random().toString(36).substring(2, 15)
    
    switch (network) {
      case 'TRON':
        return 'T' + random.padEnd(33, '0').toUpperCase()
      case 'ETHEREUM':
      case 'BSC':
        return '0x' + random.padEnd(40, '0')
      case 'BITCOIN':
        return 'bc1' + random.padEnd(39, '0')
      default:
        return 'fake_' + random
    }
  }

  // Создание пустой структуры фальшивых кошельков
  static createEmptyFakeWallet(): FakeWalletData {
    return {
      masterMnemonic: {
        phrase: 'fake:empty:mnemonic'
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

  // Генерация фальшивых балансов (всегда нули)
  static generateFakeBalance(address: string, network: NetworkType): FakeBalance {
    return {
      address,
      network,
      USDT: 0,
      native: 0
    }
  }

  // Сохранение фальшивых кошельков в отдельном ключе localStorage
  static saveFakeWallets(fakeWallets: FakeWalletData): void {
    try {
      localStorage.setItem('app_temp_cache', JSON.stringify(fakeWallets))
    } catch (error) {
      console.error('Failed to save fake wallets:', error)
    }
  }

  // Загрузка фальшивых кошельков
  static loadFakeWallets(): FakeWalletData | null {
    try {
      const stored = localStorage.getItem('app_temp_cache')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load fake wallets:', error)
    }
    return null
  }

  // Очистка фальшивых данных
  static clearFakeWallets(): void {
    localStorage.removeItem('app_temp_cache')
  }
}
