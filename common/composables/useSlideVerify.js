import { ref } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * @description 滑动验证码组合式函数
 * @returns {object} 包含验证码弹窗状态、组件引用、触发函数和处理函数
 */
export function useSlideVerify() {
  // 弹窗可见性
  const verifyDialogVisible = ref(false)
  // 组件引用
  const slideVerifyRef = ref(null)
  // 验证码token
  const captchaToken = ref('')
  // 成功后的回调函数
  let submitCallback = null

  /**
   * @description 触发验证弹窗
   * @param {Function} callback - 验证成功后要执行的回调函数
   */
  const triggerVerification = (callback) => {
    if (typeof callback !== 'function') {
      console.error('triggerVerification需要一个函数作为参数')
      return
    }
    submitCallback = callback
    verifyDialogVisible.value = true
    // 重置验证码状态，以防上次失败
    slideVerifyRef.value?.reset()
  }

  /**
   * @description 处理验证结果
   * @param {Object} result - 验证结果对象 {success: boolean, captchaToken: string}
   */
  const handleVerification = (result) => {
    if (result && result.success && result.captchaToken) {
      captchaToken.value = result.captchaToken
      verifyDialogVisible.value = false
      if (submitCallback) {
        submitCallback()
      }
    } else {
      ElMessage.error('验证失败，请重试')
      slideVerifyRef.value?.reset()
    }
  }

  /**
   * @description 获取验证码token
   * @returns {string} 验证码token
   */
  const getCaptchaToken = () => {
    return captchaToken.value
  }

  /**
   * @description 清除验证码token
   */
  const clearCaptchaToken = () => {
    captchaToken.value = ''
  }

  return {
    verifyDialogVisible,
    slideVerifyRef,
    captchaToken,
    triggerVerification,
    handleVerification,
    getCaptchaToken,
    clearCaptchaToken
  }
}
