/** 未读消息角标 */
export class UnreadBadge {
  private el: HTMLElement
  private count = 0

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div')
    this.el.className = 'aw-badge hidden'
    parent.appendChild(this.el)
  }

  /** 设置未读数 */
  setCount(count: number): void {
    this.count = count
    if (count > 0) {
      this.el.textContent = count > 99 ? '99+' : String(count)
      this.el.classList.remove('hidden')
    } else {
      this.el.classList.add('hidden')
    }
  }

  /** 获取未读数 */
  getCount(): number {
    return this.count
  }

  /** 增加未读数 */
  increment(): void {
    this.setCount(this.count + 1)
  }

  /** 清零 */
  clear(): void {
    this.setCount(0)
  }
}
