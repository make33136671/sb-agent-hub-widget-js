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
        if (state !== 'queued') {
          this.chatWindow.removeQueueOverlay()
        }
      },
      () => {
        // 新消息到来，如果窗口关闭则增加未读数
        if (!this.isOpen) {
          this.floatingButton.getBadge().increment()
        }
      }
    )

    // 排队状态更新
    this.connector.setOnQueueUpdate((info) => {
      this.chatWindow.showQueueOverlay(info.position, info.totalWaiting, info.estimatedWaitMinutes)
      // 绑定取消按钮
      const cancelBtn = this.chatWindow.getQueueCancelButton()
      if (cancelBtn) {
        cancelBtn.onclick = () => this.connector.cancelQueue()
      }
    })

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
        this.startConnection()
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

  /** 连接并处理表单 */
  private async startConnection(): Promise<void> {
    await this.connector.connectAndLogin()

    // 连接成功后检查是否需要显示访客表单
    const visitorForm = this.connector.getVisitorForm()
    if (visitorForm) {
      this.chatWindow.showVisitorForm(
        visitorForm,
        async (data) => {
          await this.connector.submitVisitorForm(visitorForm.formId, data)
          this.chatWindow.removeVisitorForm()
        },
        () => {
          this.chatWindow.removeVisitorForm()
        }
      )
    }
  }

  /** 显示满意度评价（可在关闭时调用） */
  private showRating(): void {
    const features = this.connector.getFeatureFlags()
    if (!features?.enableSatisfactionRating) return

    this.chatWindow.showRatingOverlay(
      async (rating, comment) => {
        await this.connector.submitRating(rating, comment)
        this.chatWindow.removeRatingOverlay()
      },
      () => {
        this.chatWindow.removeRatingOverlay()
      }
    )
  }

  /** 销毁 Widget */
  destroy(): void {
    // 销毁前显示评价
    this.showRating()
    this.connector.destroy()
    this.hostEl.remove()
  }
}
