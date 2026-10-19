import { Widget } from './Widget'
import type { WidgetConfig } from './types/index'

export { Widget } from './Widget'
export { FloatingButton } from './FloatingButton'
export { ChatWindow } from './ChatWindow'
export { UnreadBadge } from './UnreadBadge'
export { Connector } from './Connector'
export type { WidgetConfig, ConnectionState } from './types/index'

/** 自动初始化：读取 window.SbAgentHub 配置并创建 Widget */
function autoInit(): void {
  const config = (window as any).SbAgentHub as WidgetConfig | undefined
  if (!config?.platformKey) return

  const widget = new Widget(config)

  // 暴露到全局供外部控制
  ;(window as any).SbAgentHubWidget = widget
}

// DOM 加载完成后自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}
