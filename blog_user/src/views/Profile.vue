<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { useUserInfoStore } from '@/stores/userInfo.js'
import * as userApi from '@/api/user.js'
import * as commonApi from '@/api/common.js'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'

// 用户信息
const userInfoStore = useUserInfoStore()
const userForm = reactive({
  id: '',
  username: '',
  email: '',
  avatar: '',
  phone: '',
  gender: null, // 后端是Integer，需要与性别选项匹配
  fans: 0, // 后端UserVO中有fans字段
  role: null,
  createTime: null,
  updateTime: null
})

// 修改密码表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 邮箱重置密码表单
const emailResetForm = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

// 个人统计数据
const userStats = reactive({
  blogCount: 0,
  followCount: 0,
  fansCount: 0,
  likeCount: 0,
  viewCount: 0
})

// 编辑模式
const editMode = ref(false)
// 头像上传相关
const avatarFile = ref(null)
const avatarPreview = ref('') // 新增：用于预览选中的头像，不直接修改 userForm.avatar
const avatarUploadVisible = ref(false)
const avatarUploading = ref(false)
// 提交状态
const saving = ref(false)
// 修改密码对话框
const passwordDialogVisible = ref(false)
const changingPassword = ref(false)
// 邮箱重置密码对话框
const emailResetDialogVisible = ref(false)
// 密码修改方式
const passwordChangeMethod = ref('oldPassword')

// 验证码相关
const codeSending = ref(false)
const countdown = ref(0)
const timer = ref(null)

// 性别选项 - 与后端保持一致
const genderOptions = [
  { label: '保密', value: null },
  { label: '男', value: 1 },
  { label: '女', value: 2 }
]

// 密码表单规则
const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
}

// 邮箱重置密码表单规则
const emailResetRules = {
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度为6位', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== emailResetForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
}

// 通过邮箱验证码重置密码
const emailResetRef = ref(null)
const resetPasswordLoading = ref(false) // 只用于确认重置按钮的loading状态

const resetPasswordByEmail = async () => {
  if (!emailResetRef.value) return
  
  await emailResetRef.value.validate(async (valid) => {
    if (valid) {
      resetPasswordLoading.value = true // 开始重置，显示loading
      try {
        // 根据后端ResetPasswordDTO类定义，正确的参数是email、code和newPassword
        const response = await userApi.resetPassword({
          email: userForm.email,
          code: emailResetForm.code,
          newPassword: emailResetForm.newPassword  // 注意：后端DTO需要的参数是newPassword
        })
        
        if (response.code === 0) {
          ElMessage.success('密码重置成功')
          emailResetDialogVisible.value = false
          // 清空表单
          emailResetForm.code = ''
          emailResetForm.newPassword = ''
          emailResetForm.confirmPassword = ''
        } else {
          ElMessage.error(response.msg || '密码重置失败')
        }
      } catch (error) {
        console.error('重置密码失败:', error)
        ElMessage.error('重置密码失败，请稍后重试')
      } finally {
        resetPasswordLoading.value = false // 无论成功失败，结束loading
      }
    }
  })
}

// 初始化
onMounted(async () => {
  await loadUserProfile()
  await loadUserStats()
})

// 加载用户个人资料
const loadUserProfile = async () => {
  try {
    const result = await userApi.getUserProfile()
    
    if (result.code === 0 && result.data) {
      const profile = result.data
      console.log('获取到的用户资料:', profile)
      
      // 填充表单数据，只使用后端UserVO中存在的字段
      userForm.id = profile.id
      userForm.username = profile.username || ''
      userForm.email = profile.email || ''
      userForm.avatar = profile.avatar || ''
      userForm.phone = profile.phone || ''
      userForm.gender = profile.gender
      userForm.fans = profile.fans || 0
      userForm.role = profile.role
      userForm.createTime = profile.createTime
      userForm.updateTime = profile.updateTime
      
      // 更新 store 中的用户信息
      if (profile) {
        const currentInfo = userInfoStore.info || {}
        userInfoStore.setInfo({
          ...currentInfo,
          id: profile.id,
          username: profile.username || currentInfo.username,
          avatar: profile.avatar || currentInfo.avatar
        })
      }
    } else {
      ElMessage.error(result.msg || '获取个人资料失败')
    }
  } catch (error) {
    console.error('获取个人资料失败:', error)
    ElMessage.error('获取个人资料失败，请稍后重试')
  }
}

