/** Widget 配置（通过 window.SbAgentHub 传入） */
export interface WidgetConfig {
  /** 平台密钥（必填） */
  platformKey: string
  /** Widget 位置 */
  position?: 'bottom-right' | 'bottom-left'
  /** 主题 */
  theme?: 'light' | 'dark'
  /** 语言 */
  locale?: string
  /** z-index */
  zIndex?: number
  /** 用户 ID */
  userId?: string
  /** 用户昵称 */
  nickname?: string
  /** 用户头像 */
  avatar?: string
  /** IM Server HTTP API 地址 */
  apiAddr?: string
  /** IM Server WebSocket 地址 */
  wsAddr?: string
  /** 业务后端 API 地址 */
  baseURL?: string
}

/** 连接状态 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'queued'

/** 排队状态回调 */
export type OnQueueUpdate = (info: { position: number; totalWaiting: number; estimatedWaitMinutes: number }) => void

declare global {
  interface Window {
    SbAgentHub?: WidgetConfig
  }
}
