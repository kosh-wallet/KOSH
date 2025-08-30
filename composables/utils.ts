import { CryptoService } from '~/services/crypto'

export const decrypt = (message: string, password: string): string | null => {
    return CryptoService.decrypt(message, password)
}

// Async AEAD wrappers
export const encryptAsync = async (message: string, password: string): Promise<string> => {
    return await CryptoService.encryptGCM(message, password)
}

export const decryptAsync = async (message: string, password: string): Promise<string | null> => {
    return await CryptoService.decryptAny(message, password)
}

export const validatePassword = (password: string) => {
    return CryptoService.validatePassword(password)
}

// Legacy function for backward compatibility
const isJsonString = (str: string): boolean => {
    try {
        JSON.parse(str)
        return true
    } catch (e) {
        return false
    }
}

export { isJsonString }

