import type { ConnectionState } from './types/index'
import { UnreadBadge } from './UnreadBadge'

/** 聊天图标 SVG */
const CHAT_ICON = `<svg class="aw-fab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C6.48 2 2 6.48 2 12C2 14.17 2.74 16.17 4 17.74V22L8.26 20C9.42 20.32 10.68 20.5 12 20.5C17.52 20.5 22 16.02 22 10.5C22 5.81 17.52 2 12 2Z" fill="currentColor"/>
  <circle cx="8" cy="12" r="1.5" fill="white"/>
  <circle cx="12" cy="12" r="1.5" fill="white"/>
  <circle cx="16" cy="12" r="1.5" fill="white"/>
</svg>`

/** 关闭图标 SVG */
const CLOSE_ICON = `<svg class="aw-fab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`

/** 浮动客服按钮 */
export class FloatingButton {
  private el: HTMLButtonElement
  private statusDot: HTMLElement
  private badge: UnreadBadge

  constructor(parent: HTMLElement, onClick: () => void) {
    this.el = document.createElement('button')
    this.el.className = 'aw-fab'
    this.el.innerHTML = CHAT_ICON
    this.el.addEventListener('click', onClick)

    // 连接状态指示灯
    this.statusDot = document.createElement('div')
    this.statusDot.className = 'aw-status-dot disconnected'
    this.el.appendChild(this.statusDot)

    // 未读角标
    this.badge = new UnreadBadge(this.el)

    parent.appendChild(this.el)
  }

  /** 设置展开/收起状态 */
  setOpen(open: boolean): void {
    this.el.innerHTML = open ? CLOSE_ICON : CHAT_ICON
    this.el.classList.toggle('is-open', open)

    // 重新添加状态灯和角标（innerHTML 会清空子节点）
    this.el.appendChild(this.statusDot)
    if (!open) {
      this.badge = new UnreadBadge(this.el)
    }
  }

  /** 更新连接状态 */
  setConnectionState(state: ConnectionState): void {
    this.statusDot.className = `aw-status-dot ${state}`
  }

  /** 获取未读角标 */
  getBadge(): UnreadBadge {
    return this.badge
  }
}
