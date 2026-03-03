import {
  createOpenIMCore,
  type OpenIMClient,
  type GetImTokenResponse,
  type Message,
} from '@saibotianlong/openim-core'
import {
  ChatUI,
  TextPlugin,
  ImagePlugin,
  EmojiPlugin,
} from '@saibotianlong/chat-ui'
import type { WidgetConfig, ConnectionState } from './types/index'

/** 连接状态变更回调 */
export type OnConnectionChange = (state: ConnectionState) => void

/** 新消息回调（窗口关闭时用于更新未读数） */
export type OnNewMessage = (message: Message) => void

/** Connector 连接 core + UI */
export class Connector {
  private core: OpenIMClient
  private chatUI: ChatUI | null = null
  private config: WidgetConfig
  private authData: GetImTokenResponse | null = null
  private onConnectionChange: OnConnectionChange
  private onNewMessage: OnNewMessage
  /** 登录时间，用于计算 sessionDuration */
  private loginTime: number = 0
  /** 绑定的 beforeunload 处理器引用（用于移除） */
  private boundBeforeUnload: (() => void) | null = null

  constructor(
    config: WidgetConfig,
    onConnectionChange: OnConnectionChange,
    onNewMessage: OnNewMessage
  ) {
    this.config = config
    this.onConnectionChange = onConnectionChange
    this.onNewMessage = onNewMessage

    this.core = createOpenIMCore({
      apiAddr: config.apiAddr || 'http://192.168.10.231:10002',
      wsAddr: config.wsAddr || 'ws://192.168.10.231:10001',
      platformID: 5,
      logLevel: 2,
      baseURL: config.baseURL || 'http://127.0.0.1:5153',
      platformKey: config.platformKey,
    })

    this.setupCoreEvents()
  }

  /** 初始化 ChatUI 并挂载到容器 */
  initUI(container: HTMLElement): ChatUI {
    this.chatUI = new ChatUI(container, {
      plugins: [new TextPlugin(), new ImagePlugin(), new EmojiPlugin()],
      theme: this.config.theme || 'light',
      locale: this.config.locale || 'zh-CN',
    })
    this.chatUI.bindCore(this.core)
    return this.chatUI
  }

  /** 自动登录流程 */
  async connectAndLogin(): Promise<void> {
    this.onConnectionChange('connecting')

    // 在 login 之前注册 sync 监听，避免竞态条件
    const syncReady = this.waitForSync()

    // 尝试恢复会话
    const stored = this.core.session.loadAuthData()
    if (stored) {
      try {
        await this.core.login(stored.userID, stored.token)
        this.authData = stored
        this.onConnectionChange('connected')
        await syncReady
        await this.postLogin()
        return
      } catch {
        this.core.session.clearAuthData()
      }
    }

    // 新登录
    try {
      const authData = await this.core.auth.getImTokenSimple(
        this.config.platformKey,
        this.config.userId,
        0,
        {
          nickname: this.config.nickname,
          avatar: this.config.avatar,
        }
      )

      this.core.session.saveAuthData(authData)
      await this.core.login(authData.userID, authData.token)

      // 设置 Token 自动续期
      this.core.tokenRefresher.setLastLoginRequest({
        platformKey: this.config.platformKey,
        userId: this.config.userId,
        nickname: this.config.nickname,
        avatar: this.config.avatar,
        platformType: 0,
      })

      this.authData = authData
      this.onConnectionChange('connected')
      await syncReady
      await this.postLogin()
    } catch {
      this.onConnectionChange('error')
    }
  }

  /** 获取 core 实例 */
  getCore(): OpenIMClient {
    return this.core
  }

  /** 获取认证数据 */
  getAuthData(): GetImTokenResponse | null {
    return this.authData
  }

  /** 销毁 */
  destroy(): void {
    this.sendOfflineNotification('manual')
    this.removeBeforeUnloadListener()
    this.chatUI?.destroy()
    this.core.destroy()
  }

