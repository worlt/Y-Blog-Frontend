import axios from "axios";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import router from '@/router/index.js'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import { createErrorHandler, ERROR_STRATEGY, handleRequestError } from "@common/utils/errorHandler.js";
import { executeAutoLogout, isAuthError } from "@common/utils/autoLogout.js";

const baseURL = '/api';
const instance = axios.create({ baseURL });

// 创建一个事件总线，用于组件间通信
export const eventBus = {
  _events: {},
  on(event, callback) {
    if (!this._events[event]) this._events[event] = []
    this._events[event].push(callback)
    return this
  },
  off(event, callback) {
    if (!this._events[event]) return this
    if (!callback) {
      delete this._events[event]
      return this
    }
    this._events[event] = this._events[event].filter(cb => cb !== callback)
    return this
  },
  emit(event, ...args) {
    if (!this._events[event]) return this
    this._events[event].forEach(callback => callback(...args))
    return this
  }
}

// 创建事件总线，用于控制登录弹窗显示
export const showLoginDialog = () => {
  // 如果当前在登录/注册页面，则不弹出登录对话框
  if (window.location.pathname === '/auth') {
    return;
  }
  // 触发自定义事件，通知需要显示登录弹窗
  window.dispatchEvent(new CustomEvent('show-auth-dialog'));
}

// 创建专用的错误处理器 - 用户前端使用弹窗策略
const errorHandler = createErrorHandler({
  strategy: ERROR_STRATEGY.DIALOG,
  clearAuth: () => {
    // 清除本地存储的token和用户信息
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');

    // 清除store中的用户状态，强制更新UI
    const tokenStore = useTokenStore();
    const userInfoStore = useUserInfoStore();
    tokenStore.removeToken();
    userInfoStore.removeInfo();
  },
  onUnauthorized: () => {
    // 触发登录弹窗显示
    showLoginDialog();
  }
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 从本地存储获取token
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.userToken = token;
    }
    return config;
  },
  (err) => {
    // 请求错误回调 - 使用统一错误处理
    return handleRequestError(err);
  }
)

// 响应拦截器
instance.interceptors.response.use(
  result => {
    const data = result.data;

    // 检查是否为认证错误
    if (isAuthError(data)) {
      console.log('检测到认证过期，执行自动登出');

      // 执行统一的自动登出
      executeAutoLogout({
        tokenStore: useTokenStore(),
        userStore: useUserInfoStore(),
        stopMessageChecking,
        showLoginDialog,
        reason: data.msg || '登录状态已过期'
      });

      // 返回rejected promise，避免组件继续处理
      return Promise.reject(new Error('认证过期'));
    }

    // 正常返回数据
    return data;
  },
  err => {
    // 检查HTTP错误是否为认证错误
    if (isAuthError(err.response?.data) || err.response?.status === 401) {
      console.log('检测到HTTP认证错误，执行自动登出');

      executeAutoLogout({
        tokenStore: useTokenStore(),
        userStore: useUserInfoStore(),
        stopMessageChecking,
        showLoginDialog,
        reason: err.response?.data?.msg || '登录状态已过期'
      });

      return Promise.reject(new Error('认证过期'));
    }

    // 使用统一的HTTP错误处理
    return errorHandler.handleResponseError(err);
  }
)

