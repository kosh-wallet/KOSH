interface WalletData {
  address: string
  mnemonic: {
    phrase: string
  }
  privateKey: string
}

export const useWallets = () => useState<WalletData[]>('wallets', () => [])
