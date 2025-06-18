<script setup>

import {computed, onMounted, reactive, ref} from "vue";
import {getDetail, resetPasswordByEmail, sendCode, updateAuditor, updatePassword} from "@/api/auditor.js";
import {ElLoading, ElMessage} from "element-plus";
import {useAuditorInfoStore} from "@/strores/auditorInfo.js";
import {uploadImage} from "@/api/common.js";

const auditorInfoStore = useAuditorInfoStore();
const auditorInfo = ref({});
const activeTab = ref('info');
const editDialogVisible = ref(false);
const emailResetDialogVisible = ref(false)

// 格式化角色显示
const roleText = computed(() => {
  if (!auditorInfo.value || auditorInfo.value.role === undefined) return '';

  switch (auditorInfo.value.role) {
    case 0: return '管理员';
    case 1: return '审核员';
    case 2: return '普通用户';
    case 3: return 'VIP用户';
    default: return '未知角色';
  }
})

// 加载管理员信息
const getAuditorDetail = async () => {
  try {
    const response = await getDetail();
    console.log(response.data)
    if (response.code ===0 && response.data) {
      auditorInfo.value = response.data;
    } else {
      ElMessage.warning(response.msg || '获取信息失败，请稍后重试');
    }
  } catch (err) {
    ElMessage.warning('获取信息失败，请稍后重试')
  }
}

// 审核员信息表单
const formData = reactive({
  id: auditorInfoStore.info.id,
  username: '',
  name: '',
  avatar: '',
  email: '',
  role: '',
})

// 审核员信息表单规则
const formRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ]
};

// 打开编辑对话框
const openEditDialog = () => {
  // 填充表单
  formData.username = auditorInfo.value.username || '';
  formData.name = auditorInfo.value.name || '';
  formData.avatar = auditorInfo.value.avatar || '';
  formData.email = auditorInfo.value.email || '';
  formData.role = auditorInfo.value.role || '';
  editDialogVisible.value = true;
}

// 更新审核员信息
const formRef = ref(null);
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await updateAuditor({
          id: formData.id,
          name: formData.name,
          avatar: formData.avatar
        });

        if (response.code === 0) {
          ElMessage.success(response.msg || '信息更新成功');
          // 关闭对话框
          editDialogVisible.value = false;
          // 查询获取管理员信息
          await getAuditorDetail();
          // 更新Pinia中的信息
          const newInfo = { ...auditorInfoStore.info };
          newInfo.name = formData.name;
          newInfo.avatar = formData.avatar;
          auditorInfoStore.setInfo(newInfo);

          // 强制刷新头像（包括Home.vue）
          if (formData.avatar) {
            // 延迟一点执行，确保store更新完成
            setTimeout(() => {
              // 触发一个自定义事件，通知应用头像已更新
              const event = new CustomEvent('avatar-updated', { detail: { avatar: formData.avatar } });
              window.dispatchEvent(event);
            }, 100);
          }
        } else {
          ElMessage.error(response.msg || '信息更新失败');
        }
      } catch (err) {
        ElMessage.error('信息更新失败');
      }
    }
  });
};

// 头像上传相关
const fileInput = ref(null);
const avatarUploading = ref(false);

// 触发文件选择框
const triggerFileInput = () => {
  fileInput.value.click();
}

// 上传头像
const uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // 校验文件类型
  if (!file.type.includes('image')) {
    ElMessage.warning('请选择图片文件');
    return;
  }

  // 校验文件大小，限制为2MB
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过2MB');
    return;
  }

  // 显示加载中
  avatarUploading.value = true;
  const loadingInstance = ElLoading.service({
    fullscreen: true,
    text: '头像上传中...'
  });

  try {
    // 使用抽取出来的API函数上传图片
    const response = await uploadImage(file);

    if (response.code === 0 && response.data) {
      ElMessage.success('头像上传成功');
      // 设置新头像URL
      formData.avatar = response.data;
    } else {
      ElMessage.error(response.msg || '头像上传失败');
    }
  } catch (error) {
    ElMessage.error('头像上传失败，请稍后重试');
  } finally {
    // 关闭加载中
    loadingInstance.close();
    avatarUploading.value = false;
    // 清空文件输入框，以便重复上传同一文件
    event.target.value = '';
  }
}

