// Static catalog data mirrored from the bot's reference data
// (init_data.py, gift_cert_service.py, services_service.py).

import type { CertBrand, ChainInfo } from './types'

export const TICKER = 'UAHe'
export const BOT_USERNAME = 'UAHe_P2P_bot'
export const SUPPORT_BOT = 'UAHe_P2P_supportbot'
export const SITE_URL = 'https://uahe.io'

export const CHAINS: ChainInfo[] = [
  {
    code: 'ETHEREUM',
    title: 'Ethereum',
    standard: 'ERC-20',
    withdrawFeeFlat: 10,
    color: '#627eea',
    short: 'ETH',
    tokens: ['UAHe', 'USDT', 'USDC'],
    depositAddress: '0x8Fa4C1b7e2D95c3A0b61d4E7f92B8a35C4D0e6f1',
  },
  {
    code: 'BASE',
    title: 'Base',
    standard: 'ERC-20',
    withdrawFeeFlat: 2,
    color: '#0052ff',
    short: 'BASE',
    tokens: ['UAHe', 'USDT', 'USDC'],
    depositAddress: '0x8Fa4C1b7e2D95c3A0b61d4E7f92B8a35C4D0e6f1',
  },
  {
    code: 'TRON',
    title: 'TRON',
    standard: 'TRC-20',
    withdrawFeeFlat: 5,
    color: '#eb0029',
    short: 'TRX',
    tokens: ['USDT', 'USDC'],
    depositAddress: 'TXk3mFb9Pq2WcAd7hR5yLnU8oGeJ4vNs1B',
  },
]

// Indicative conversion rates shown on the deposit screen
export const DEPOSIT_RATES: Record<string, string> = {
  UAHe: '1 : 1',
  USDT: '≈ 41.65 UAHe',
  USDC: '≈ 41.60 UAHe',
}

export const OPERATORS = [
  { code: 'KYIVSTAR', title: 'Київстар', color: '#00a1e0' },
  { code: 'VODAFONE', title: 'Vodafone', color: '#e60000' },
  { code: 'LIFECELL', title: 'lifecell', color: '#f5c518' },
]

export const LIMITS = {
  mobileMin: 300,
  mobileMax: 5000,
  ibanMin: 5000,
  ibanMax: 300000,
  cardMin: 500,
  cardMax: 50000,
  cardFeeThreshold: 10000,
  cardFee: 50,
  billMin: 5000,
  billMax: 300000,
  withdrawDailyAmount: 10000,
  withdrawDailyCount: 5,
  checkMin: 0.01,
  checkMaxTtlHours: 720,
}

export const OTHER_SERVICES = [
  {
    code: 'PETROLCARD',
    title: 'Поповнити PetrolCard',
    icon: 'local_gas_station',
    tile: 'yellow' as const,
    accountTitle: 'Номер картки PetrolCard',
    accountPrompt: 'Введіть номер картки (наприклад 7 800 123…)',
    min: 300,
    max: 20000,
  },
  {
    code: 'NOVAPOST',
    title: 'Післяоплата НоваПошта',
    icon: 'package_2',
    tile: 'sky' as const,
    accountTitle: 'Номер накладної',
    accountPrompt: 'Введіть номер експрес-накладної (20 45…)',
    min: 100,
    max: 30000,
  },
]

export const CERT_BRANDS: CertBrand[] = [
  {
    code: 'ATB',
    title: 'АТБ',
    icon: 'shopping_cart',
    color: '#0f5cbd',
    discountPct: 15,
    description:
      'Покажіть штрихкод на касі будь-якого магазину АТБ. Діє на весь асортимент, крім акцизних товарів.',
    nominals: [100, 200, 500, 1000],
  },
  {
    code: 'SILPO',
    title: 'Сільпо',
    icon: 'nutrition',
    color: '#f26522',
    discountPct: 12,
    description: 'Сертифікат приймається на касах мережі «Сільпо» по всій Україні.',
    nominals: [200, 500, 1000],
  },
  {
    code: 'FOXTROT',
    title: 'Фокстрот',
    icon: 'tv',
    color: '#e31e24',
    discountPct: 10,
    activationKeyName: 'PIN-код',
    description:
      'Назвіть номер сертифіката та PIN-код на касі або введіть їх під час онлайн-замовлення на foxtrot.com.ua.',
    nominals: [500, 1000, 2000, 5000],
  },
  {
    code: 'ROZETKA',
    title: 'Rozetka',
    icon: 'devices',
    color: '#00a046',
    discountPct: 8,
    activationKeyName: 'Код активації',
    description: 'Активуйте сертифікат в особистому кабінеті rozetka.com.ua перед оплатою замовлення.',
    nominals: [500, 1000, 3000],
  },
  {
    code: 'WOG',
    title: 'WOG',
    icon: 'local_gas_station',
    color: '#7ac143',
    discountPct: 9,
    description: 'Пред’явіть штрихкод касиру на будь-якому АЗК WOG. Діє на пальне та товари кафе.',
    nominals: [500, 1000, 2000],
  },
  {
    code: 'EVA',
    title: 'EVA',
    icon: 'spa',
    color: '#e6007e',
    discountPct: 11,
    description: 'Сертифікат приймається в усіх магазинах EVA та на eva.ua.',
    nominals: [200, 500, 1000],
  },
]

export const REF_RULES = [
  { pct: '2%', label: 'покупки сертифікатів' },
  { pct: '0.5%', label: 'оплата товарів і послуг' },
  { pct: '0.2%', label: 'інші підтверджені платежі' },
]

export function fmt(n: number, maxFrac = 2): string {
  return n.toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  })
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}
