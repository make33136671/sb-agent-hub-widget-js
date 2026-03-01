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

  constructor(
    config: WidgetConfig,
    onConnectionChange: OnConnectionChange,
    onNewMessage: OnNewMessage
  ) {
    this.config = config
    this.onConnectionChange = onConnectionChange
    this.onNewMessage = onNewMessage

    this.core = createOpenIMCore({
      apiAddr: config.apiAddr || 'http://localhost:10002',
      wsAddr: config.wsAddr || 'ws://localhost:10001',
      platformID: 5,
      logLevel: 2,
      baseURL: config.baseURL || 'http://localhost:5153',
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

    // 尝试恢复会话
    const stored = this.core.session.loadAuthData()
    if (stored) {
      try {
        await this.core.login(stored.userID, stored.token)
        this.authData = stored
        this.onConnectionChange('connected')
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
    this.chatUI?.destroy()
    this.core.destroy()
  }

  /** 登录后续操作：设置 UI 信息、加载历史、发送上线通知 */
  private async postLogin(): Promise<void> {
    if (!this.authData || !this.chatUI) return

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
          source: this.config.platformKey,
          platformType: 0,
        })
      } catch {
        // ignore
      }
    }
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