// 密码修改相关
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 密码修改表单规则
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
};

const passwordRef = ref(null);
const updatePasswordSubmit = async () => {
  if (!passwordRef.value) return;
  await passwordRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await updatePassword({
          id: auditorInfo.value.id,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        });
        if (response.code === 0) {
          ElMessage.success('密码修改成功');
          // 清空表单
          passwordForm.oldPassword = '';
          passwordForm.newPassword = '';
          passwordForm.confirmPassword = '';
        } else {
          ElMessage.error(response.msg || '密码修改失败');
        }
      } catch (error) {
        ElMessage.error('密码修改失败，请稍后重试');
      }
    }
  });
};

// 邮箱重置密码相关
const emailResetForm = reactive({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
});

// 邮箱重置密码表单规则
const emailResetRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
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
};

// 打开邮箱重置密码对话框
const openEmailResetDialog = () => {
  // 预填充邮箱
  emailResetForm.email = auditorInfo.value.email || '';
  emailResetForm.code = '';
  emailResetForm.newPassword = '';
  emailResetForm.confirmPassword = '';
  emailResetDialogVisible.value = true;
}

// 发送验证码相关
const codeSending = ref(false);
const countdown = ref(0);
const timer = ref(null);

const sendVerificationCode = async () => {
  if (!emailResetForm.email || !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(emailResetForm.email)) {
    ElMessage.warning('请输入正确的邮箱地址');
    return;
  }

  codeSending.value = true;
  try {
    const response = await sendCode(emailResetForm.email);
    if (response.code === 0) {
      ElMessage.success('验证码已发送，请查收邮箱');
      countdown.value = 60;
      timer.value = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
          clearInterval(timer.value);
          timer.value = null;
        }
      }, 1000);
    } else {
      ElMessage.error(response.msg || '验证码发送失败');
    }
  } catch (error) {
    ElMessage.error('验证码发送失败，请稍后重试');
  } finally {
    codeSending.value = false;
  }
};

const emailResetRef = ref(null);
const resetPasswordSubmit = async () => {
  if (!emailResetRef.value) return;
  await emailResetRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await resetPasswordByEmail({
          email: emailResetForm.email,
          code: emailResetForm.code,
          newPassword: emailResetForm.newPassword
        });
        if (response.code === 0) {
          ElMessage.success('密码重置成功');
          // 清空表单
          emailResetForm.code = '';
          emailResetForm.newPassword = '';
          emailResetForm.confirmPassword = '';
          // 关闭对话框
          emailResetDialogVisible.value = false;
        } else {
          ElMessage.error(response.msg || '密码重置失败');
        }
      } catch (error) {
        ElMessage.error('密码重置失败，请稍后重试');
      }
    }
  });
};

onMounted(() => {
  getAuditorDetail();
})

</script>

