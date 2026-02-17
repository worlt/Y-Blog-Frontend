<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as userApi from '@/api/user.js'
import * as appealApi from '@/api/appeal.js'
import { ElMessage, ElTabs, ElTabPane } from 'element-plus'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import SlideVerify from '@common/components/SlideVerify.vue'
import { useSlideVerify } from '@common/composables/useSlideVerify.js'

const router = useRouter()
const route = useRoute()
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 获取logo路径
const logo = new URL('/src/assets/logo.png', import.meta.url).href

// 控制显示哪个表单
const activeForm = ref('login')

// 登录方式（密码或验证码）
const loginType = ref('password')

// 是否显示申诉表单
const showAppealForm = ref(false)
// 邮箱是否只读（用于封禁跳转时）
const isEmailReadOnly = ref(false)

// 密码登录表单数据
const loginForm = reactive({
  email: '',
  password: '',
  rememberMe: false
})

// 验证码登录表单数据
const codeLoginForm = reactive({
  email: '',
  code: '',
  rememberMe: false
})

// 注册表单数据
const registerForm = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  code: ''
})

// 找回密码表单数据
const resetForm = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
})

// 申诉表单数据
const appealForm = reactive({
  email: '',
  appealReason: ''
})

// 验证规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ]
}

// 验证码登录规则
const codeLoginRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

const registerRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, message: '用户名长度至少为2个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

const resetRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const appealRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  appealReason: [
    { required: true, message: '请填写申诉理由', trigger: 'blur' },
    { min: 5, message: '申诉理由至少需要5个字符', trigger: 'blur' }
  ]
}

// 发送验证码相关
const codeSending = ref(false)
const countdown = ref(0)
const timer = ref(null)

// 表单引用
const loginFormRef = ref(null)
const codeLoginFormRef = ref(null)
const registerFormRef = ref(null)
const resetFormRef = ref(null)
const appealFormRef = ref(null)

const { 
  verifyDialogVisible, 
  slideVerifyRef, 
  triggerVerification, 
  handleVerification 
} = useSlideVerify();

// 密码登录处理
const handleLogin = async () => {
  await loginFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitPasswordLogin)
    }
  })
}

// 验证码登录处理
const handleCodeLogin = async () => {
  await codeLoginFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitCodeLogin)
    }
  })
}

// 登录成功后的通用处理
const handleLoginSuccess = (userData) => {
  // 使用Pinia store保存token和用户信息
  tokenStore.setToken(userData.token)
  userInfoStore.setInfo({
    id: userData.id,
    username: userData.username,
    avatar: userData.avatar,
    role: userData.role
  })

  ElMessage.success('登录成功')

  // 获取重定向路径
  const redirectPath = router.currentRoute.value.query.redirect || '/'

  // 使用 replace 替代 push，避免可以回退到登录页
  router.replace(redirectPath)

  // 清除浏览器历史记录中的登录页面
  setTimeout(() => {
    window.history.replaceState(null, '', redirectPath)
  }, 100)
}

// 注册处理
const handleRegister = async () => {
  await registerFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitRegister)
    }
  })
}

// 重置密码处理
const handleResetPassword = async () => {
  await resetFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitResetPassword)
    }
  })
}

