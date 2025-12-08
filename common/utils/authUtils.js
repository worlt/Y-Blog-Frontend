/**
 * 登录认证工具
 * 提供统一的登录逻辑，减少代码重复
 * @author Worlt
 */

import { ElMessage } from 'element-plus'

/**
 * 登录类型枚举
 */
export const LOGIN_TYPE = {
  ADMIN: 'admin',
  AUDITOR: 'auditor', 
  USER: 'user'
}

/**
 * 通用表单验证规则
 */
export const VALIDATION_RULES = {
  // 用户名验证规则
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度应在 2-20 个字符', trigger: 'blur' }
  ],
  
  // 密码验证规则
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应在 6-20 个字符', trigger: 'blur' }
  ],
  
  // 邮箱验证规则
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  
  // 验证码验证规则
  code: [
    { required: true, message: '验证码不能为空', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码必须为6位数字', trigger: 'blur' }
  ]
}

/**
 * 统一登录处理函数
 * @param {Object} loginData - 登录数据
 * @param {Function} loginApi - 登录API函数
 * @param {Object} tokenStore - token存储
 * @param {Object} userStore - 用户信息存储
 * @param {Object} router - 路由对象
 * @param {string} redirectPath - 登录成功后重定向路径，默认为'/'
 * @returns {Promise<boolean>} 登录是否成功
 */
export async function handleLogin(loginData, loginApi, tokenStore, userStore, router, redirectPath = '/') {
  try {
    // 基础验证
    if (!validateLoginData(loginData)) {
      return false
    }
    
    // 调用登录API
    const result = await loginApi(loginData)
    
    if (result.code === 0) {
      // 登录成功
      ElMessage.success(result.msg || '登录成功')
      
      // 存储token和用户信息
      if (result.data.token) {
        tokenStore.setToken(result.data.token)
      }
      
      if (userStore && userStore.setInfo) {
        userStore.setInfo(result.data)
      }
      
      // 跳转到目标页面
      await router.push(redirectPath)
      
      return true
    } else {
      // 登录失败
      ElMessage.error(result.msg || '登录失败')
      return false
    }
  } catch (error) {
    console.error('登录过程中发生错误:', error)
    ElMessage.error('登录失败，请稍后重试')
    return false
  }
}

/**
 * 验证登录数据
 * @param {Object} loginData - 登录数据
 * @returns {boolean} 验证是否通过
 */
function validateLoginData(loginData) {
  // 用户名+密码登录
  if (loginData.username !== undefined) {
    if (!loginData.username || !loginData.password) {
      ElMessage.warning('请填写用户名和密码')
      return false
    }
  }
  
  // 邮箱+密码登录
  if (loginData.email !== undefined && loginData.password !== undefined) {
    if (!loginData.email || !loginData.password) {
      ElMessage.warning('请填写邮箱和密码')
      return false
    }
  }
  
  // 邮箱+验证码登录
  if (loginData.email !== undefined && loginData.code !== undefined) {
    if (!loginData.email || !loginData.code) {
      ElMessage.warning('请填写邮箱和验证码')
      return false
    }
  }
  
  return true
}

/**
 * 统一退出登录处理
 * @param {Object} tokenStore - token存储
 * @param {Object} userStore - 用户信息存储
 * @param {Object} router - 路由对象
 * @param {string} loginPath - 登录页路径，默认为'/login'
 */
export function handleLogout(tokenStore, userStore, router, loginPath = '/login') {
  try {
    // 清除token和用户信息
    if (tokenStore && tokenStore.removeToken) {
      tokenStore.removeToken()
    }
    
    if (userStore && userStore.removeInfo) {
      userStore.removeInfo()
    }
    
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    
    // 跳转到登录页
    router.push(loginPath)
    
    ElMessage.success('退出登录成功')
  } catch (error) {
    console.error('退出登录过程中发生错误:', error)
    ElMessage.error('退出登录失败')
  }
}

/**
 * 检查登录状态
 * @param {Object} tokenStore - token存储
 * @returns {boolean} 是否已登录
 */
export function isLoggedIn(tokenStore) {
  return !!(tokenStore && tokenStore.token)
}

/**
 * 生成重定向URL
 * @param {Object} route - 当前路由对象
 * @returns {string} 重定向URL
 */
export function getRedirectUrl(route) {
  const redirect = route.query.redirect
  return redirect ? decodeURIComponent(redirect) : '/'
}

/**
 * 密码强度检查
 * @param {string} password - 密码
 * @returns {Object} 检查结果 {level: number, message: string}
 */
export function checkPasswordStrength(password) {
  if (!password) {
    return { level: 0, message: '密码不能为空' }
  }
  
  let level = 0
  let message = ''
  
  // 长度检查
  if (password.length < 6) {
    return { level: 0, message: '密码长度至少6位' }
  }
  
  // 复杂度检查
  if (/[a-z]/.test(password)) level++
  if (/[A-Z]/.test(password)) level++
  if (/\d/.test(password)) level++
  if (/[^a-zA-Z\d]/.test(password)) level++
  
  switch (level) {
    case 1:
      message = '弱'
      break
    case 2:
      message = '中'
      break
    case 3:
      message = '强'
      break
    case 4:
      message = '很强'
      break
    default:
      message = '弱'
  }
  
  return { level, message }
} 