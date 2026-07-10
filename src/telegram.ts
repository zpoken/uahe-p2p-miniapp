// Thin wrapper around the Telegram WebApp SDK (loaded via <script> in index.html).
// Falls back to no-ops in a regular browser so the app remains previewable.

export interface TgThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

interface TgHaptic {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

interface TgBackButton {
  show: () => void
  hide: () => void
  onClick: (cb: () => void) => void
  offClick: (cb: () => void) => void
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
      language_code?: string
    }
    start_param?: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: TgThemeParams
  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  HapticFeedback: TgHaptic
  BackButton: TgBackButton
  openLink: (url: string) => void
  openTelegramLink: (url: string) => void
  showAlert?: (message: string, callback?: () => void) => void
  isVersionAtLeast?: (v: string) => boolean
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export const tg: TelegramWebApp | undefined = window.Telegram?.WebApp

export const isInTelegram = Boolean(tg?.initData || tg?.initDataUnsafe?.user)

export function tgUser() {
  return tg?.initDataUnsafe?.user
}

// BackButton and HapticFeedback appeared in Bot API 6.1; the browser stub
// reports 6.0 and logs a warning on every call, so gate on the version.
export function supports61(): boolean {
  try {
    return Boolean(tg?.isVersionAtLeast?.('6.1'))
  } catch {
    return false
  }
}

export function haptic(kind: 'tap' | 'success' | 'error' | 'select' = 'tap') {
  const h = tg?.HapticFeedback
  if (!h || !supports61()) return
  try {
    if (kind === 'tap') h.impactOccurred('light')
    else if (kind === 'select') h.selectionChanged()
    else h.notificationOccurred(kind)
  } catch {
    /* older clients */
  }
}

export function initTelegram(bg: string) {
  if (!tg) return
  try {
    tg.ready()
    tg.expand()
    if (supports61()) {
      tg.setHeaderColor(bg)
      tg.setBackgroundColor(bg)
    }
  } catch {
    /* older clients */
  }
}

export function showError(msg: string) {
  if (tg?.showAlert) {
    try {
      tg.showAlert(msg)
      return
    } catch {
      /* older clients */
    }
  }
  window.alert(msg)
}

export function openTgLink(url: string) {
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}
