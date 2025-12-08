/**
 * 统一错误处理工具
 * @author Worlt
 */

import { ElMessage, ElMessageBox } from 'element-plus'
import { HTTP_STATUS, BUSINESS_CODE, getHttpErrorMessage, getBusinessErrorMessage } from './httpStatus.js'

/**
 * 错误处理策略枚举
 */
export const ERROR_STRATEGY = {
  REDIRECT: 'redirect',      // 页面跳转
  DIALOG: 'dialog',         // 弹窗提示
  MESSAGE_ONLY: 'message'   // 仅显示消息
}

/**
 * 创建错误处理器
 * @param {Object} config - 配置项
 * @param {string} config.strategy - 错误处理策略
 * @param {Function} config.onUnauthorized - 未授权处理回调
 * @param {Function} config.clearAuth - 清除认证信息回调
 * @param {Object} config.router - 路由实例（redirect策略需要）
 * @returns {Object} 错误处理器
 */
export function createErrorHandler(config = {}) {
  const {
    strategy = ERROR_STRATEGY.MESSAGE_ONLY,
    onUnauthorized,
    clearAuth,
    router
  } = config

  /**
   * 处理HTTP错误响应
   * @param {Object} error - axios错误对象
   * @returns {Promise} rejected promise
   */
  function handleHttpError(error) {
    const { response } = error

    if (!response) {
      // 网络错误或请求被取消
      ElMessage.error('网络连接失败，请检查网络设置')
      return Promise.reject(error)
    }

    const { status } = response
    const responseData = response.data

    // 处理401未授权错误
    if (status === HTTP_STATUS.UNAUTHORIZED) {
      return handleUnauthorized()
    }

    // 处理400错误
    if (status === HTTP_STATUS.BAD_REQUEST) {
      // 如果是用户未登录访问需要认证的接口，静默处理
      if (responseData && responseData.msg && responseData.msg.includes('用户未登录')) {
        console.log('用户未登录访问需要认证的接口，已静默处理')
        return Promise.reject(error)
      }

      // 优先使用后端返回的错误消息
      const errorMessage = (responseData && responseData.msg)
        ? responseData.msg
        : getHttpErrorMessage(status)
      ElMessage.error(errorMessage)
      return Promise.reject(error)
    }

    const errorMessage = getHttpErrorMessage(status)
    // 显示错误消息
    ElMessage.error(errorMessage)
    return Promise.reject(error)
  }

  /**
   * 处理业务错误响应
   * @param {Object} data - 响应数据
   * @returns {Promise} rejected promise
   */
  function handleBusinessError(data) {
    const { code, msg } = data
    const errorMessage = getBusinessErrorMessage(code, msg)

    // 处理未授权业务错误
    if (code === BUSINESS_CODE.UNAUTHORIZED) {
      return handleUnauthorized()
    }

    // 显示错误消息
    ElMessage.error(errorMessage)
    return Promise.reject(data)
  }

  /**
   * 处理未授权情况
   */
  function handleUnauthorized() {
    // 执行清除认证信息回调
    if (clearAuth) {
      clearAuth()
    }

    switch (strategy) {
      case ERROR_STRATEGY.REDIRECT:
        ElMessage.error('请先登录')
        if (router) {
          router.push('/login')
        }
        break

      case ERROR_STRATEGY.DIALOG:
        if (onUnauthorized) {
          // 使用自定义的未授权处理逻辑（如显示登录弹窗）
          onUnauthorized()
        } else {
          // 默认弹窗提示
          ElMessageBox.confirm(
            '登录状态已过期，请重新登录',
            '提示',
            {
              confirmButtonText: '重新登录',
              cancelButtonText: '取消',
              type: 'warning',
            }
          ).then(() => {
            // 用户确认后的处理逻辑由调用方决定
          }).catch(() => {
            // 用户取消，继续当前操作
          })
        }
        break

      case ERROR_STRATEGY.MESSAGE_ONLY:
      default:
        ElMessage.error('登录状态已过期，请重新登录')
        if (onUnauthorized) {
          onUnauthorized()
        }
        break
    }
  }

  /**
   * 响应拦截器错误处理
   * @param {Object} error - axios错误对象
   */
  function handleResponseError(error) {
    return handleHttpError(error)
  }

  /**
   * 业务逻辑错误处理（用于响应拦截器成功回调）
   * @param {Object} result - 响应结果
   */
  function handleBusinessResponse(result) {
    const { data } = result

    // 检查业务响应码
    if (data.code === BUSINESS_CODE.SUCCESS) {
      return data
    }

    // 处理业务错误
    return handleBusinessError(data)
  }

  // 返回错误处理器接口
  return {
    handleHttpError,
    handleBusinessError,
    handleResponseError,
    handleBusinessResponse,
    handleUnauthorized,
    HTTP_STATUS,
    BUSINESS_CODE
  }
}

/**
 * 默认错误处理器（仅显示消息）
 */
export const defaultErrorHandler = createErrorHandler()

/**
 * 请求拦截器错误处理
 * @param {Object} error - 请求错误
 */
export function handleRequestError(error) {
  console.error('请求发送失败:', error)
  ElMessage.error('请求发送失败')
  return Promise.reject(error)
}

/**
 * 通用日志记录
 * @param {string} type - 日志类型
 * @param {*} data - 日志数据
 */
export function logError(type, data) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`[${type}] 错误详情`)
    console.error(data)
    console.groupEnd()
  }
} 