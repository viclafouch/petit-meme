// https://userjot.com/help/widget-sdk/widget-api-reference

export type UJTheme = 'auto' | 'light' | 'dark'
export type UJPosition = 'left' | 'right'
export type UJSection = 'feedback' | 'roadmap' | 'updates' | null

export type UJInitOptions = {
  widget?: boolean
  position?: UJPosition
  theme?: UJTheme
  trigger?: string // 'default' or custom trigger name according to doc example
  // add other config keys if the SDK exposes them later
}

export type UJIdentifyOptions = {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  avatar?: string // URL
}

export type UJShowWidgetOptions = {
  section?: Exclude<UJSection, null> // 'feedback' | 'roadmap' | 'updates'
}

export type UJWidgetState = {
  isOpen: boolean
  section: UJSection
}

export type UserJotWidgetSDK = {
  // Core
  init(projectId: string, options?: UJInitOptions): void

  identify(options: UJIdentifyOptions | null): void

  // Widget control
  showWidget(options?: UJShowWidgetOptions): void
  hideWidget(): void
  getWidgetState(): UJWidgetState

  // Configuration
  setWidgetPosition(position: UJPosition): void
  setTheme(theme: UJTheme): void
  setWidgetEnabled(enabled: boolean): void

  // Lifecycle
  destroy(): void
}

// Extend the global Window interface
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    uj: UserJotWidgetSDK
  }
}

// allow importing this file as a module
export {}
