import { tronService } from '~/services/tron'
import { ethereumService } from '~/services/ethereum'
import { bscService } from '~/services/bsc'
import type { NetworkType } from '~/stores/wallet'

export default defineNuxtPlugin(() => {
	return {
		provide: {
			// Normalization and validation of private key for EVM (Ethereum/BSC)
			// Returns canonical '0x' + 64 hex or null if format is incorrect
			normalizeEvmPrivateKey: (key: string): string | null => {
				try {
					if (!key) return null
					let k = String(key).trim()
					// remove quotes and spaces
					if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
						k = k.slice(1, -1)
					}
					k = k.replace(/\s+/g, '')
					if (k.startsWith('0x') || k.startsWith('0X')) {
						k = k.slice(2)
					}
					if (!/^[0-9a-fA-F]+$/.test(k)) return null
					if (k.length !== 64) return null
					return `0x${k.toLowerCase()}`
				} catch {
					return null
				}
			},
			stripExtraDecimals: (mynumber: number) => {
				if (!mynumber) return '0.00'
				// For crypto amounts, show more precision for small amounts
				if (mynumber < 0.01) {
					// Show up to 8 decimals for small amounts, remove trailing zeros
					return mynumber.toFixed(8).replace(/\.?0+$/, '')
				} else {
					// Show up to 4 decimals for larger amounts, remove trailing zeros
					return mynumber.toFixed(4).replace(/\.?0+$/, '')
				}
			},
			checkBalance: async (address: string, network: NetworkType = 'TRON') => {
				try {
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
						default:
							throw new Error(`Unsupported network: ${network}`)
					}
					
					if (!address || !service.isValidAddress(address)) {
						throw new Error('Invalid address')
					}
					return await service.getBalance(address)
				} catch (error) {
					console.error('Balance check failed for', address, 'on', network, ':', error)
					const emptyBalance: any = { address, USDT: 0 }
					if (network === 'TRON') emptyBalance.TRX = 0
					else if (network === 'ETHEREUM') emptyBalance.ETH = 0
					else if (network === 'BSC') emptyBalance.BNB = 0
					return emptyBalance
				}
			},
			sendUSDT: async (fromAddress: string, privateKey: string, toAddress: string, amount: number, network: NetworkType = 'TRON') => {
				switch (network) {
					case 'TRON':
						return await tronService.sendUSDT(fromAddress, privateKey, toAddress, amount)
					case 'ETHEREUM': {
						const evmKey = (useNuxtApp().$normalizeEvmPrivateKey as (k: string) => string | null)(privateKey)
						if (!evmKey) return { success: false, error: 'Invalid private key format' }
						return await ethereumService.sendUSDT(evmKey, toAddress, amount)
					}
					case 'BSC': {
						const evmKey = (useNuxtApp().$normalizeEvmPrivateKey as (k: string) => string | null)(privateKey)
						if (!evmKey) return { success: false, error: 'Invalid private key format' }
						return await bscService.sendUSDT(evmKey, toAddress, amount)
					}
					default:
						throw new Error(`Unsupported network: ${network}`)
				}
			},
			sendNative: async (fromAddress: string, privateKey: string, toAddress: string, amount: number, network: NetworkType = 'TRON') => {
				switch (network) {
					case 'TRON':
						return await tronService.sendTRX(fromAddress, privateKey, toAddress, amount)
					case 'ETHEREUM': {
						const evmKey = (useNuxtApp().$normalizeEvmPrivateKey as (k: string) => string | null)(privateKey)
						if (!evmKey) return { success: false, error: 'Invalid private key format' }
						return await ethereumService.sendETH(evmKey, toAddress, amount)
					}
					case 'BSC': {
						const evmKey = (useNuxtApp().$normalizeEvmPrivateKey as (k: string) => string | null)(privateKey)
						if (!evmKey) return { success: false, error: 'Invalid private key format' }
						return await bscService.sendBNB(evmKey, toAddress, amount)
					}
					default:
						throw new Error(`Unsupported network: ${network}`)
				}
			},
			isValidAddress: (address: string, network: NetworkType = 'TRON') => {
				switch (network) {
					case 'TRON':
						return tronService.isValidAddress(address)
					case 'ETHEREUM':
						return ethereumService.isValidAddress(address)
					case 'BSC':
						return bscService.isValidAddress(address)
					default:
						return false
				}
			},
			// Decrypt in Web Worker for isolation
			decryptInWorker: async (payload: { ciphertext: string, password: string }): Promise<string | null> => {
				// Only run on client side
				if (!process.client || typeof Worker === 'undefined' || typeof URL === 'undefined') {
					return null
				}
				
				// Inline worker to avoid separate file
				const workerBlob = new Blob([
					`onmessage = async (e) => {\n` +
					`  const { data } = e;\n` +
					`  try {\n` +
					`    const toBytes = (s) => new TextEncoder().encode(s);\n` +
					`    const fromBytes = (b) => new TextDecoder().decode(b);\n` +
					`    const b64d = (b64) => { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; };\n` +
					`    const parts = data.ciphertext.split(':');\n` +
					`    if (parts.length === 4 && parts[0] === 'v2') {\n` +
					`      const salt = b64d(parts[1]);\n` +
					`      const iv = b64d(parts[2]);\n` +
					`      const ct = b64d(parts[3]);\n` +
					`      const baseKey = await crypto.subtle.importKey('raw', toBytes(data.password), { name: 'PBKDF2' }, false, ['deriveKey']);\n` +
					`      const aeadKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);\n` +
					`      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aeadKey, ct);\n` +
					`      const text = fromBytes(pt).trim();\n` +
					`      postMessage(text || null);\n` +
					`      return;\n` +
					`    }\n` +
					`    postMessage(null);\n` +
					`  } catch { postMessage(null); }\n` +
					`}`
				], { type: 'application/javascript' })
				const worker = new Worker(URL.createObjectURL(workerBlob))
				return await new Promise<string | null>((resolve) => {
					worker.onmessage = (ev) => {
						try { worker.terminate() } catch {}
						resolve(ev.data ?? null)
					}
					worker.postMessage(payload)
				})
			}
		}
	}
})