// 加载用户统计信息
const loadUserStats = async () => {
  try {
    // 使用getUserStats API获取所有用户统计信息
    const result = await userApi.getUserStats()
    
    if (result.code === 0 && result.data) {
      // 设置统计数据
      userStats.blogCount = result.data.blogCount || 0
      userStats.followCount = result.data.followCount || 0
      userStats.fansCount = result.data.fansCount || 0
      userStats.likeCount = result.data.likeCount || 0
      userStats.viewCount = result.data.viewCount || 0
      console.log('获取到的用户统计数据:', result.data)
    } else {
      console.error('获取用户统计信息失败:', result.msg)
      // 设置默认值
      userStats.blogCount = 0
      userStats.followCount = 0
      userStats.fansCount = userForm.fans || 0
      userStats.likeCount = 0
      userStats.viewCount = 0
    }
  } catch (error) {
    console.error('获取用户统计信息失败:', error)
    // 设置默认值
    userStats.blogCount = 0
    userStats.followCount = 0
    userStats.fansCount = userForm.fans || 0
    userStats.likeCount = 0
    userStats.viewCount = 0
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  if (editMode.value) {
    // 退出编辑模式，确认是否保存
    ElMessageBox.confirm('是否保存修改的信息？', '提示', {
      confirmButtonText: '保存',
      cancelButtonText: '不保存',
      type: 'warning',
      distinguishCancelAndClose: true
    })
      .then(() => {
        saveUserProfile()
      })
      .catch(action => {
        if (action === 'cancel') {
          // 不保存，重新加载数据
          loadUserProfile()
        }
        editMode.value = false
      })
  } else {
    // 进入编辑模式
    editMode.value = true
  }
}

// 保存用户资料
const saveUserProfile = async () => {
  saving.value = true
  try {
    // 构建更新数据，只包含后端UserDTO支持的字段，不包括createTime和updateTime
    const updateData = {
      id: userForm.id,
      username: userForm.username,
      email: userForm.email,
      avatar: userForm.avatar,
      phone: userForm.phone || '',
      gender: userForm.gender,
      role: null, // 显式设置为null，避免后端处理问题
      status: null // 显式设置为null，避免后端处理问题
    }
    
    const result = await userApi.updateUserProfile(updateData)
    
    if (result.code === 0) {
      ElMessage.success('保存成功')
      
      // 更新 store 中的用户信息
      const currentInfo = userInfoStore.info || {}
      userInfoStore.setInfo({
        ...currentInfo,
        username: userForm.username,
        avatar: userForm.avatar,
        id: userForm.id
      })
      
      // 退出编辑模式
      editMode.value = false
    } else {
      ElMessage.error(result.msg || '保存失败')
    }
  } catch (error) {
    console.error('保存个人资料失败:', error)
    ElMessage.error('保存个人资料失败')
  } finally {
    saving.value = false
  }
}

// 显示修改密码对话框
const showChangePasswordDialog = () => {
  passwordDialogVisible.value = true
  // 重置表单
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  // 默认使用旧密码方式
  passwordChangeMethod.value = 'oldPassword'
}

// 显示邮箱重置密码对话框
const showEmailResetDialog = () => {
  emailResetDialogVisible.value = true
  // 重置表单
  emailResetForm.email = userForm.email || ''
  emailResetForm.code = ''
  emailResetForm.newPassword = ''
  emailResetForm.confirmPassword = ''
}

// 修改密码
const passwordRef = ref(null)
const changePassword = async () => {
  if (!passwordRef.value) return
  
  await passwordRef.value.validate(async (valid) => {
    if (valid) {
      changingPassword.value = true
      try {
        // 调用修改密码API
        const response = await userApi.updatePassword({
          id: userForm.id,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
        
        if (response.code === 0) {
          ElMessage.success('密码修改成功')
          passwordDialogVisible.value = false
          // 清空表单
          passwordForm.oldPassword = ''
          passwordForm.newPassword = ''
          passwordForm.confirmPassword = ''
        } else {
          ElMessage.error(response.msg || '密码修改失败')
        }
      } catch (error) {
        console.error('修改密码失败:', error)
        ElMessage.error('修改密码失败，请稍后重试')
      } finally {
        changingPassword.value = false
      }
    }
  })
}

// 发送验证码
const sendVerificationCode = async () => {
  if (!userForm.email || !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(userForm.email)) {
    ElMessage.warning('请先设置有效的邮箱地址')
    return
  }
  
  codeSending.value = true
  try {
    const response = await userApi.sendVerificationCode(userForm.email)
    if (response.code === 0) {
      ElMessage.success('验证码已发送，请查收邮箱')
      countdown.value = 60
      timer.value = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer.value)
          timer.value = null
        }
      }, 1000)
    } else {
      ElMessage.error(response.msg || '验证码发送失败')
    }
  } catch (error) {
    console.error('发送验证码失败:', error)
    ElMessage.error('发送验证码失败，请稍后重试')
  } finally {
    codeSending.value = false
  }
}

