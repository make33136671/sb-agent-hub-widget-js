import type { WidgetConfig, ConnectionState } from './types/index'
import { FloatingButton } from './FloatingButton'
import { ChatWindow } from './ChatWindow'
import { Connector } from './Connector'

import buttonCSS from './styles/button.css?inline'
import windowCSS from './styles/window.css?inline'

/** 嵌入式客服 Widget 主类 */
export class Widget {
  private shadowRoot: ShadowRoot
  private hostEl: HTMLElement
  private rootEl: HTMLElement
  private floatingButton: FloatingButton
  private chatWindow: ChatWindow
  private connector: Connector
  private isOpen = false
  private initialized = false

  constructor(config: WidgetConfig) {

    // 创建 Shadow DOM 宿主
    this.hostEl = document.createElement('div')
    this.hostEl.id = 'sb-agent-hub-widget'
    this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' })

    // 注入样式
    const style = document.createElement('style')
    style.textContent = [buttonCSS, windowCSS].join('\n')
    this.shadowRoot.appendChild(style)

    // 根容器
    const position = config.position || 'bottom-right'
    this.rootEl = document.createElement('div')
    this.rootEl.className = `aw-root${position === 'bottom-left' ? ' bottom-left' : ''}`
    if (config.zIndex) {
      this.rootEl.style.zIndex = String(config.zIndex)
    }
    this.shadowRoot.appendChild(this.rootEl)

    // 聊天窗口
    const i18nTitle = config.locale?.startsWith('en') ? 'Customer Service' : '在线客服'
    this.chatWindow = new ChatWindow(this.rootEl, {
      title: i18nTitle,
      position,
      onClose: () => this.toggle(),
    })

    // 浮动按钮
    this.floatingButton = new FloatingButton(this.rootEl, () => this.toggle())

    // Connector（core + UI 整合）
    this.connector = new Connector(
      config,
      (state: ConnectionState) => {
        this.floatingButton.setConnectionState(state)
        this.chatWindow.setConnectionState(state)
      },
      () => {
        // 新消息到来，如果窗口关闭则增加未读数
        if (!this.isOpen) {
          this.floatingButton.getBadge().increment()
        }
      }
    )

    document.body.appendChild(this.hostEl)
  }

  /** 展开/收起 */
  toggle(): void {
    this.isOpen = !this.isOpen
    this.floatingButton.setOpen(this.isOpen)
    this.chatWindow.setVisible(this.isOpen)

    if (this.isOpen) {
      this.floatingButton.getBadge().clear()

      // 首次打开时初始化
      if (!this.initialized) {
        this.initialized = true
        this.connector.initUI(this.chatWindow.getBody())
        this.connector.connectAndLogin()
      }
    }
  }

  /** 打开 */
  open(): void {
    if (!this.isOpen) this.toggle()
  }

  /** 关闭 */
  close(): void {
    if (this.isOpen) this.toggle()
  }

  /** 销毁 Widget */
  destroy(): void {
    this.connector.destroy()
    this.hostEl.remove()
  }
}
