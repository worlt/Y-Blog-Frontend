<script setup>
import {computed, reactive, ref, watch} from 'vue'
import * as userApi from '@/api/user.js'
import * as appealApi from '@/api/appeal.js'
import {ElMessage} from 'element-plus'
import {useTokenStore} from '@/stores/token.js'
import {useUserInfoStore} from '@/stores/userInfo.js'
import SlideVerify from '@common/components/SlideVerify.vue'
import {useSlideVerify} from '@common/composables/useSlideVerify.js'

// 定义props和emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'login-success'])

const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 控制显示哪个表单
const activeForm = ref('login')

// 登录方式（密码或验证码）
const loginType = ref('password')

// 是否显示申诉表单
const showAppealForm = ref(false)

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
  username: '',
  reason: '',
  contactInfo: '',
  description: ''
})

// 验证规则
const loginRules = {
  email: [
    {required: true, message: '请输入邮箱地址', trigger: 'blur'},
    {type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur'}
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, message: '密码长度至少为6个字符', trigger: 'blur'}
  ]
}

// 验证码登录规则
const codeLoginRules = {
  email: [
    {required: true, message: '请输入邮箱地址', trigger: 'blur'},
    {type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur'}
  ],
  code: [
    {required: true, message: '请输入验证码', trigger: 'blur'}
  ]
}

const registerRules = {
  email: [
    {required: true, message: '请输入邮箱地址', trigger: 'blur'},
    {type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur'}
  ],
  username: [
    {required: true, message: '请输入用户名', trigger: 'blur'},
    {min: 2, message: '用户名长度至少为2个字符', trigger: 'blur'}
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, message: '密码长度至少为6个字符', trigger: 'blur'}
  ],
  confirmPassword: [
    {required: true, message: '请确认密码', trigger: 'blur'},
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
    {required: true, message: '请输入验证码', trigger: 'blur'}
  ]
}

const resetRules = {
  email: [
    {required: true, message: '请输入邮箱地址', trigger: 'blur'},
    {type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur'}
  ],
  code: [
    {required: true, message: '请输入验证码', trigger: 'blur'}
  ],
  password: [
    {required: true, message: '请输入新密码', trigger: 'blur'},
    {min: 6, message: '密码长度至少为6个字符', trigger: 'blur'}
  ],
  confirmPassword: [
    {required: true, message: '请确认新密码', trigger: 'blur'},
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
    {required: true, message: '请输入邮箱地址', trigger: 'blur'},
    {type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur'}
  ],
  username: [
    {required: true, message: '请输入用户名', trigger: 'blur'}
  ],
  reason: [
    {required: true, message: '请选择申诉理由', trigger: 'change'}
  ],
  contactInfo: [
    {required: true, message: '请输入联系方式', trigger: 'blur'}
  ],
  description: [
    {required: true, message: '请输入详细说明', trigger: 'blur'},
    {min: 10, message: '详细说明至少10个字符', trigger: 'blur'}
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

// 滑动验证相关
const {
  verifyDialogVisible,
  slideVerifyRef,
  triggerVerification,
  handleVerification
} = useSlideVerify()

// 计算属性控制弹窗显示
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 密码登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitPasswordLogin)
    }
  })
}

// 验证码登录处理
const handleCodeLogin = async () => {
  if (!codeLoginFormRef.value) return

  await codeLoginFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitCodeLogin)
    }
  })
}

// 实际提交密码登录
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
      if (response.msg && response.msg.includes('已被封禁')) {
        showAppealForm.value = true
        appealForm.email = loginForm.email
      } else {
        ElMessage.error(response.msg || '登录失败，请稍后重试')
      }
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('登录异常:', error)
    ElMessage.error('登录异常，请稍后重试')
  }
}

// 实际提交验证码登录
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
      if (response.msg && response.msg.includes('已被封禁')) {
        showAppealForm.value = true
        appealForm.email = codeLoginForm.email
      } else {
        ElMessage.error(response.msg || '登录失败，请稍后重试')
      }
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('验证码登录异常:', error)
    ElMessage.error('验证码登录异常，请稍后重试')
  }
}

// 处理登录成功
const handleLoginSuccess = (userData) => {
  tokenStore.setToken(userData.token)
  userInfoStore.setInfo({
    id: userData.id,
    username: userData.username,
    avatar: userData.avatar,
    role: userData.role
  })

  ElMessage.success('登录成功')
  dialogVisible.value = false
  emit('login-success', userData)

  // 重置表单
  resetForms()
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitRegister)
    }
  })
}

