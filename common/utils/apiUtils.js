/**
 * API工具类
 * 提供统一的API调用格式和错误处理
 * @author Worlt
 */

import { ElMessage } from 'element-plus'

/**
 * API响应状态码
 */
export const API_CODE = {
  SUCCESS: 0,
  FAILURE: 1,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
}

/**
 * 统一API响应处理
 * @param {Promise} apiPromise - API请求Promise
 * @param {Object} options - 处理选项
 * @param {boolean} options.showSuccessMessage - 是否显示成功消息
 * @param {boolean} options.showErrorMessage - 是否显示错误消息
 * @param {string} options.successMessage - 自定义成功消息
 * @param {string} options.errorMessage - 自定义错误消息
 * @returns {Promise<Object>} 处理后的响应
 */
export async function handleApiResponse(apiPromise, options = {}) {
  const {
    showSuccessMessage = false,
    showErrorMessage = true,
    successMessage = '操作成功',
    errorMessage = '操作失败'
  } = options

  try {
    const response = await apiPromise
    
    if (response.code === API_CODE.SUCCESS) {
      if (showSuccessMessage) {
        ElMessage.success(response.msg || successMessage)
      }
      return { success: true, data: response.data, message: response.msg }
    } else {
      if (showErrorMessage) {
        ElMessage.error(response.msg || errorMessage)
      }
      return { success: false, data: null, message: response.msg || errorMessage }
    }
  } catch (error) {
    console.error('API请求失败:', error)
    
    const message = error.response?.data?.msg || error.message || errorMessage
    
    if (showErrorMessage) {
      ElMessage.error(message)
    }
    
    return { success: false, data: null, message }
  }
}

/**
 * 分页API响应处理
 * @param {Promise} apiPromise - API请求Promise
 * @param {Object} options - 处理选项
 * @returns {Promise<Object>} 分页响应数据
 */
export async function handlePageApiResponse(apiPromise, options = {}) {
  const response = await handleApiResponse(apiPromise, { 
    showErrorMessage: true, 
    ...options 
  })
  
  if (response.success) {
    return {
      success: true,
      data: response.data?.records || response.data?.list || [],
      total: response.data?.total || 0,
      current: response.data?.current || 1,
      size: response.data?.size || 10
    }
  } else {
    return {
      success: false,
      data: [],
      total: 0,
      current: 1,
      size: 10,
      message: response.message
    }
  }
}

/**
 * 构建查询参数
 * @param {Object} params - 参数对象
 * @returns {string} URL查询字符串
 */
export function buildQueryString(params) {
  if (!params || typeof params !== 'object') {
    return ''
  }
  
  const validParams = Object.entries(params)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return validParams.length > 0 ? `?${validParams.join('&')}` : ''
}

/**
 * 分页参数构建器
 * @param {number} page - 页码
 * @param {number} pageSize - 页面大小
 * @param {Object} filters - 筛选条件
 * @returns {Object} 分页参数对象
 */
export function buildPageParams(page = 1, pageSize = 10, filters = {}) {
  return {
    page: Math.max(1, page),
    pageSize: Math.max(1, Math.min(100, pageSize)), // 限制最大页面大小
    ...filters
  }
}

/**
 * API请求配置生成器
 * @param {string} method - HTTP方法
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Object} 请求配置
 */
export function createApiConfig(method, url, data = null, options = {}) {
  const config = {
    method: method.toUpperCase(),
    url,
    ...options
  }
  
  if (data) {
    if (method.toUpperCase() === 'GET') {
      config.params = data
    } else {
      config.data = data
    }
  }
  
  return config
}

/**
 * 批量API请求处理
 * @param {Array} apiPromises - API请求Promise数组
 * @param {Object} options - 处理选项
 * @returns {Promise<Array>} 批量响应结果
 */
export async function handleBatchApiResponse(apiPromises, options = {}) {
  const {
    showErrorMessage = false,
    continueOnError = true
  } = options
  
  try {
    if (continueOnError) {
      // 即使有错误也继续执行其他请求
      const results = await Promise.allSettled(apiPromises)
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { success: true, data: result.value, index }
        } else {
          if (showErrorMessage) {
            ElMessage.error(`第${index + 1}个请求失败`)
          }
          return { success: false, error: result.reason, index }
        }
      })
    } else {
      // 如果有错误就停止
      const results = await Promise.all(apiPromises)
      return results.map((result, index) => ({ success: true, data: result, index }))
    }
  } catch (error) {
    console.error('批量API请求失败:', error)
    if (showErrorMessage) {
      ElMessage.error('批量请求失败')
    }
    return []
  }
}

/**
 * 文件上传API处理
 * @param {File} file - 文件对象
 * @param {Function} uploadApi - 上传API函数
 * @param {Object} options - 上传选项
 * @returns {Promise<Object>} 上传结果
 */
export async function handleFileUpload(file, uploadApi, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 默认10MB
    allowedTypes = [],
    showProgress = false,
    onProgress = null
  } = options
  
  // 文件大小检查
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024))
    ElMessage.error(`文件大小不能超过${sizeMB}MB`)
    return { success: false, message: '文件过大' }
  }
  
  // 文件类型检查
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    ElMessage.error('不支持的文件类型')
    return { success: false, message: '文件类型不支持' }
  }
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await uploadApi(formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
    
    return await handleApiResponse(Promise.resolve(response), {
      showSuccessMessage: true,
      successMessage: '上传成功'
    })
  } catch (error) {
    console.error('文件上传失败:', error)
    ElMessage.error('上传失败')
    return { success: false, message: '上传失败' }
  }
}

/**
 * API重试机制
 * @param {Function} apiFunction - API函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} retryDelay - 重试间隔（毫秒）
 * @returns {Promise} API响应
 */
export async function retryApiCall(apiFunction, maxRetries = 3, retryDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction()
    } catch (error) {
      console.error(`API调用失败，第${attempt}次尝试:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      retryDelay *= 2 // 指数退避
    }
  }
} 