// 实际提交逻辑
const submitPasswordLogin = async () => {
  try {
    const response = await userApi.loginByPassword({
      email: loginForm.email,
      password: loginForm.password,
      captchaToken: slideVerifyRef.value?.captchaToken || ''
    })
    if (response.code === 0) {
      handleLoginSuccess(response.data)
    } else {
      // 检查是否为封禁错误
      if (response.msg && response.msg.includes('封禁')) {
        appealForm.email = loginForm.email
        showAppealForm.value = true
        ElMessage.warning('您的账号已被封禁，请提交申诉')
      } else {
        ElMessage.error(response.msg || '登录失败')
      }
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('登录异常:', error)
  }
}

const submitCodeLogin = async () => {
  try {
    const response = await userApi.loginByCode({
      email: codeLoginForm.email,
      code: codeLoginForm.code,
      captchaToken: slideVerifyRef.value?.captchaToken || ''
    })
    if (response.code === 0) {
      handleLoginSuccess(response.data)
    } else {
      // 检查是否为封禁错误
      if (response.msg && response.msg.includes('封禁')) {
        appealForm.email = codeLoginForm.email
        showAppealForm.value = true
        ElMessage.warning('您的账号已被封禁，请提交申诉')
      } else {
        ElMessage.error(response.msg || '登录失败')
      }
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('验证码登录异常:', error)
  }
}

const submitRegister = async () => {
  try {
    const response = await userApi.register({
      email: registerForm.email,
      username: registerForm.username,
      password: registerForm.password,
      code: registerForm.code,
      captchaToken: slideVerifyRef.value?.captchaToken || ''
    })
    if (response.code === 0) {
      ElMessage.success('注册成功，请登录')
      activeForm.value = 'login'
      registerFormRef.value.resetFields()
    } else {
      ElMessage.error(response.msg || '注册失败')
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('注册异常:', error)
  }
}

const submitResetPassword = async () => {
  try {
    const response = await userApi.resetPassword({
      email: resetForm.email,
      code: resetForm.code,
      password: resetForm.password,
      captchaToken: slideVerifyRef.value?.captchaToken || ''
    })
    if (response.code === 0) {
      ElMessage.success('密码重置成功，请使用新密码登录')
      activeForm.value = 'login'
      resetFormRef.value.resetFields()
    } else {
      ElMessage.error(response.msg || '密码重置失败')
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('密码重置异常:', error)
  }
}

// 提交申诉处理
const handleAppeal = async () => {
  if (!appealFormRef.value) return

  await appealFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await appealApi.appealSubmit({
          email: appealForm.email,
          appealReason: appealForm.appealReason
          // 只传递后端需要的字段：邮箱和申诉原因
        })

        if (response.code === 0) {
          ElMessage.success('申诉提交成功，我们将尽快处理，后续请留意账号邮箱')
          showAppealForm.value = false
          // 清空表单
          appealFormRef.value.resetFields()
        } else {
          ElMessage.error(response.msg || '申诉提交失败，请稍后重试')
        }
      } catch (error) {
        console.error('申诉提交异常:', error)
        ElMessage.error('申诉提交异常，请稍后重试')
      }
    }
  })
}

// 发送验证码
const sendCode = async (type) => {
  let email

  switch (type) {
    case 'register':
      email = registerForm.email
      break
    case 'reset':
      email = resetForm.email
      break
    case 'login':
      email = codeLoginForm.email
      break
    default:
      email = ''
  }

  if (!email) {
    ElMessage.warning('请先输入邮箱地址')
    return
  }

  const emailReg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  if (!emailReg.test(email)) {
    ElMessage.warning('请输入正确的邮箱格式')
    return
  }

  try {
    codeSending.value = true
    const response = await userApi.sendVerificationCode(email)

    if (response.code === 0) {
      ElMessage.success('验证码已发送，请查收邮箱')
      // 开始倒计时
      countdown.value = 60
      timer.value = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer.value)
          codeSending.value = false
        }
      }, 1000)
    } else {
      ElMessage.error(response.msg || '验证码发送失败，请稍后重试')
      codeSending.value = false
    }
  } catch (error) {
    console.error('发送验证码异常:', error)
    ElMessage.error('发送验证码异常，请稍后重试')
    codeSending.value = false
  }
}

// 切换表单时重置验证
const switchForm = (formName) => {
  activeForm.value = formName
  // 重置倒计时
  if (timer.value) {
    clearInterval(timer.value)
    countdown.value = 0
    codeSending.value = false
  }
}
// 检查路由参数，处理封禁申诉跳转
onMounted(() => {
  if (route.query.banned === 'true') {
    const email = route.query.email
    const msg = route.query.msg
    
    if (email) {
      appealForm.email = email
      isEmailReadOnly.value = true
    }
    
    showAppealForm.value = true
    ElMessage.warning(msg || '您的账号已被封禁，请提交申诉')
    
    // 清除路由参数，避免刷新时再次触发（可选）
    // router.replace({ path: '/auth', query: {} })
  }
})
</script>