// 重置密码处理
const handleResetPassword = async () => {
  if (!resetFormRef.value) return

  await resetFormRef.value.validate((valid) => {
    if (valid) {
      triggerVerification(submitResetPassword)
    }
  })
}

// 实际提交注册
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
      ElMessage.error(response.msg || '注册失败，请稍后重试')
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('注册异常:', error)
    ElMessage.error('注册异常，请稍后重试')
  }
}

// 实际提交重置密码
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
      ElMessage.error(response.msg || '密码重置失败，请稍后重试')
      slideVerifyRef.value?.reset()
    }
  } catch (error) {
    console.error('密码重置异常:', error)
    ElMessage.error('密码重置异常，请稍后重试')
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
          username: appealForm.username,
          reason: appealForm.reason,
          contactInfo: appealForm.contactInfo,
          description: appealForm.description,
          submitTime: new Date(),
          status: 0
        })

        if (response.code === 0) {
          ElMessage.success('申诉提交成功，我们将尽快处理')
          showAppealForm.value = false
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
  if (timer.value) {
    clearInterval(timer.value)
    countdown.value = 0
    codeSending.value = false
  }
}

// 重置所有表单
const resetForms = () => {
  activeForm.value = 'login'
  loginType.value = 'password'
  showAppealForm.value = false

  // 重置表单数据
  Object.assign(loginForm, {email: '', password: '', rememberMe: false})
  Object.assign(codeLoginForm, {email: '', code: '', rememberMe: false})
  Object.assign(registerForm, {email: '', username: '', password: '', confirmPassword: '', code: ''})
  Object.assign(resetForm, {email: '', code: '', password: '', confirmPassword: ''})
  Object.assign(appealForm, {email: '', username: '', reason: '', contactInfo: '', description: ''})

  // 清除倒计时
  if (timer.value) {
    clearInterval(timer.value)
    countdown.value = 0
    codeSending.value = false
  }
}

// 监听弹窗关闭，重置表单
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    resetForms()
  }
})
</script>