// 显示头像上传对话框
const showAvatarUploadDialog = () => {
  // 打开对话框时，将当前的头像赋值给预览变量
  avatarPreview.value = userForm.avatar
  avatarFile.value = null // 清空之前选中的文件
  avatarUploadVisible.value = true
}

// 处理头像文件选择
const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // 校验文件类型
  if (!file.type.includes('image')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  
  // 校验文件大小（限制为2MB）
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过2MB')
    return
  }
  
  avatarFile.value = file
  
  // 预览图片
  const reader = new FileReader()
  reader.onload = (e) => {
    // 修改：只更新预览变量，不更新 userForm.avatar
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
  
  // 清空文件输入框，以便重复上传同一文件
  e.target.value = ''
}

// 上传头像
const uploadAvatar = async () => {
  if (!avatarFile.value) {
    ElMessage.warning('请先选择图片')
    return
  }
  
  avatarUploading.value = true
  // 显示加载中
  const loadingInstance = ElLoading.service({
    fullscreen: true,
    text: '头像上传中...'
  })
  
  try {
    // 使用common API上传文件
    const response = await commonApi.uploadImage(avatarFile.value)
    
    if (response.code === 0 && response.data) {
      // 设置新头像URL
      userForm.avatar = response.data
      avatarUploadVisible.value = false
      ElMessage.success('上传成功')
      
      // 更新store中的头像
      const currentInfo = userInfoStore.info || {}
      userInfoStore.setInfo({
        ...currentInfo,
        avatar: userForm.avatar
      })
      
      // 如果不在编辑模式，直接保存修改
      if (!editMode.value) {
        // 仅更新头像，其他信息保持不变
        const updateResult = await userApi.updateUserProfile({ 
          id: userForm.id,
          avatar: userForm.avatar
        })
        if (updateResult.code === 0) {
          ElMessage.success('头像更新成功')
        } else {
          ElMessage.error(updateResult.msg || '头像更新失败')
        }
      }
    } else {
      ElMessage.error(response.msg || '上传失败')
    }
  } catch (error) {
    console.error('上传头像失败:', error)
    ElMessage.error('上传头像失败，请稍后重试')
  } finally {
    // 关闭加载中
    loadingInstance.close()
    avatarUploading.value = false
  }
}

// 格式化性别显示
const formatGender = (gender) => {
  const option = genderOptions.find(item => item.value === gender)
  return option ? option.label : '保密'
}