<template>
  <div class="auth-container">
    <div class="left-section">
      <div class="logo-container">
        <!--        <el-image :src="logo" fit="contain" class="logo-image"></el-image>-->
        <h1 class="site-name">Y-Blog</h1>
      </div>
      <div class="slogan">
        <h2>记录生活，分享知识</h2>
        <p>欢迎来到我们的博客平台，在这里你可以记录自己的生活点滴，分享你的专业知识，结交志同道合的朋友。</p>
      </div>
    </div>

    <div class="right-section">
      <!-- 登录表单 -->
      <el-card v-if="activeForm === 'login' && !showAppealForm" class="auth-card">
        <template #header>
          <div class="card-header">
            <span class="header-title">账号登录</span>
          </div>
        </template>

        <el-tabs v-model="loginType" class="login-tabs">
          <el-tab-pane label="密码登录" name="password">
            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              label-position="left"
              label-width="60px"
              @keyup.enter="handleLogin"
            >
              <el-form-item label="邮箱" prop="email" label-width="70px">
                <el-input v-model="loginForm.email" placeholder="请输入邮箱地址" />
              </el-form-item>

              <el-form-item label="密码" prop="password" label-width="70px">
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  show-password
                />
              </el-form-item>

              <div class="form-actions">
                <el-checkbox v-model="loginForm.rememberMe">记住我</el-checkbox>
                <el-button type="text" @click="switchForm('reset')">忘记密码?</el-button>
              </div>

              <el-button type="primary" class="full-width-button" @click="handleLogin">登录</el-button>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="验证码登录" name="code">
            <el-form
              ref="codeLoginFormRef"
              :model="codeLoginForm"
              :rules="codeLoginRules"
              label-position="left"
              label-width="60px"
              @keyup.enter="handleCodeLogin"
            >
              <el-form-item label="邮箱" prop="email" label-width="70px">
                <el-input v-model="codeLoginForm.email" placeholder="请输入邮箱地址" />
              </el-form-item>

              <el-form-item label="验证码" prop="code" label-width="70px">
                <div class="code-input-group">
                  <el-input v-model="codeLoginForm.code" placeholder="请输入验证码" />
                  <el-button
                    :disabled="codeSending || countdown > 0"
                    @click="sendCode('login')"
                  >
                    {{ countdown > 0 ? `${countdown}秒` : '获取验证码' }}
                  </el-button>
                </div>
              </el-form-item>

              <div class="form-actions">
                <el-checkbox v-model="codeLoginForm.rememberMe">记住我</el-checkbox>
                <div></div>
              </div>

              <el-button type="primary" class="full-width-button" @click="handleCodeLogin">登录</el-button>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <div class="form-footer">
          <span>还没有账号?</span>
          <el-button type="text" @click="switchForm('register')">立即注册</el-button>
        </div>
      </el-card>

      <!-- 注册表单 -->
      <el-card v-if="activeForm === 'register'" class="auth-card">
        <template #header>
          <div class="card-header">
            <span class="header-title">账号注册</span>
          </div>
        </template>

        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="left"
          label-width="80px"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="registerForm.email" placeholder="请输入邮箱地址" />
          </el-form-item>

          <el-form-item label="验证码" prop="code">
            <div class="code-input-group">
              <el-input v-model="registerForm.code" placeholder="请输入验证码" />
              <el-button
                :disabled="codeSending || countdown > 0"
                @click="sendCode('register')"
              >
                {{ countdown > 0 ? `${countdown}秒` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="用户名" prop="username">
            <el-input v-model="registerForm.username" placeholder="请输入用户名" />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码（至少6个字符）"
              show-password
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="请确认密码"
              show-password
            />
          </el-form-item>

          <el-button type="primary" class="full-width-button" @click="handleRegister">注册</el-button>

          <div class="form-footer">
            <span>已有账号?</span>
            <el-button type="text" @click="switchForm('login')">立即登录</el-button>
          </div>
        </el-form>
      </el-card>

      <!-- 找回密码表单 -->
      <el-card v-if="activeForm === 'reset'" class="auth-card">
        <template #header>
          <div class="card-header">
            <span class="header-title">找回密码</span>
          </div>
        </template>

        <el-form
          ref="resetFormRef"
          :model="resetForm"
          :rules="resetRules"
          label-position="left"
          label-width="80px"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="resetForm.email" placeholder="请输入注册邮箱" />
          </el-form-item>

          <el-form-item label="验证码" prop="code">
            <div class="code-input-group">
              <el-input v-model="resetForm.code" placeholder="请输入验证码" />
              <el-button
                :disabled="codeSending || countdown > 0"
                @click="sendCode('reset')"
              >
                {{ countdown > 0 ? `${countdown}秒` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="新密码" prop="password">
            <el-input
              v-model="resetForm.password"
              type="password"
              placeholder="请输入新密码（至少6个字符）"
              show-password
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="resetForm.confirmPassword"
              type="password"
              placeholder="请确认新密码"
              show-password
            />
          </el-form-item>

          <el-button type="primary" class="full-width-button" @click="handleResetPassword">重置密码</el-button>

          <div class="form-footer">
            <el-button type="text" @click="switchForm('login')">返回登录</el-button>
          </div>
        </el-form>
      </el-card>

      <!-- 申诉表单 -->
      <el-card v-if="showAppealForm" class="auth-card">
        <template #header>
          <div class="card-header">
            <span class="header-title">账号申诉</span>
          </div>
        </template>

        <div class="appeal-info">
          <el-alert
            title="您的账号已被封禁，请提交申诉"
            type="warning"
            :closable="false"
            show-icon
          />
        </div>

        <el-form
          ref="appealFormRef"
          :model="appealForm"
          :rules="appealRules"
          label-position="left"
          label-width="80px"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="appealForm.email" placeholder="请输入邮箱地址" :disabled="isEmailReadOnly"/>
          </el-form-item>

          <el-form-item label="申诉理由" prop="appealReason">
            <el-input
              v-model="appealForm.appealReason"
              type="textarea"
              :rows="3"
              placeholder="请详细描述您的申诉原因"
            />
          </el-form-item>

          <el-button type="primary" class="full-width-button" @click="handleAppeal">提交申诉</el-button>

          <div class="form-footer">
            <el-button type="text" @click="showAppealForm = false; switchForm('login')">返回登录</el-button>
          </div>
        </el-form>
      </el-card>

      <!-- 验证码弹窗 -->
      <el-dialog v-model="verifyDialogVisible" title="请完成安全验证" width="350px" :close-on-click-modal="false">
        <div class="dialog-content">
          <SlideVerify
            ref="slideVerifyRef"
            @verify="handleVerification"
          />
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
/* 像素风登录注册页面 */
.auth-container {
  display: flex;
  height: calc(100vh - 56px);
  overflow: hidden;
  background-color: var(--pixel-bg-primary);
}

.left-section {
  width: 55%;
  background: linear-gradient(135deg, var(--pixel-primary) 0%, var(--pixel-primary-dark) 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px;
  color: white;
  border-right: 4px solid #000;
  position: relative;
}

.left-section::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 100%);
}

.logo-container {
  display: flex;
  align-items: center;
  margin-bottom: 40px;
}

.logo-image {
  width: 80px;
  height: 80px;
  margin-right: 20px;
  border: 4px solid #000;
  box-shadow: 4px 4px 0 #000;
}

.site-name {
  font-family: var(--pixel-font-display);
  font-size: 24px;
  color: white;
  margin: 0;
  text-shadow: 3px 3px 0 #000;
}

.slogan {
  max-width: 500px;
}

.slogan h2 {
  font-family: var(--pixel-font-display);
  font-size: 20px;
  color: white;
  margin-bottom: 20px;
  text-shadow: 2px 2px 0 #000;
}

.slogan p {
  font-family: var(--pixel-font-body);
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.right-section {
  width: 45%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: var(--pixel-bg-primary);
}

/* 像素风认证卡片 */
.auth-card {
  width: 100%;
  max-width: 420px;
  border: 4px solid #000 !important;
  box-shadow: 6px 6px 0 #000 !important;
  border-radius: 0 !important;
  background: var(--pixel-bg-card) !important;
}

:deep(.el-card__header) {
  border-bottom: 4px solid #000 !important;
  background: var(--pixel-primary) !important;
  padding: 16px !important;
}

.card-header {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.header-title {
  font-family: var(--pixel-font-display);
  font-size: 12px;
  color: #fff;
  text-shadow: 2px 2px 0 #000;
  text-transform: uppercase;
}

.login-tabs {
  margin-bottom: 10px;
}

:deep(.el-tabs__item) {
  font-family: var(--pixel-font-body) !important;
  font-size: 14px !important;
}

:deep(.el-tabs__item.is-active) {
  color: var(--pixel-primary) !important;
}

:deep(.el-tabs__active-bar) {
  background: var(--pixel-primary) !important;
  border: 2px solid #000 !important;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* 像素风按钮 */
.full-width-button {
  width: 100%;
  margin-bottom: 20px;
  height: 44px !important;
  font-family: var(--pixel-font-body) !important;
  font-size: 16px !important;
  background: var(--pixel-primary) !important;
  border: 3px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: 3px 3px 0 #000 !important;
  transition: all 0.1s ease !important;
}

.full-width-button:hover {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 #000 !important;
}

.full-width-button:active {
  transform: translate(3px, 3px);
  box-shadow: none !important;
}

/* 像素风输入框 */
:deep(.el-input__wrapper) {
  border-radius: 0 !important;
  border: 2px solid #000 !important;
  box-shadow: 2px 2px 0 #000 !important;
  background: var(--pixel-bg-secondary) !important;
}

:deep(.el-input__inner) {
  font-family: var(--pixel-font-body) !important;
  color: var(--pixel-text-primary) !important;
}

:deep(.el-input__inner::placeholder) {
  color: var(--pixel-text-muted) !important;
}

.form-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

:deep(.el-button--text) {
  font-family: var(--pixel-font-body) !important;
  color: var(--pixel-primary-light) !important;
}

:deep(.el-button--text:hover) {
  color: var(--pixel-primary) !important;
}

.code-input-group {
  display: flex;
  width: 100%;
}

.code-input-group :deep(.el-input) {
  margin-right: 10px;
  flex: 1;
}

.code-input-group .el-button {
  width: 100px;
  flex-shrink: 0;
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  background: var(--pixel-secondary) !important;
  color: #000 !important;
  font-family: var(--pixel-font-body);
  box-shadow: 2px 2px 0 #000 !important;
}

.code-input-group .el-button:hover:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #000 !important;
}

.code-input-group .el-button:disabled {
  background: var(--pixel-bg-secondary) !important;
  color: var(--pixel-text-muted) !important;
}

.appeal-info {
  margin-bottom: 20px;
}

/* 像素风复选框 */
:deep(.el-checkbox__inner) {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
  background: var(--pixel-bg-secondary) !important;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: var(--pixel-primary) !important;
  border-color: #000 !important;
}

:deep(.el-checkbox__label) {
  font-family: var(--pixel-font-body) !important;
  color: var(--pixel-text-secondary) !important;
}

.full-width {
  width: 100%;
}

/* 像素风对话框 */
:deep(.el-dialog) {
  border: 4px solid #000 !important;
  border-radius: 0 !important;
  box-shadow: 8px 8px 0 #000 !important;
  background: var(--pixel-bg-card) !important;
}

:deep(.el-dialog__header) {
  border-bottom: 4px solid #000 !important;
  background: var(--pixel-primary) !important;
}

:deep(.el-dialog__title) {
  font-family: var(--pixel-font-display) !important;
  font-size: 10px !important;
  color: #fff !important;
  text-shadow: 1px 1px 0 #000;
}

:deep(.el-dialog__body) {
  background: var(--pixel-bg-card) !important;
}

/* 像素风警告框 */
:deep(.el-alert) {
  border: 2px solid #000 !important;
  border-radius: 0 !important;
}

/* 响应式 */
@media (max-width: 768px) {
  .auth-container {
    flex-direction: column;
  }
  
  .left-section {
    width: 100%;
    padding: 30px;
    border-right: none;
    border-bottom: 4px solid #000;
  }
  
  .right-section {
    width: 100%;
    padding: 20px;
  }
  
  .site-name {
    font-size: 18px;
  }
  
  .slogan h2 {
    font-size: 14px;
  }
}
</style>