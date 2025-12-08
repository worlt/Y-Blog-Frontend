/**
 * HTTP状态码和错误消息统一管理
 * @author Worlt
 */

// HTTP状态码常量
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
}

// 业务响应码常量
export const BUSINESS_CODE = {
  SUCCESS: 0,
  FAILURE: 1,
  UNAUTHORIZED: 2,
  FORBIDDEN: 3,
  NOT_FOUND: 4,
  VALIDATION_ERROR: 5,
  SYSTEM_ERROR: 500
}

// 错误消息映射
export const ERROR_MESSAGES = {
  [HTTP_STATUS.BAD_REQUEST]: '请求参数错误',
  [HTTP_STATUS.UNAUTHORIZED]: '登录状态已过期，请重新登录',
  [HTTP_STATUS.FORBIDDEN]: '没有权限执行此操作',
  [HTTP_STATUS.NOT_FOUND]: '请求的资源不存在',
  [HTTP_STATUS.METHOD_NOT_ALLOWED]: '请求方法不被允许',
  [HTTP_STATUS.CONFLICT]: '资源冲突',
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: '数据验证失败',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [HTTP_STATUS.BAD_GATEWAY]: '网关错误',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [HTTP_STATUS.GATEWAY_TIMEOUT]: '网关超时',
  default: '网络请求失败，请稍后重试'
}

// 业务错误消息映射
export const BUSINESS_ERROR_MESSAGES = {
  [BUSINESS_CODE.FAILURE]: '操作失败',
  [BUSINESS_CODE.UNAUTHORIZED]: '用户未登录或登录已过期',
  [BUSINESS_CODE.FORBIDDEN]: '权限不足',
  [BUSINESS_CODE.NOT_FOUND]: '资源不存在',
  [BUSINESS_CODE.VALIDATION_ERROR]: '数据验证失败',
  [BUSINESS_CODE.SYSTEM_ERROR]: '系统错误',
  default: '操作失败，请稍后重试'
}

/**
 * 获取HTTP错误消息
 * @param {number} status - HTTP状态码
 * @returns {string} 错误消息
 */
export function getHttpErrorMessage(status) {
  return ERROR_MESSAGES[status] || ERROR_MESSAGES.default
}

/**
 * 获取业务错误消息
 * @param {number} code - 业务响应码
 * @param {string} msg - 服务端返回的消息
 * @returns {string} 错误消息
 */
export function getBusinessErrorMessage(code, msg) {
  // 优先使用服务端返回的消息，如果没有则使用默认映射
  if (msg && msg.trim()) {
    return msg
  }
  return BUSINESS_ERROR_MESSAGES[code] || BUSINESS_ERROR_MESSAGES.default
} 