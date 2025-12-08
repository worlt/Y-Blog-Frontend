/**
 * 自动登出工具
 * 统一处理Token过期和认证失败的情况
 * @author Worlt
 */

import { ElMessage } from 'element-plus'

// 全局状态管理
let isLoggingOut = false // 防止重复执行登出操作
let autoLogoutCallbacks = [] // 登出回调函数列表

/**
 * 注册自动登出回调
 * @param {Function} callback - 登出时执行的回调函数
 */
export function registerAutoLogoutCallback(callback) {
  if (typeof callback === 'function') {
    autoLogoutCallbacks.push(callback)
  }
}

/**
 * 移除自动登出回调
 * @param {Function} callback - 要移除的回调函数
 */
export function removeAutoLogoutCallback(callback) {
  const index = autoLogoutCallbacks.indexOf(callback)
  if (index > -1) {
    autoLogoutCallbacks.splice(index, 1)
  }
}

/**
 * 执行自动登出
 * @param {Object} options - 配置选项
 * @param {Object} options.tokenStore - token存储
 * @param {Object} options.userStore - 用户信息存储
 * @param {Function} options.stopMessageChecking - 停止消息检查函数
 * @param {Function} options.showLoginDialog - 显示登录弹窗函数
 * @param {string} options.reason - 登出原因
 */
export function executeAutoLogout(options = {}) {
  // 防止重复执行
  if (isLoggingOut) {
    return
  }
  
  isLoggingOut = true
  
  try {
    const {
      tokenStore,
      userStore,
      stopMessageChecking,
      showLoginDialog,
      reason = '登录状态已过期'
    } = options
    
    console.log(`执行自动登出: ${reason}`)
    
    // 1. 停止所有定时任务
    if (stopMessageChecking && typeof stopMessageChecking === 'function') {
      stopMessageChecking()
    }
    
    // 2. 清除用户状态
    if (tokenStore && tokenStore.removeToken) {
      tokenStore.removeToken()
    }
    
    if (userStore && userStore.removeInfo) {
      userStore.removeInfo()
    }
    
    // 3. 清除本地存储
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('userInfo')
    } catch (error) {
      console.warn('清除本地存储失败:', error)
    }
    
    // 4. 执行注册的回调函数
    autoLogoutCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('执行登出回调失败:', error)
      }
    })
    
    // 5. 显示登录弹窗（延迟执行，避免与其他操作冲突）
    setTimeout(() => {
      if (showLoginDialog && typeof showLoginDialog === 'function') {
        showLoginDialog()
      }
    }, 100)
    
    // 6. 显示提示消息
    ElMessage.warning(reason)
    
  } catch (error) {
    console.error('自动登出执行失败:', error)
  } finally {
    // 1秒后重置状态，避免死锁
    setTimeout(() => {
      isLoggingOut = false
    }, 1000)
  }
}

/**
 * 检查是否正在执行登出操作
 * @returns {boolean} 是否正在登出
 */
export function isAutoLoggingOut() {
  return isLoggingOut
}

/**
 * 重置登出状态（仅在特殊情况下使用）
 */
export function resetAutoLogoutState() {
  isLoggingOut = false
}

/**
 * 检查响应是否为认证错误
 * @param {Object} response - 响应对象
 * @returns {boolean} 是否为认证错误
 */
export function isAuthError(response) {
  if (!response) return false
  
  // 检查业务错误码
  if (response.code === -1) {
    return true
  }
  
  // 检查HTTP状态码
  if (response.status === 401) {
    return true
  }
  
  // 检查特定的错误消息
  const authErrorMessages = [
    '请重新登录',
    '登录状态已过期',
    '用户未登录',
    'token已过期',
    '无效的token'
  ]
  
  const message = response.msg || response.message || ''
  return authErrorMessages.some(errorMsg => message.includes(errorMsg))
}

/**
 * 创建认证错误处理器
 * @param {Object} options - 配置选项
 * @returns {Function} 错误处理函数
 */
export function createAuthErrorHandler(options = {}) {
  return function handleAuthError(error) {
    if (isAuthError(error) || isAuthError(error.response?.data)) {
      executeAutoLogout({
        ...options,
        reason: error.response?.data?.msg || error.message || '登录状态已过期'
      })
      return true // 表示已处理
    }
    return false // 表示未处理
  }
}

export default {
  registerAutoLogoutCallback,
  removeAutoLogoutCallback,
  executeAutoLogout,
  isAutoLoggingOut,
  resetAutoLogoutState,
  isAuthError,
  createAuthErrorHandler
} 