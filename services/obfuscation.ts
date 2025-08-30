// services/obfuscation.ts
import * as CryptoJS from 'crypto-js'

export class ObfuscationService {
  private static readonly REAL_DATA_KEY = 'kosh_wallet'
  private static readonly OBFUSCATED_KEYS = [
    'app_cache_data',
    'user_preferences', 
    'session_storage',
    'temp_config',
    'browser_cache'
  ]

  // WebCrypto helpers for AES-GCM
  private static getSubtle(): SubtleCrypto {
    const anyGlobal: any = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : {})
    if (!anyGlobal.crypto || !anyGlobal.crypto.subtle) {
      throw new Error('WebCrypto not available')
    }
    return anyGlobal.crypto.subtle
  }

  private static toBytes(str: string): Uint8Array { return new TextEncoder().encode(str) }
  private static fromBytes(buf: ArrayBuffer): string { return new TextDecoder().decode(buf) }
  private static b64encode(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }
  private static b64decode(b64: string): Uint8Array {
    const bin = atob(b64); const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  private static hexToBytes(hex: string): Uint8Array {
    const clean = hex.length % 2 ? '0' + hex : hex
    const out = new Uint8Array(clean.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
    return out
  }
  private static async deriveAeadKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const subtle = this.getSubtle()
    const baseKey = await subtle.importKey('raw', this.toBytes(password), { name: 'PBKDF2' }, false, ['deriveKey'])
    return await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  }

  // Генерация случайного ключа для localStorage
  private static generateRandomKey(): string {
    const prefixes = ['app_', 'user_', 'cache_', 'temp_', 'session_', 'browser_', 'config_']
    const suffixes = ['data', 'cache', 'config', 'prefs', 'storage', 'temp', 'info']
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    const random = Math.random().toString(36).substring(2, 8)
    
    return `${prefix}${suffix}_${random}`
  }

  // Создание ложных данных для маскировки
  private static generateDecoyData(): any {
    const decoyTypes = [
      // Поддельные настройки приложения
      {
        theme: 'dark',
        language: 'en',
        lastUpdate: new Date().toISOString(),
        version: '1.2.3'
      },
      // Поддельный кеш
      {
        cached_at: Date.now(),
        expires: Date.now() + 86400000,
        data: btoa(Math.random().toString())
      },
      // Поддельные пользовательские данные
      {
        user_id: Math.random().toString(36).substring(2),
        session_token: btoa(Math.random().toString()),
        last_login: new Date().toISOString()
      }
    ]
    
    return decoyTypes[Math.floor(Math.random() * decoyTypes.length)]
  }

  // Фрагментация данных на части
  private static fragmentData(data: string, pin: string): Record<string, string> {
    const fragments: Record<string, string> = {}
    const chunkSize = Math.floor(data.length / 3) + 1
    
    // Разбиваем данные на 3 части
    for (let i = 0; i < 3; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, data.length)
      const fragment = data.substring(start, end)
      
      if (fragment) {
        const key = this.generateRandomKey()
        const encrypted = this.encryptFragment(fragment, pin, i)
        fragments[key] = encrypted
      }
    }
    
    return fragments
  }

  // Шифрование фрагмента с индексом
  private static encryptFragment(fragment: string, pin: string, index: number): string {
    const salt = CryptoJS.lib.WordArray.random(128/8).toString()
    const key = CryptoJS.PBKDF2(pin + index.toString(), salt, {
      keySize: 256/32,
      iterations: 50000
    }).toString()
    
    const encrypted = CryptoJS.AES.encrypt(fragment, key).toString()
    return `${index}:${salt}:${encrypted}`
  }

  // Расшифровка фрагмента
  private static decryptFragment(encryptedFragment: string, pin: string): string | null {
    try {
      const [indexStr, salt, encrypted] = encryptedFragment.split(':')
      const index = parseInt(indexStr)
      
      const key = CryptoJS.PBKDF2(pin + index.toString(), salt, {
        keySize: 256/32,
        iterations: 50000
      }).toString()
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, key)
      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      return null
    }
  }

  // Обфускация и сохранение данных
  static obfuscateAndSave(data: any, pin: string): void {
    try {
      // Удаляем старый ключ если существует
      localStorage.removeItem(this.REAL_DATA_KEY)
      
      // Сериализуем данные
      const serialized = JSON.stringify(data)
      
      // Фрагментируем и шифруем
      const fragments = this.fragmentData(serialized, pin)
      
      // Сохраняем фрагменты под случайными ключами
      Object.entries(fragments).forEach(([key, fragment]) => {
        localStorage.setItem(key, fragment)
      })
      
      // Создаем индекс фрагментов (тоже обфусцированный)
      const indexKey = this.generateRandomKey()
      const indexData = {
        keys: Object.keys(fragments),
        timestamp: Date.now()
      }
      
      const indexSalt = CryptoJS.lib.WordArray.random(128/8).toString()
      const indexEncKey = CryptoJS.PBKDF2(pin + 'index', indexSalt, {
        keySize: 256/32,
        iterations: 50000
      }).toString()
      
      const encryptedIndex = CryptoJS.AES.encrypt(JSON.stringify(indexData), indexEncKey).toString()
      localStorage.setItem('app_index_cache', `${indexSalt}:${encryptedIndex}`)
      
      // Добавляем ложные записи для маскировки
      this.createDecoyEntries()
      
    } catch (error) {
      console.error('Failed to obfuscate data:', error)
      // Fallback - сохраняем обычным способом
      localStorage.setItem(this.REAL_DATA_KEY, JSON.stringify(data))
    }
  }

  // Деобфускация и загрузка данных
  static deobfuscateAndLoad(pin: string): any | null {
    try {
      // Загружаем индекс фрагментов
      const indexData = localStorage.getItem('app_index_cache')
      if (!indexData) {
        // Fallback - пробуем загрузить по старому ключу
        const fallback = localStorage.getItem(this.REAL_DATA_KEY)
        return fallback ? JSON.parse(fallback) : null
      }
      
      const [indexSalt, encryptedIndex] = indexData.split(':')
      const indexEncKey = CryptoJS.PBKDF2(pin + 'index', indexSalt, {
        keySize: 256/32,
        iterations: 50000
      }).toString()
      
      const decryptedIndex = CryptoJS.AES.decrypt(encryptedIndex, indexEncKey)
      const indexInfo = JSON.parse(decryptedIndex.toString(CryptoJS.enc.Utf8))
      
      // Загружаем и расшифровываем фрагменты
      const fragments: Array<{ index: number; data: string }> = []
      
      for (const key of indexInfo.keys) {
        const encryptedFragment = localStorage.getItem(key)
        if (encryptedFragment) {
          const decrypted = this.decryptFragment(encryptedFragment, pin)
          if (decrypted) {
            const index = parseInt(encryptedFragment.split(':')[0])
            fragments.push({ index, data: decrypted })
          }
        }
      }
      
      // Собираем данные в правильном порядке
      fragments.sort((a, b) => a.index - b.index)
      const reconstructed = fragments.map(f => f.data).join('')
      
      return JSON.parse(reconstructed)
      
    } catch (error) {
      console.error('Failed to deobfuscate data:', error)
      return null
    }
  }

  // Создание ложных записей
  private static createDecoyEntries(): void {
    const decoyCount = Math.floor(Math.random() * 5) + 3 // 3-7 ложных записей
    
    for (let i = 0; i < decoyCount; i++) {
      const key = this.generateRandomKey()
      const decoyData = this.generateDecoyData()
      
      try {
        localStorage.setItem(key, JSON.stringify(decoyData))
      } catch (error) {
        // Игнорируем ошибки с ложными данными
      }
    }
  }

  // Очистка всех обфусцированных данных
  static clearObfuscatedData(): void {
    try {
      // Удаляем индекс
      localStorage.removeItem('app_index_cache')
      
      // Удаляем все ключи, которые могут быть нашими
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('app_') || 
          key.startsWith('user_') || 
          key.startsWith('cache_') || 
          key.startsWith('temp_') ||
          key.startsWith('session_') ||
          key.startsWith('browser_') ||
          key.startsWith('config_')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
    } catch (error) {
      console.error('Failed to clear obfuscated data:', error)
    }
  }

  // Проверка, существуют ли обфусцированные данные
  static hasObfuscatedData(): boolean {
    return !!localStorage.getItem('app_index_cache')
  }

  // Полная обфускация файла резервной копии в бинарный формат
  static async obfuscateBackupFile(backupData: any, pin: string): Promise<Uint8Array> {
    try {
      // Сериализуем оригинальные данные (все поля остаются нетронутыми)
      const originalJson = JSON.stringify(backupData, null, 2)
      
      // Создаем соль для шифрования
      const salt = CryptoJS.lib.WordArray.random(32).toString() // 256-bit salt
      
      // AES-GCM (v2) шифрование: payload = v2:base64(iv):base64(ciphertext)
      const anyGlobal: any = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : {})
      const iv = new Uint8Array(12)
      if (anyGlobal.crypto && anyGlobal.crypto.getRandomValues) anyGlobal.crypto.getRandomValues(iv)
      const saltBytes = this.hexToBytes(salt)
      const subtle = this.getSubtle()
      const aeadKey = await this.deriveAeadKey(pin, saltBytes)
      const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, aeadKey, this.toBytes(originalJson))
      const encrypted = `v2:${this.b64encode(iv)}:${this.b64encode(ct)}`
      
      // Создаем заголовок с магическими байтами и версией
      const header = {
        magic: 'KOSH',        // 4 байта - магические байты
        version: 1,           // 4 байта - версия формата  
        saltLength: salt.length, // 4 байта - длина соли
        salt: salt,           // переменная длина - соль
        dataLength: encrypted.length // 4 байта - длина зашифрованных данных
      }
      
      // Добавляем случайные байты в начало и конец для маскировки
      const randA = new Uint32Array(1)
      const randB = new Uint32Array(1)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randA)
        crypto.getRandomValues(randB)
      } else {
        randA[0] = Math.floor(Math.random() * 0xffffffff)
        randB[0] = Math.floor(Math.random() * 0xffffffff)
      }
      const randomPrefix = this.generateRandomBytes(16 + (randA[0] % 32))
      const randomSuffix = this.generateRandomBytes(16 + (randB[0] % 32))
      
      // Собираем бинарные данные
      const headerBytes = this.encodeHeader(header)
      const encryptedBytes = new TextEncoder().encode(encrypted)
      
      // Финальный бинарный файл: [random_prefix][header][encrypted_data][random_suffix]
      const totalLength = randomPrefix.length + headerBytes.length + encryptedBytes.length + randomSuffix.length
      const result = new Uint8Array(totalLength)
      
      let offset = 0
      result.set(randomPrefix, offset)
      offset += randomPrefix.length
      
      result.set(headerBytes, offset)
      offset += headerBytes.length
      
      result.set(encryptedBytes, offset)
      offset += encryptedBytes.length
      
      result.set(randomSuffix, offset)
      
      return result
    } catch (error) {
      console.error('Failed to obfuscate backup:', error)
      // Fallback - возвращаем обычный JSON как байты
      const fallback = JSON.stringify(backupData, null, 2)
      return new TextEncoder().encode(fallback)
    }
  }

  // Деобфускация бинарного файла обратно в JSON
  static async deobfuscateBackupFile(binaryData: Uint8Array, pin: string): Promise<any | null> {
    try {
      // Ищем магические байты KOSH в файле
      const magicBytes = new TextEncoder().encode('KOSH')
      let headerStart = -1
      
      for (let i = 0; i <= binaryData.length - magicBytes.length; i++) {
        let found = true
        for (let j = 0; j < magicBytes.length; j++) {
          if (binaryData[i + j] !== magicBytes[j]) {
            found = false
            break
          }
        }
        if (found) {
          headerStart = i
          break
        }
      }
      
      if (headerStart === -1) {
        // Не найдены магические байты - возможно обычный JSON
        const text = new TextDecoder().decode(binaryData)
        return JSON.parse(text)
      }
      
      // Декодируем заголовок
      const header = this.decodeHeader(binaryData, headerStart)
      if (!header) {
        throw new Error('Invalid header format')
      }
      
      // Извлекаем зашифрованные данные
      const dataStart = headerStart + this.getHeaderSize(header)
      const encryptedBytes = binaryData.slice(dataStart, dataStart + header.dataLength)
      const encrypted = new TextDecoder().decode(encryptedBytes)
      
      // Проверяем формат v2 (AES-GCM) или legacy (CryptoJS)
      if (encrypted.startsWith('v2:')) {
        const parts = encrypted.split(':')
        if (parts.length !== 3) throw new Error('Invalid v2 payload')
        const iv = this.b64decode(parts[1])
        const ct = this.b64decode(parts[2])
        const saltBytes = this.hexToBytes(header.salt)
        const key = await this.deriveAeadKey(pin, saltBytes)
        const ptBuf = await this.getSubtle().decrypt({ name: 'AES-GCM', iv }, key, ct)
        const originalJson = this.fromBytes(ptBuf)
        return JSON.parse(originalJson)
      }
      
      // Legacy fallback: CryptoJS AES (string ciphertext)
      const keyLegacy = CryptoJS.PBKDF2(pin, header.salt, {
        keySize: 256/32,
        iterations: 10000
      }).toString()
      const decrypted = CryptoJS.AES.decrypt(encrypted, keyLegacy)
      const originalJson = decrypted.toString(CryptoJS.enc.Utf8)
      
      if (!originalJson) {
        throw new Error('Failed to decrypt - invalid PIN')
      }
      
      return JSON.parse(originalJson)
      
    } catch (error) {
      console.error('Failed to deobfuscate backup:', error)
      return null
    }
  }



  // Генерация случайных байтов
  private static generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes)
    } else {
      for (let i = 0; i < length; i++) bytes[i] = (Math.random() * 256) & 0xff
    }
    return bytes
  }

  // Кодирование заголовка в байты
  private static encodeHeader(header: any): Uint8Array {
    const magicBytes = new TextEncoder().encode(header.magic) // 4 байта
    const versionBytes = new Uint8Array(4) // 4 байта
    const saltLengthBytes = new Uint8Array(4) // 4 байта  
    const dataLengthBytes = new Uint8Array(4) // 4 байта
    const saltBytes = new TextEncoder().encode(header.salt)
    
    // Записываем версию (little-endian)
    const versionView = new DataView(versionBytes.buffer)
    versionView.setUint32(0, header.version, true)
    
    // Записываем длину соли (little-endian)
    const saltLengthView = new DataView(saltLengthBytes.buffer)
    saltLengthView.setUint32(0, header.saltLength, true)
    
    // Записываем длину данных (little-endian)
    const dataLengthView = new DataView(dataLengthBytes.buffer)
    dataLengthView.setUint32(0, header.dataLength, true)
    
    // Собираем заголовок
    const totalLength = magicBytes.length + versionBytes.length + saltLengthBytes.length + saltBytes.length + dataLengthBytes.length
    const result = new Uint8Array(totalLength)
    
    let offset = 0
    result.set(magicBytes, offset)
    offset += magicBytes.length
    
    result.set(versionBytes, offset)
    offset += versionBytes.length
    
    result.set(saltLengthBytes, offset)
    offset += saltLengthBytes.length
    
    result.set(saltBytes, offset)
    offset += saltBytes.length
    
    result.set(dataLengthBytes, offset)
    
    return result
  }

  // Декодирование заголовка из байтов
  private static decodeHeader(data: Uint8Array, offset: number): any | null {
    try {
      let pos = offset
      
      // Читаем магические байты (уже проверены)
      pos += 4
      
      // Читаем версию
      const versionView = new DataView(data.buffer, data.byteOffset + pos, 4)
      const version = versionView.getUint32(0, true)
      pos += 4
      
      // Читаем длину соли
      const saltLengthView = new DataView(data.buffer, data.byteOffset + pos, 4)
      const saltLength = saltLengthView.getUint32(0, true)
      pos += 4
      
      // Читаем соль
      const saltBytes = data.slice(pos, pos + saltLength)
      const salt = new TextDecoder().decode(saltBytes)
      pos += saltLength
      
      // Читаем длину данных
      const dataLengthView = new DataView(data.buffer, data.byteOffset + pos, 4)
      const dataLength = dataLengthView.getUint32(0, true)
      
      return {
        magic: 'KOSH',
        version,
        saltLength,
        salt,
        dataLength
      }
    } catch (error) {
      console.error('Failed to decode header:', error)
      return null
    }
  }

  // Получение размера заголовка
  private static getHeaderSize(header: any): number {
    return 4 + 4 + 4 + header.saltLength + 4 // magic + version + saltLength + salt + dataLength
  }

  // Генерация поддельной контрольной суммы
  private static generateFakeChecksum(): string {
    return CryptoJS.SHA256(Math.random().toString()).toString().substring(0, 16)
  }
}