// 格式化角色显示
const getRoleName = (role) => {
  if (role === 2) return '普通用户'
  if (role === 3) return 'VIP用户'
  return '未知'
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="profile-page">
      <!-- 个人资料卡片 -->
      <div class="profile-card">
        <div class="profile-header">
          <!-- 个人资料标题 -->
          <div class="header-title">
          <h2 class="title">个人资料</h2>
          <div class="actions">
            <el-button 
              type="primary" 
              @click="toggleEditMode"
              :loading="saving"
            >
              {{ editMode ? '保存' : '编辑资料' }}
            </el-button>
            
            <el-button v-if="editMode" @click="editMode = false">取消</el-button>
            
            <el-button 
              v-if="!editMode" 
              @click="showChangePasswordDialog"
            >修改密码</el-button>
          </div>
        </div>
        
        <!-- 头像和基本信息 -->
        <div class="profile-info">
          <!-- 头像 -->
          <div class="avatar-container">
            <div 
              class="avatar-wrapper"
              :class="{ 'avatar-editable': editMode }"
              @click="editMode && showAvatarUploadDialog()"
            >
              <el-avatar :size="100" :src="userForm.avatar" />
              <div 
                v-if="editMode" 
                class="avatar-edit-overlay"
              >
                <span>更换头像</span>
              </div>
            </div>
          </div>
          
          <!-- 用户名和简介 -->
          <div class="basic-info">
            <template v-if="editMode">
              <div class="form-item">
                <div class="form-label">用户名</div>
                <el-input v-model="userForm.username" placeholder="请输入用户名" maxlength="20" />
              </div>
              
            </template>
            
            <template v-else>
              <h2 class="username">{{ userForm.username }}</h2>
              <p class="bio">这个人很懒，什么都没留下...</p>
            </template>
          </div>
        </div>
      </div>
      
      <!-- 统计数据 -->
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-value">{{ userStats.blogCount }}</div>
          <div class="stat-label">博客</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ userStats.followCount }}</div>
          <div class="stat-label">关注</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ userStats.fansCount }}</div>
          <div class="stat-label">粉丝</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ userStats.likeCount }}</div>
          <div class="stat-label">获赞</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ userStats.viewCount }}</div>
          <div class="stat-label">总浏览</div>
        </div>
      </div>
      
      <!-- 详细资料 -->
      <div class="detail-container">
        <h3 class="section-title">详细资料</h3>
        
        <div class="detail-content">
          <div class="detail-row">
            <div class="detail-label">邮箱</div>
            <!-- 邮箱不可编辑，始终显示只读状态 -->
            <div class="detail-value">{{ userForm.email || '未设置' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">性别</div>
            <div v-if="editMode" class="detail-value">
              <el-select v-model="userForm.gender" placeholder="请选择性别">
                <el-option 
                  v-for="item in genderOptions" 
                  :key="item.value" 
                  :label="item.label" 
                  :value="item.value" 
                />
              </el-select>
            </div>
            <div v-else class="detail-value">{{ formatGender(userForm.gender) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">用户角色</div>
            <div class="detail-value">{{ getRoleName(userForm.role) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">注册时间</div>
            <div class="detail-value">{{ userForm.createTime ? formatDate(userForm.createTime) : '未知' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">更新时间</div>
            <div class="detail-value">{{ userForm.updateTime ? formatDate(userForm.updateTime) : '未知' }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="450px"
    >
      <el-tabs v-model="passwordChangeMethod">
        <!-- 使用旧密码修改 -->
        <el-tab-pane label="旧密码验证" name="oldPassword">
          <el-form
            ref="passwordRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="100px"
            class="password-form"
          >
            <el-form-item label="原密码" prop="oldPassword">
              <el-input 
                v-model="passwordForm.oldPassword" 
                type="password" 
                placeholder="请输入当前密码"
                show-password
              />
            </el-form-item>
            
            <el-form-item label="新密码" prop="newPassword">
              <el-input 
                v-model="passwordForm.newPassword" 
                type="password" 
                placeholder="请输入新密码"
                show-password
              />
            </el-form-item>
            
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input 
                v-model="passwordForm.confirmPassword" 
                type="password" 
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>
          </el-form>
          
          <div class="dialog-footer">
            <el-button @click="passwordDialogVisible = false">取消</el-button>
            <el-button 
              type="primary" 
              @click="changePassword"
              :loading="changingPassword"
            >确认修改</el-button>
          </div>
        </el-tab-pane>
        
        <!-- 使用邮箱验证码修改 -->
        <el-tab-pane label="邮箱验证码" name="emailReset">
          <div class="email-reset-intro">
            <p>如果您忘记了原密码，可以通过邮箱验证码重置密码</p>
          </div>
          
          <div class="reset-action">
            <el-button @click="showEmailResetDialog">使用邮箱验证码重置</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
    
    <!-- 邮箱重置密码对话框 -->
    <el-dialog
      v-model="emailResetDialogVisible"
      title="邮箱验证重置密码"
      width="450px"
    >
      <el-form
        ref="emailResetRef"
        :model="emailResetForm"
        :rules="emailResetRules"
        label-width="100px"
      >
        <el-form-item label="邮箱">
          <el-input
            v-model="userForm.email"
            disabled
          />
        </el-form-item>
        
        <el-form-item label="验证码" prop="code">
          <div class="verification-code">
            <el-input
              v-model="emailResetForm.code"
              placeholder="请输入验证码"
              maxlength="6"
              style="width: 70%;"
            />
            <el-button
              type="primary"
              :disabled="codeSending || countdown > 0"
              @click="sendVerificationCode"
              style="width: 30%; margin-left: 2%;"
            >
              {{ countdown > 0 ? `${countdown}s后重新获取` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="emailResetForm.newPassword"
            type="password"
            placeholder="请设置新密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="emailResetForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="emailResetDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="resetPasswordByEmail"
            :loading="resetPasswordLoading"
          >确认重置</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 头像上传对话框 -->
    <el-dialog
      v-model="avatarUploadVisible"
      title="更换头像"
      width="400px"
    >
      <div class="avatar-upload-content">
        <input
          type="file"
          accept="image/*"
          class="file-input"
          @change="handleAvatarChange"
        />
        
        <div v-if="avatarPreview" class="avatar-preview">
          <img :src="avatarPreview" class="preview-image" alt="预览图" />
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="avatarUploadVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="uploadAvatar"
            :loading="avatarUploading"
          >确认上传</el-button>
        </span>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<style scoped>
/* 带侧边栏的页面布局 */
.page-with-sidebar {
  display: flex;
  min-height: calc(100vh - 80px);
  background-color: var(--pixel-bg-primary);
}

.profile-page {
  flex: 1;
  max-width: 900px;
  padding: 20px;
  margin: 0 auto;
}

.profile-card {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  box-shadow: 4px 4px 0 #000;
  padding: 30px;
  margin-bottom: 20px;
  border: 2px solid #000;
}

.profile-header {
  margin-bottom: 30px;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 10px;
}

.profile-info {
  display: flex;
  gap: 30px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-editable {
  cursor: pointer;
}

.avatar-edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
  font-size: 14px;
}

.avatar-editable:hover .avatar-edit-overlay {
  opacity: 1;
}

.basic-info {
  flex: 1;
}

.username {
  font-size: 20px;
  margin: 0 0 10px 0;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.bio {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.form-item {
  margin-bottom: 15px;
}

.form-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.stats-container {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  border-top: 1px solid #f0f2f5;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 30px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin-top: 5px;
}

.section-title {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 600;
}

.detail-row {
  display: flex;
  margin-bottom: 20px;
  align-items: center;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  width: 100px;
  font-size: 14px;
  color: var(--pixel-text-secondary);
  line-height: 32px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 14px;
  color: var(--pixel-text-primary);
  flex: 1;
}

.avatar-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.file-input {
  margin-bottom: 20px;
}

.avatar-preview {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.password-form {
  margin-top: 20px;
}

.dialog-footer {
  margin-top: 20px;
  text-align: right;
}

.email-reset-intro {
  margin-bottom: 20px;
  color: #606266;
}

.reset-action {
  text-align: center;
  margin-top: 20px;
}

.verification-code {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .profile-info {
    flex-direction: column;
    align-items: center;
  }
  
  .basic-info {
    text-align: center;
    margin-top: 15px;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .detail-label {
    width: auto;
    margin-bottom: 8px;
  }
  
  .detail-value {
    width: 100%;
  }
}

/* 按钮全局覆盖以解决白色背景不可见问题 */
:deep(.el-button) {
  font-family: 'Pixel', 'Zpix', 'Minecraft', sans-serif !important;
  border-radius: 0 !important;
  border: 2px solid #000 !important;
  box-shadow: 2px 2px 0 #000 !important;
  transition: transform 0.1s, box-shadow 0.1s !important;
}

:deep(.el-button:hover) {
  transform: translate(2px, 2px) !important;
  box-shadow: 0 0 0 #000 !important;
}

:deep(.el-button--default), :deep(.el-button.is-plain) {
  background-color: var(--pixel-bg-primary) !important;
  color: var(--pixel-text-primary) !important;
}

:deep(.el-button--primary) {
  background-color: var(--pixel-primary) !important;
  color: #fff !important;
}
</style> 