// 处理未授权情况（保留原有逻辑作为备用）
function handleUnauthorized() {
  const tokenStore = useTokenStore()
  const userInfoStore = useUserInfoStore()

  // 清除用户信息和token
  userInfoStore.clearUserInfo()
  tokenStore.clearToken()

  // 如果用户未在登录页，显示登录提示
  if (router.currentRoute.value.path !== '/login') {
    ElMessageBox.confirm(
      '登录状态已过期，您可以继续留在当前页面或重新登录',
      '提示',
      {
        confirmButtonText: '重新登录',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => {
        // 发送登录请求事件，让顶部组件弹出登录框
        eventBus.emit('show-login-dialog')
      })
      .catch(() => {
        // 用户取消登录，继续浏览（有些功能可能无法使用）
      })
  }
}

// 消息系统全局状态
export const messageState = {
  unreadCount: 0,
  lastNotificationTime: 0, // 上次通知时间，避免通知过于频繁
  conversationChecking: {}, // 记录各会话最后消息ID和检查状态
  activeConversationId: null, // 当前活跃的会话ID

  // 更新未读消息数
  updateUnreadCount(count) {
    this.unreadCount = count
    eventBus.emit('unread-count-update', count)

    // 如果有新消息且距离上次通知超过10秒，显示通知
    const now = Date.now()
    if (count > 0 && now - this.lastNotificationTime > 10000) {
      ElNotification({
        title: '新消息提醒',
        message: `您有 ${count} 条未读消息`,
        type: 'info',
        position: 'top-right',
        duration: 3000,
        onClick: () => {
          router.push('/messages')
        }
      })
      this.lastNotificationTime = now
    }
  },

  // 设置当前活跃会话
  setActiveConversation(conversationId) {
    this.activeConversationId = conversationId
  },

  // 记录会话最后消息ID
  setConversationLastMessageId(conversationId, messageId) {
    if (!this.conversationChecking[conversationId]) {
      this.conversationChecking[conversationId] = {}
    }
    this.conversationChecking[conversationId].lastMessageId = messageId
  }
}

// 定期检查未读消息
let messageCheckTimer = null
let conversationCheckTimer = null

export function startMessageChecking() {
  // 清除现有定时器
  stopMessageChecking()

  // 每30秒检查一次未读消息总数
  messageCheckTimer = setInterval(() => {
    const tokenStore = useTokenStore()
    const userInfoStore = useUserInfoStore()

    // 更严格的登录状态检查
    if (tokenStore.token && userInfoStore.info?.id) {
      instance.get('/user/message/unread/count')
        .then(res => {
          if (res.code === 0) {
            messageState.updateUnreadCount(res.data)
          }
        })
        .catch(err => {
          // 如果是认证错误，不打印错误日志（已由拦截器处理）
          if (err.message !== '认证过期') {
            console.error('检查未读消息失败:', err)
          }
        })
    } else {
      // 用户未登录或信息不完整，停止检查
      stopMessageChecking()
    }
  }, 30000)

  // 每15秒检查一次当前会话是否有新消息
  conversationCheckTimer = setInterval(() => {
    const tokenStore = useTokenStore()
    const userInfoStore = useUserInfoStore()
    const activeConversationId = messageState.activeConversationId

    // 更严格的登录状态检查
    if (tokenStore.token && userInfoStore.info?.id && activeConversationId) {
      const conversationState = messageState.conversationChecking[activeConversationId]
      const lastMessageId = conversationState?.lastMessageId

      if (lastMessageId) {
        instance.get(`/user/message/check-new/${activeConversationId}`, {
          params: { lastMessageId }
        })
          .then(res => {
            if (res.code === 0 && res.data === true) {
              // 有新消息，通知会话组件刷新
              eventBus.emit('conversation-new-message', activeConversationId)
            }
          })
          .catch(err => {
            // 如果是认证错误，不打印错误日志（已由拦截器处理）
            if (err.message !== '认证过期') {
              console.error('检查会话新消息失败:', err)
            }
          })
      }
    } else {
      // 用户未登录或信息不完整，停止检查
      stopMessageChecking()
    }
  }, 15000)
}

export function stopMessageChecking() {
  if (messageCheckTimer) {
    clearInterval(messageCheckTimer)
    messageCheckTimer = null
  }

  if (conversationCheckTimer) {
    clearInterval(conversationCheckTimer)
    conversationCheckTimer = null
  }
}

// 自动开始消息检查 - 已移除，改用WebSocket
// startMessageChecking()

export default instance;