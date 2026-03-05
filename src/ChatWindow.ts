import type { ConnectionState } from './types/index'
import type { VisitorFormConfig } from '@saibotianlong/openim-core'

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
      queued: '#3b82f6',
    }
    const color = colors[state]
    this.headerStatusDot.style.background = color
    this.headerStatusDot.style.boxShadow = `0 0 6px ${color}`
  }

  /** 显示排队遮罩 */
  showQueueOverlay(position: number, totalWaiting: number, estimatedWaitMinutes: number): void {
    this.removeQueueOverlay()
    const overlay = document.createElement('div')
    overlay.className = 'aw-queue-overlay'
    overlay.innerHTML = `
      <div class="aw-queue-card">
        <div class="aw-queue-icon">⏳</div>
        <div class="aw-queue-title">正在排队中</div>
        <div class="aw-queue-position">当前排位: <strong>${position}</strong></div>
        <div class="aw-queue-waiting">前方等待: ${totalWaiting} 人</div>
        <div class="aw-queue-time">预计等待: ${estimatedWaitMinutes} 分钟</div>
        <button class="aw-queue-cancel-btn">取消排队</button>
      </div>
    `
    this.bodyEl.appendChild(overlay)
  }

  /** 更新排队信息 */
  updateQueueOverlay(position: number, totalWaiting: number, estimatedWaitMinutes: number): void {
    const overlay = this.bodyEl.querySelector('.aw-queue-overlay')
    if (!overlay) {
      this.showQueueOverlay(position, totalWaiting, estimatedWaitMinutes)
      return
    }
    const posEl = overlay.querySelector('.aw-queue-position strong')
    const waitEl = overlay.querySelector('.aw-queue-waiting')
    const timeEl = overlay.querySelector('.aw-queue-time')
    if (posEl) posEl.textContent = String(position)
    if (waitEl) waitEl.textContent = `前方等待: ${totalWaiting} 人`
    if (timeEl) timeEl.textContent = `预计等待: ${estimatedWaitMinutes} 分钟`
  }

  /** 移除排队遮罩 */
  removeQueueOverlay(): void {
    const overlay = this.bodyEl.querySelector('.aw-queue-overlay')
    if (overlay) overlay.remove()
  }

  /** 获取排队取消按钮（用于绑定事件） */
  getQueueCancelButton(): HTMLElement | null {
    return this.bodyEl.querySelector('.aw-queue-cancel-btn')
  }

  /** 设置标题文本 */
  setTitle(title: string): void {
    this.titleText = title
    const titleSpan = this.headerEl.querySelector('.aw-header-title span')
    if (titleSpan) titleSpan.textContent = title
  }

  /** 显示访客表单遮罩 */
  showVisitorForm(
    config: VisitorFormConfig,
    onSubmit: (data: Record<string, string>) => void,
    onSkip?: () => void
  ): void {
    this.removeVisitorForm()
    const overlay = document.createElement('div')
    overlay.className = 'aw-form-overlay'

    let fieldsHtml = ''
    for (const field of config.formFields) {
      const requiredMark = field.required ? '<span style="color:#ff4d4f">*</span>' : ''
      if (field.type === 'select' && field.options?.length) {
        const optionsHtml = field.options
          .map(o => `<option value="${o}">${o}</option>`)
          .join('')
        fieldsHtml += `
          <div class="aw-form-field">
            <label>${field.label} ${requiredMark}</label>
            <select data-key="${field.key}" ${field.required ? 'required' : ''}>
              <option value="">${field.placeholder || '请选择'}</option>
              ${optionsHtml}
            </select>
          </div>`
      } else if (field.type === 'textarea') {
        fieldsHtml += `
          <div class="aw-form-field">
            <label>${field.label} ${requiredMark}</label>
            <textarea data-key="${field.key}" placeholder="${field.placeholder || ''}"
              ${field.required ? 'required' : ''} rows="3"></textarea>
          </div>`
      } else {
        fieldsHtml += `
          <div class="aw-form-field">
            <label>${field.label} ${requiredMark}</label>
            <input type="${field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}"
              data-key="${field.key}" placeholder="${field.placeholder || ''}"
              ${field.required ? 'required' : ''} />
          </div>`
      }
    }

    const skipBtn = !config.isRequired
      ? '<button class="aw-form-skip-btn" type="button">跳过</button>'
      : ''

    overlay.innerHTML = `
      <div class="aw-form-card">
        <div class="aw-form-title">${config.formName || '请填写信息'}</div>
        <form class="aw-form-body">
          ${fieldsHtml}
          <div class="aw-form-actions">
            <button class="aw-form-submit-btn" type="submit">开始咨询</button>
            ${skipBtn}
          </div>
        </form>
      </div>
    `

    // 绑定提交事件
    const form = overlay.querySelector('form')!
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const data: Record<string, string> = {}
      const inputs = overlay.querySelectorAll('[data-key]')
      inputs.forEach((el: any) => {
        data[el.dataset.key] = el.value || ''
      })
      onSubmit(data)
    })

    // 绑定跳过按钮
    const skipBtnEl = overlay.querySelector('.aw-form-skip-btn')
    if (skipBtnEl && onSkip) {
      skipBtnEl.addEventListener('click', onSkip)
    }

    this.bodyEl.appendChild(overlay)
  }

  /** 移除访客表单 */
  removeVisitorForm(): void {
    const overlay = this.bodyEl.querySelector('.aw-form-overlay')
    if (overlay) overlay.remove()
  }

  /** 显示满意度评价弹窗 */
  showRatingOverlay(onSubmit: (rating: number, comment: string) => void, onSkip: () => void): void {
    this.removeRatingOverlay()
    const overlay = document.createElement('div')
    overlay.className = 'aw-rating-overlay'

    overlay.innerHTML = `
      <div class="aw-rating-card">
        <div class="aw-rating-title">请为本次服务评分</div>
        <div class="aw-rating-stars">
          ${[1, 2, 3, 4, 5].map(n => `<span class="aw-star" data-value="${n}">★</span>`).join('')}
        </div>
        <div class="aw-rating-label">请点击星星评分</div>
        <textarea class="aw-rating-comment" placeholder="留下您的评价（选填）" rows="3"></textarea>
        <div class="aw-rating-actions">
          <button class="aw-rating-submit-btn" disabled>提交评价</button>
          <button class="aw-rating-skip-btn">跳过</button>
        </div>
      </div>
    `

    let selectedRating = 0
    const stars = overlay.querySelectorAll('.aw-star')
    const label = overlay.querySelector('.aw-rating-label')!
    const submitBtn = overlay.querySelector('.aw-rating-submit-btn') as HTMLButtonElement
    const labels = ['', '非常差', '较差', '一般', '满意', '非常满意']

    stars.forEach((star: any) => {
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.value)
        submitBtn.disabled = false
        label.textContent = labels[selectedRating] || ''
        stars.forEach((s: any) => {
          s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating)
        })
      })
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.dataset.value)
        stars.forEach((s: any) => {
          s.classList.toggle('hover', parseInt(s.dataset.value) <= val)
        })
      })
      star.addEventListener('mouseleave', () => {
        stars.forEach((s: any) => s.classList.remove('hover'))
      })
    })

    submitBtn.addEventListener('click', () => {
      const comment = (overlay.querySelector('.aw-rating-comment') as HTMLTextAreaElement)?.value || ''
      onSubmit(selectedRating, comment)
    })

    overlay.querySelector('.aw-rating-skip-btn')!.addEventListener('click', onSkip)

    this.bodyEl.appendChild(overlay)
  }

  /** 移除评价弹窗 */
  removeRatingOverlay(): void {
    const overlay = this.bodyEl.querySelector('.aw-rating-overlay')
    if (overlay) overlay.remove()
  }
}
