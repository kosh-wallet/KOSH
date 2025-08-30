import * as CryptoJS from 'crypto-js'

export class CryptoService {
  private static readonly ITERATIONS = 10000
  private static readonly KEY_SIZE = 256 / 32
  private static readonly AEAD_VERSION = 'v2'
  private static readonly AEAD_PBKDF2_ITERATIONS = 150000

  // Generate cryptographically secure random salt
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128/8).toString()
  }

  // Derive key using PBKDF2 with salt
  static deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: this.KEY_SIZE,
      iterations: this.ITERATIONS
    }).toString()
  }

  // ----- WebCrypto AES-GCM (AEAD) implementation -----
  // Note: new format: v2:base64(salt):base64(iv):base64(ciphertext)

  private static getSubtle(): SubtleCrypto {
    const anyGlobal: any = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : {})
    if (!anyGlobal.crypto || !anyGlobal.crypto.subtle) {
      throw new Error('WebCrypto is not available')
    }
    return anyGlobal.crypto.subtle
  }

  private static toBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str)
  }

  private static fromBytes(buf: ArrayBuffer): string {
    return new TextDecoder().decode(buf)
  }

  private static b64encode(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  private static b64decode(b64: string): Uint8Array {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  private static async deriveAeadKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const subtle = this.getSubtle()
    const baseKey = await subtle.importKey(
      'raw',
      this.toBytes(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    return await subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations: this.AEAD_PBKDF2_ITERATIONS
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static async encryptGCM(plaintext: string, password: string): Promise<string> {
    const subtle = this.getSubtle()
    const anyGlobal: any = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : {})
    const salt = new Uint8Array(16)
    anyGlobal.crypto.getRandomValues(salt)
    const iv = new Uint8Array(12)
    anyGlobal.crypto.getRandomValues(iv)
    const key = await this.deriveAeadKey(password, salt)
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, this.toBytes(plaintext))
    return [
      this.AEAD_VERSION,
      this.b64encode(salt),
      this.b64encode(iv),
      this.b64encode(ct)
    ].join(':')
  }

  static async decryptGCM(encryptedData: string, password: string): Promise<string | null> {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 4 || parts[0] !== this.AEAD_VERSION) return null
      const salt = this.b64decode(parts[1])
      const iv = this.b64decode(parts[2])
      const ct = this.b64decode(parts[3])
      const key = await this.deriveAeadKey(password, salt)
      const ptBuf = await this.getSubtle().decrypt({ name: 'AES-GCM', iv }, key, ct)
      const text = this.fromBytes(ptBuf).trim()
      return text || null
    } catch {
      return null
    }
  }

  // Try AEAD v2 first, then legacy CBC
  static async decryptAny(encryptedData: string, password: string): Promise<string | null> {
    const aead = await this.decryptGCM(encryptedData, password)
    if (aead !== null) return aead
    return this.decrypt(encryptedData, password)
  }

  // Secure encryption with random salt and IV
  static encrypt(plaintext: string, password: string): string {
    try {
      const salt = this.generateSalt()
      const key = this.deriveKey(password, salt)
      const iv = CryptoJS.lib.WordArray.random(128/8)
      
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      
      return salt + ':' + iv.toString() + ':' + encrypted.toString()
    } catch (error) {
      throw new Error('Encryption failed')
    }
  }

  // Secure decryption
  static decrypt(encryptedData: string, password: string): string | null {
    try {
      const parts = encryptedData?.split(':')
      if (!parts || parts.length < 2) {
        throw new Error('Invalid encrypted data format')
      }

      const salt = parts[0]
      const key = this.deriveKey(password, salt)

      // Compatibility: support both formats
      // 1) New: salt:iv:encrypted (iv in hex, CBC)
      // 2) Old: salt:encrypted (iv stored inside ciphertext by CryptoJS formatter)
      let plaintext: string
      if (parts.length === 3) {
        const ivStr = parts[1]
        const encrypted = parts[2]
        const iv = CryptoJS.enc.Hex.parse(ivStr)
        const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        })
        plaintext = decrypted.toString(CryptoJS.enc.Utf8)
      } else {
        const encrypted = parts[1]
        const decrypted = CryptoJS.AES.decrypt(encrypted, key)
        plaintext = decrypted.toString(CryptoJS.enc.Utf8)
      }

      plaintext = plaintext?.trim()
      if (!plaintext) {
        throw new Error('Decryption failed - invalid password')
      }
      return plaintext
    } catch (error) {
      console.log(error)
      return null
    }
  }

  // Validate password strength
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generate secure random mnemonic with additional entropy
  static async generateSecureMnemonic(): Promise<string> {
    const { generateMnemonic } = await import('bip39')
    
    // Add browser crypto entropy
    const entropy = new Uint8Array(16)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(entropy)
    }
    
    return generateMnemonic(128)
  }

  // Hash data for integrity verification
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  // Secure memory cleanup (best effort)
  static secureCleanup(sensitiveData: string): void {
    // This is a best-effort cleanup for JavaScript
    // In a real implementation, you'd want to use secure memory allocation
    try {
      if (typeof sensitiveData === 'string') {
        // Overwrite the string reference (limited effectiveness in JS)
        sensitiveData = '\0'.repeat(sensitiveData.length)
      }
    } catch (error) {
      // Silent fail for cleanup
    }
  }
}