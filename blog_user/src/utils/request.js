import axios from "axios";
import {ElMessage, ElMessageBox, ElNotification} from "element-plus";
import router from '@/router/index.js'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'

const baseURL = '/api';
const instance = axios.create({baseURL});

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
    // 触发自定义事件，通知需要显示登录弹窗
    window.dispatchEvent(new CustomEvent('show-auth-dialog'));
}

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
        return Promise.reject(err);
    }
)

// 响应拦截器
instance.interceptors.response.use(
    result => {
        // 直接返回数据，在组件中处理具体的成功/失败逻辑
        return result.data;
    },
    err => {
        if (err.response && err.response.status === 401) {
            ElMessage.error('请先登录')
            
            // 清除本地存储的token和用户信息
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            
            // 清除store中的用户状态，强制更新UI
            const tokenStore = useTokenStore();
            const userInfoStore = useUserInfoStore();
            tokenStore.removeToken();
            userInfoStore.removeInfo();
            
            // 触发登录弹窗显示
            showLoginDialog();
        } else {
            ElMessage.error('服务异常')
        }
        return Promise.reject(err)
    }
)

// 处理未授权情况
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
    if (tokenStore.token) {
      instance.get('/user/message/unread/count')
        .then(res => {
          if (res.code === 0) {
            messageState.updateUnreadCount(res.data)
          }
        })
        .catch(err => {
          console.error('检查未读消息失败:', err)
        })
    }
  }, 30000)
  
  // 每15秒检查一次当前会话是否有新消息
  conversationCheckTimer = setInterval(() => {
    const tokenStore = useTokenStore()
    const activeConversationId = messageState.activeConversationId
    
    if (tokenStore.token && activeConversationId) {
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
            console.error('检查会话新消息失败:', err)
          })
      }
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

// 自动开始消息检查
startMessageChecking()

export default instance;