<template>
  <div class="personal-container">
    <h2 class="page-title">个人中心</h2>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 基本信息标签页 -->
      <el-tab-pane label="基本信息" name="info">
        <div class="info-card">
          <div class="avatar-container">
            <el-avatar :size="100" :src="auditorInfo.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
          </div>

          <div class="info-list">
            <div class="info-item">
              <span class="info-label">用户名：</span>
              <span class="info-value">{{ auditorInfo.username }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">姓名：</span>
              <span class="info-value">{{ auditorInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮箱：</span>
              <span class="info-value">{{ auditorInfo.email }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">角色：</span>
              <span class="info-value">{{ roleText }}</span>
            </div>

            <div class="action-buttons">
              <el-button type="primary" @click="openEditDialog">修改信息</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 密码管理标签页 -->
      <el-tab-pane label="密码管理" name="password">
        <div class="password-container">
          <div class="password-section">
            <div class="section-title">
              <h3>修改密码</h3>
            </div>

            <el-form
                ref="passwordRef"
                :model="passwordForm"
                :rules="passwordRules"
                label-width="120px"
                class="password-form"
            >
              <el-form-item label="原密码" prop="oldPassword">
                <el-input
                    v-model="passwordForm.oldPassword"
                    type="password"
                    placeholder="请输入原密码"
                    show-password
                ></el-input>
              </el-form-item>

              <el-form-item label="新密码" prop="newPassword">
                <el-input
                    v-model="passwordForm.newPassword"
                    type="password"
                    placeholder="请输入新密码"
                    show-password
                ></el-input>
              </el-form-item>

              <el-form-item label="确认新密码" prop="confirmPassword">
                <el-input
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                ></el-input>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="updatePasswordSubmit">确认修改</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-divider>或者</el-divider>

          <div class="reset-section">
            <div class="section-title">
              <h3>通过邮箱重置密码</h3>
              <p class="section-desc">如果您忘记了原密码，可以通过邮箱验证码重置</p>
            </div>

            <div class="reset-action">
              <el-button @click="openEmailResetDialog">使用邮箱验证码重置</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 修改信息对话框 -->
    <el-dialog
        v-model="editDialogVisible"
        title="修改个人信息"
        width="500px"
    >
      <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="80px"
      >
        <el-form-item label="用户名">
          <el-input v-model="formData.username" disabled></el-input>
          <div class="form-tip">用户名不可修改</div>
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名"></el-input>
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="formData.email" disabled></el-input>
          <div class="form-tip">邮箱不可修改</div>
        </el-form-item>

        <el-form-item label="头像">
          <div class="avatar-upload">
            <div class="avatar-preview">
              <el-avatar :size="80" :src="formData.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            </div>
            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="uploadAvatar"
            >
            <el-button type="primary" @click="triggerFileInput" :loading="avatarUploading">
              上传头像
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 邮箱重置密码对话框 -->
    <el-dialog
        v-model="emailResetDialogVisible"
        title="邮箱验证重置密码"
        width="500px"
    >
      <el-form
          ref="emailResetRef"
          :model="emailResetForm"
          :rules="emailResetRules"
          label-width="100px"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input
              v-model="emailResetForm.email"
              disabled
          ></el-input>
        </el-form-item>

        <el-form-item label="验证码" prop="code">
          <div class="verification-code">
            <el-input
                v-model="emailResetForm.code"
                placeholder="请输入验证码"
                maxlength="6"
                style="width: 70%;"
            ></el-input>
            <el-button
                type="primary"
                :disabled="codeSending || countdown > 0"
                @click="sendVerificationCode"
                style="width: 32%; margin-left: 2%;"
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
          ></el-input>
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
              v-model="emailResetForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="emailResetDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="resetPasswordSubmit">确认重置</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>


<style scoped>
.personal-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  color: #303133;
}

.info-card {
  display: flex;
  padding: 20px;
}

.avatar-container {
  margin-right: 30px;
}

.info-list {
  flex: 1;
}

.info-item {
  margin-bottom: 15px;
  font-size: 16px;
}

.info-label {
  font-weight: bold;
  margin-right: 8px;
  color: #606266;
  display: inline-block;
  width: 70px;
}

.info-value {
  color: #303133;
}

.action-buttons {
  margin-top: 30px;
}

.password-container {
  padding: 20px;
}

.password-section, .reset-section {
  margin-bottom: 30px;
}

.section-title {
  margin-bottom: 20px;
}

.section-title h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.section-desc {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.password-form {
  max-width: 500px;
}

.reset-action {
  margin-top: 15px;
}

.avatar-upload {
  display: flex;
  align-items: center;
}

.avatar-preview {
  margin-right: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.verification-code {
  display: flex;
  align-items: center;
}
</style>