// stores/security.ts
import { defineStore } from 'pinia'
import * as CryptoJS from 'crypto-js'

interface SecurityState {
  isPinSet: boolean
  isUnlocked: boolean
  isFakeMode: boolean
  correctPinHash: string | null
}

export const useSecurityStore = defineStore('security', {
  state: (): SecurityState => ({
    isPinSet: false,
    isUnlocked: false,
    isFakeMode: false,
    correctPinHash: null
  }),

  getters: {
    needsPinSetup: (state) => !state.isPinSet,
    isLocked: (state) => state.isPinSet && !state.isUnlocked,
    shouldShowFakeWallets: (state) => state.isFakeMode
  },

  actions: {
    // Инициализация - загрузка PIN из localStorage
    async initialize() {
      try {
        // Only run on client side
        if (typeof window === 'undefined' || !process.client) {
          return
        }
        
        if (typeof localStorage !== 'undefined') {
          const storedPin = localStorage.getItem('app_sec_config')
          if (storedPin) {
            this.correctPinHash = storedPin
            this.isPinSet = true
          }
        }
      } catch (error) {
        console.error('Failed to load security config:', error)
      }
    },

    // Установка PIN (первичная настройка)
    setPIN(pin: string): void {
      if (!pin || pin.length !== 6) {
        throw new Error('PIN must be 6 digits')
      }

      // Хешируем PIN с солью для безопасности
      const salt = CryptoJS.lib.WordArray.random(128/8).toString()
      const hash = CryptoJS.PBKDF2(pin, salt, {
        keySize: 256/32,
        iterations: 5000
      }).toString()
      
      this.correctPinHash = salt + ':' + hash
      this.isPinSet = true
      this.isUnlocked = true
      this.isFakeMode = false

      // Сохраняем в localStorage под обфусцированным ключом
      if (process.client && typeof localStorage !== 'undefined') {
        localStorage.setItem('app_sec_config', this.correctPinHash)
      }
    },

    // Проверка PIN - всегда возвращает true, но устанавливает режим
    verifyPIN(pin: string): boolean {
      if (!this.correctPinHash || !pin) {
        this.isFakeMode = true
        this.isUnlocked = true
        return true
      }

      try {
        const [salt, hash] = this.correctPinHash.split(':')
        const inputHash = CryptoJS.PBKDF2(pin, salt, {
          keySize: 256/32,
          iterations: 5000
        }).toString()

        if (inputHash === hash) {
          // Правильный PIN - реальный режим
          this.isFakeMode = false
          this.isUnlocked = true
        } else {
          // Неправильный PIN - фальшивый режим (тихо)
          this.isFakeMode = true
          this.isUnlocked = true
        }

        return true // Всегда успешно
      } catch (error) {
        // При любой ошибке - фальшивый режим
        this.isFakeMode = true
        this.isUnlocked = true
        return true
      }
    },

    // Блокировка приложения (при закрытии окна)
    lockApp(): void {
      this.isUnlocked = false
      this.isFakeMode = false
    },

    // Сброс PIN (для настроек)
    resetPIN(): void {
      this.correctPinHash = null
      this.isPinSet = false
      this.isUnlocked = false
      this.isFakeMode = false
      if (process.client && typeof localStorage !== 'undefined') {
        localStorage.removeItem('app_sec_config')
      }
    },

    // Проверка, установлен ли PIN
    checkPinExists(): boolean {
      if (process.client && typeof localStorage !== 'undefined') {
        return !!localStorage.getItem('app_sec_config')
      }
      return false
    }
  }
})
