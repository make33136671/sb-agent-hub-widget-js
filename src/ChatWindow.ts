import type { ConnectionState } from './types/index'

/** 聊天弹窗容器 */
export class ChatWindow {
  private el: HTMLElement
  private headerEl: HTMLElement
  private headerStatusDot: HTMLElement
  private bodyEl: HTMLElement
  private titleText: string

  constructor(
    parent: HTMLElement,
    options: {
      title: string
      position: 'bottom-right' | 'bottom-left'
      onClose: () => void
    }
  ) {
    this.titleText = options.title

    this.el = document.createElement('div')
    this.el.className = `aw-window hidden${options.position === 'bottom-left' ? ' bottom-left' : ''}`

    // 标题栏
    this.headerEl = document.createElement('div')
    this.headerEl.className = 'aw-header'

    const titleWrapper = document.createElement('div')
    titleWrapper.className = 'aw-header-title'

    const titleSpan = document.createElement('span')
    titleSpan.textContent = this.titleText

    this.headerStatusDot = document.createElement('span')
    this.headerStatusDot.className = 'aw-header-status-dot'
    this.headerStatusDot.style.background = '#ef4444'

    titleWrapper.appendChild(titleSpan)
    titleWrapper.appendChild(this.headerStatusDot)
    this.headerEl.appendChild(titleWrapper)

    const actions = document.createElement('div')
    actions.className = 'aw-header-actions'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'aw-close-btn'
    closeBtn.innerHTML = '&times;'
    closeBtn.addEventListener('click', options.onClose)
    actions.appendChild(closeBtn)

    this.headerEl.appendChild(actions)
    this.el.appendChild(this.headerEl)

    // 聊天主体
    this.bodyEl = document.createElement('div')
    this.bodyEl.className = 'aw-body'
    this.el.appendChild(this.bodyEl)

    parent.appendChild(this.el)
  }

  /** 获取主体容器（ChatUI 挂载点） */
  getBody(): HTMLElement {
    return this.bodyEl
  }

  /** 显示窗口 */
  show(): void {
    this.el.classList.remove('hidden')
  }

  /** 隐藏窗口 */
  hide(): void {
    this.el.classList.add('hidden')
  }

  /** 设置是否可见 */
  setVisible(visible: boolean): void {
    if (visible) this.show()
    else this.hide()
  }

  /** 更新连接状态 */
  setConnectionState(state: ConnectionState): void {
    const colors: Record<ConnectionState, string> = {
      connected: '#22c55e',
      connecting: '#f59e0b',
      disconnected: '#ef4444',
      error: '#ef4444',
    }
    const color = colors[state]
    this.headerStatusDot.style.background = color
    this.headerStatusDot.style.boxShadow = `0 0 6px ${color}`
  }

  /** 设置标题文本 */
  setTitle(title: string): void {
    this.titleText = title
    const titleSpan = this.headerEl.querySelector('.aw-header-title span')
    if (titleSpan) titleSpan.textContent = title
  }
}