<template>
  <el-dialog
      v-model="dialogVisible"
      :close-on-click-modal="false"
      :title="showAppealForm ? '账号申诉' : (activeForm === 'login' ? '账号登录' : activeForm === 'register' ? '账号注册' : '找回密码')"
      destroy-on-close
      width="400px"
  >
    <!-- 登录表单 -->
    <div v-if="activeForm === 'login' && !showAppealForm">
      <el-tabs v-model="loginType" class="login-tabs">
        <el-tab-pane label="密码登录" name="password">
          <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              label-position="left"
              label-width="70px"
              @keyup.enter="handleLogin"
          >
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="loginForm.email" placeholder="请输入邮箱地址"/>
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                  v-model="loginForm.password"
                  placeholder="请输入密码"
                  show-password
                  type="password"
              />
            </el-form-item>

            <div class="form-actions">
              <el-checkbox v-model="loginForm.rememberMe">记住我</el-checkbox>
              <el-button type="text" @click="switchForm('reset')">忘记密码?</el-button>
            </div>
            <div class="full-width-button-div">
              <el-button class="full-width-button" type="primary" @click="handleLogin">登录</el-button>
            </div>

          </el-form>
        </el-tab-pane>

        <el-tab-pane label="验证码登录" name="code">
          <el-form
              ref="codeLoginFormRef"
              :model="codeLoginForm"
              :rules="codeLoginRules"
              label-position="left"
              label-width="70px"
              @keyup.enter="handleCodeLogin"
          >
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="codeLoginForm.email" placeholder="请输入邮箱地址"/>
            </el-form-item>

            <el-form-item label="验证码" prop="code">
              <div class="code-input-group">
                <el-input v-model="codeLoginForm.code" placeholder="请输入验证码"/>
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

            <div class="full-width-button-div">
              <el-button class="full-width-button" type="primary" @click="handleCodeLogin">登录</el-button>
            </div>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="form-footer">
        <span>还没有账号?</span>
        <el-button type="text" @click="switchForm('register')">立即注册</el-button>
      </div>
    </div>

    <!-- 注册表单 -->
    <div v-if="activeForm === 'register'">
      <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="left"
          label-width="80px"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱地址"/>
        </el-form-item>

        <el-form-item label="验证码" prop="code">
          <div class="code-input-group">
            <el-input v-model="registerForm.code" placeholder="请输入验证码"/>
            <el-button
                :disabled="codeSending || countdown > 0"
                @click="sendCode('register')"
            >
              {{ countdown > 0 ? `${countdown}秒` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" placeholder="请输入用户名"/>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
              v-model="registerForm.password"
              placeholder="请输入密码（至少6个字符）"
              show-password
              type="password"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
              v-model="registerForm.confirmPassword"
              placeholder="请确认密码"
              show-password
              type="password"
          />
        </el-form-item>

        <div class="full-width-button-div">
          <el-button class="full-width-button" type="primary" @click="handleRegister">注册</el-button>
        </div>

        <div class="form-footer">
          <span>已有账号?</span>
          <el-button type="text" @click="switchForm('login')">立即登录</el-button>
        </div>
      </el-form>
    </div>

    <!-- 找回密码表单 -->
    <div v-if="activeForm === 'reset'">
      <el-form
          ref="resetFormRef"
          :model="resetForm"
          :rules="resetRules"
          label-position="left"
          label-width="80px"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="resetForm.email" placeholder="请输入注册邮箱"/>
        </el-form-item>

        <el-form-item label="验证码" prop="code">
          <div class="code-input-group">
            <el-input v-model="resetForm.code" placeholder="请输入验证码"/>
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
              placeholder="请输入新密码（至少6个字符）"
              show-password
              type="password"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
              v-model="resetForm.confirmPassword"
              placeholder="请确认新密码"
              show-password
              type="password"
          />
        </el-form-item>

        <div class="full-width-button-div">
          <el-button class="full-width-button" type="primary" @click="handleResetPassword">重置密码</el-button>
        </div>

        <div class="form-footer">
          <el-button type="text" @click="switchForm('login')">返回登录</el-button>
        </div>
      </el-form>
    </div>

    <!-- 申诉表单 -->
    <div v-if="showAppealForm">
      <div class="appeal-info">
        <el-alert
            :closable="false"
            show-icon
            title="您的账号已被封禁，请提交申诉"
            type="warning"
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
          <el-input v-model="appealForm.email" placeholder="请输入邮箱地址"/>
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="appealForm.username" placeholder="请输入用户名"/>
        </el-form-item>

        <el-form-item label="申诉理由" prop="reason">
          <el-select v-model="appealForm.reason" class="full-width" placeholder="请选择申诉理由">
            <el-option label="账号被盗用" value="被盗用"/>
            <el-option label="误封禁" value="误封禁"/>
            <el-option label="其他原因" value="其他原因"/>
          </el-select>
        </el-form-item>

        <el-form-item label="联系方式" prop="contactInfo">
          <el-input v-model="appealForm.contactInfo" placeholder="请输入联系方式（手机号/微信等）"/>
        </el-form-item>

        <el-form-item label="详细说明" prop="description">
          <el-input
              v-model="appealForm.description"
              :rows="4"
              placeholder="请详细说明申诉原因（至少10个字符）"
              type="textarea"
          />
        </el-form-item>

        <div class="full-width-button-div">
          <el-button class="full-width-button" type="primary" @click="handleAppeal">提交申诉</el-button>
        </div>

        <div class="form-footer">
          <el-button type="text" @click="showAppealForm = false; switchForm('login')">返回登录</el-button>
        </div>
      </el-form>
    </div>

    <!-- 滑动验证弹窗 -->
    <el-dialog
        v-model="verifyDialogVisible"
        :close-on-click-modal="false"
        title="请完成安全验证"
        width="350px"
        append-to-body
    >
      <div class="dialog-content">
        <SlideVerify
            ref="slideVerifyRef"
            @verify="handleVerification"
        />
      </div>
    </el-dialog>
  </el-dialog>
</template>

<style scoped>
.login-tabs {
  margin-bottom: 10px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.full-width-button-div {
  width: 100%;
  display: flex;
  justify-content: center;
}

.full-width-button {
  width: 80%;
  height: 40px;
  font-size: 16px;
  background: linear-gradient(135deg, #aa9ef5 0%, #7a71e8 100%);
  border: none;
}

.form-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.code-input-group {
  display: flex;
  width: 100%;
}

.code-input-group .el-input {
  margin-right: 10px;
  flex: 1;
}

.code-input-group .el-button {
  width: 100px;
  flex-shrink: 0;
}

.appeal-info {
  margin-bottom: 20px;
}

.full-width {
  width: 100%;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #e8e8e8;
}

:deep(.el-tabs__active-bar) {
  background-color: #aa9ef5;
}

:deep(.el-tabs__item.is-active) {
  color: #aa9ef5;
}

:deep(.el-tabs__item:hover) {
  color: #aa9ef5;
}

.dialog-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
}
</style> 