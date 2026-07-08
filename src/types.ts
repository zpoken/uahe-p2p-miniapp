// Domain types mirrored from the p2p-bot backend (app/core/models.py).

export type ChainCode = 'ETHEREUM' | 'BASE' | 'TRON'

export interface ChainInfo {
  code: ChainCode
  title: string
  standard: string
  withdrawFeeFlat: number
  color: string
  short: string
  tokens: string[]
  depositAddress: string
}

export type LedgerKind = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'HOLD' | 'CAPTURE' | 'RELEASE'

export interface Operation {
  id: string
  kind: LedgerKind
  title: string
  amount: number // signed: + credit, - debit
  createdAt: number
  ref?: string
}

export type CheckStatus = 'CREATED' | 'CLAIMED' | 'CANCELED' | 'EXPIRED'

export interface Check {
  token: string
  amount: number
  status: CheckStatus
  description?: string
  createdAt: number
  expiresAt?: number
  claimedBy?: string
}

export type RequestKind = 'MOBILE_TOPUP' | 'IBAN_P2P' | 'CARD_P2P' | 'BILL_SCAN' | 'GIFT_CERT' | 'OTHERS'
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELED'

export interface ServiceRequest {
  id: number
  kind: RequestKind
  title: string
  status: RequestStatus
  amountUah: number
  feeUahe?: number
  details: Record<string, string>
  createdAt: number
  declineReason?: string
}

export interface CertBrand {
  code: string
  title: string
  emoji: string
  color: string
  discountPct: number
  description: string
  activationKeyName?: string
  nominals: number[]
}

export interface OwnedCert {
  id: string
  brandCode: string
  brandTitle: string
  emoji: string
  color: string
  nominalUah: number
  priceUahe: number
  pin: string
  activationKeyName?: string
  activationKeyValue?: string
  expiresAt: number
  boughtAt: number
}

export type WithdrawStatus =
  | 'CREATED'
  | 'AUTO_APPROVED'
  | 'NEEDS_ADMIN'
  | 'APPROVED'
  | 'BROADCASTED'
  | 'MINED'
  | 'FAILED'
  | 'CANCELED'

export interface WithdrawRequest {
  id: string
  chain: ChainCode
  to: string
  amount: number
  fee: number
  status: WithdrawStatus
  createdAt: number
  txHash?: string
}