  /** 登录后续操作：设置 UI 信息、加载历史、发送上线通知（sync 已在外层等待完成） */
  private async postLogin(): Promise<void> {
    if (!this.authData || !this.chatUI) return

    this.loginTime = Date.now()

    // 设置用户和客服信息到 UI
    this.chatUI.setUserInfo(
      this.authData.userID,
      this.authData.user?.nickname || '访客',
      this.authData.user?.avatar || ''
    )

    if (this.authData.agent) {
      this.chatUI.setAgentInfo(
        this.authData.agent.agentUserId,
        this.authData.agent.nickname || '客服',
        this.authData.agent.avatar || ''
      )
    }

    this.chatUI.setInputEnabled(true)

    // 加载历史消息
    if (this.authData.agent?.agentUserId) {
      try {
        const conv = await this.core.conversation.getOne(this.authData.agent.agentUserId)
        if (conv) {
          const messages = await this.core.conversation.getHistory(conv.conversationID, 100)
          this.chatUI.setMessages(messages)
          this.chatUI.scrollToBottom()
        }
      } catch {
        // ignore
      }

      // 发送访客上线通知
      try {
        await this.core.message.sendVisitorOnline(this.authData.agent.agentUserId, {
          visitorId: this.authData.userID,
          deviceId: this.authData.user?.deviceId || '',
          nickname: this.authData.user?.nickname || '访客',
          avatar: this.authData.user?.avatar || '',
          isAnonymous: this.authData.user?.userType === 0,
          userType: (this.authData.user?.userType ?? 0) as 0 | 1 | 2,
          source: this.config.platformKey,
          platformType: 0,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          pageTitle: typeof document !== 'undefined' ? document.title : undefined,
          referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : undefined,
        })
      } catch {
        // ignore
      }

      // 注册页面关闭监听，发送下线通知（尽力而为）
      this.registerBeforeUnloadListener()
    }
  }

  /** 注册 beforeunload 监听器 */
  private registerBeforeUnloadListener(): void {
    if (typeof window === 'undefined') return
    this.removeBeforeUnloadListener()
    this.boundBeforeUnload = () => this.sendOfflineNotification('window_close')
    window.addEventListener('beforeunload', this.boundBeforeUnload)
  }

  /** 移除 beforeunload 监听器 */
  private removeBeforeUnloadListener(): void {
    if (this.boundBeforeUnload && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundBeforeUnload)
      this.boundBeforeUnload = null
    }
  }

  /**
   * 发送下线通知（fire-and-forget）
   * 页面关闭场景下为尽力而为，服务端应依赖 WebSocket 断连检测兜底。
   */
  private sendOfflineNotification(reason: 'window_close' | 'idle_timeout' | 'network_error' | 'manual'): void {
    const agentUserID = this.authData?.agent?.agentUserId
    const visitorId = this.authData?.userID
    if (!agentUserID || !visitorId) return

    const sessionDuration = this.loginTime > 0
      ? Math.round((Date.now() - this.loginTime) / 1000)
      : undefined

    // fire-and-forget：不等待结果
    this.core.message.sendVisitorOffline(agentUserID, {
      visitorId,
      reason,
      sessionDuration,
    }).catch(() => {})
  }

  /**
   * 等待 SDK 数据同步完成（sync:finished），超时 15 秒。
   * 必须在 login() 之前调用，以避免事件被遗漏的竞态条件。
   */
  private waitForSync(): Promise<void> {
    return new Promise((resolve) => {
      const cleanup = () => {
        clearTimeout(timer)
        this.core.off('sync:finished', onFinished)
        this.core.off('sync:failed', onFailed)
      }
      const onFinished = () => { cleanup(); resolve() }
      const onFailed = () => { cleanup(); resolve() }
      const timer = setTimeout(() => { cleanup(); resolve() }, 15000)
      this.core.on('sync:finished', onFinished)
      this.core.on('sync:failed', onFailed)
    })
  }

  /** 注册 core 事件 */
  private setupCoreEvents(): void {
    this.core.on('connection:success', () => {
      this.onConnectionChange('connected')
    })

    this.core.on('connection:failed', () => {
      this.onConnectionChange('error')
    })

    this.core.on('connection:connecting', () => {
      this.onConnectionChange('connecting')
    })

    this.core.on('token:expired', async () => {
      if (this.core.tokenRefresher.isActive()) {
        try {
          await this.core.tokenRefresher.refresh()
        } catch {
          this.onConnectionChange('error')
        }
      } else {
        this.onConnectionChange('error')
      }
    })

    this.core.on('message:received', (message: Message) => {
      this.onNewMessage(message)
    })
  }
}
