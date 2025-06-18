<script setup>
import {ref} from "vue";
import {useTokenStore} from "@/strores/token.js";
import {useAuditorInfoStore} from "@/strores/auditorInfo.js";
import {useRouter} from "vue-router";
import {ElMessage} from "element-plus";
import {auditorLogin} from "@/api/auditor.js";

const rules = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
  ],
}

const loginData = ref({
  username: '',
  password: '',
})

const tokenStore = useTokenStore();
const auditorInfo = useAuditorInfoStore();
const router = useRouter();

const login = async () => {
  if (!loginData.value.username || !loginData.value.password) {
    ElMessage.warning('请填写用户名和密码');
    return;
  }

  let result = await auditorLogin(loginData.value);
  console.log(result)
  if (result.code === 0) {
    ElMessage.success(result.msg ? result.msg : '登录成功')
    console.log(result.data)

    tokenStore.setToken(result.data.token)

    auditorInfo.setInfo(result.data)
    await router.push('/')
  } else {
    ElMessage.error(result.msg ? result.msg : '登录失败')
  }
}

</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-head">
        <h2 class="login-title">Y-Blog审核系统</h2>
      </div>
      <el-form :model="loginData" :rules="rules" class="login-form" @keyup.enter="login()">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginData.username" clearable placeholder="请输入用户名"></el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginData.password" clearable placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button class="login-button" type="primary" @click="login()">登录</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  background-color: #c19de1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-image: linear-gradient(135deg, #d6c3f5 0%, #e6e6ff 100%);
}

.login-box {
  background-color: white;
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  height: 400px;
  width: 600px;
  border-radius: 12px;
}

.login-head {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.login-title {
  color: #6a5acd;
  font-weight: 600;
  font-size: 24px;
  margin-bottom: 8px;
}

.login-form {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

:deep(.el-form-item__label) {
  line-height: 40px;
  font-size: 14px;
  width: 80px;
  color: #606266;
  margin-bottom: 10px;
}

:deep(.el-input__wrapper) {
  width: 250px;
  margin-right: 30px;
}

.login-button {
  width: 55%;
  height: 40px;
  font-size: 16px;
  font-weight: 500;
  background-color: #9485ef;
  border: none;
  transition: all 0.3s ease;
  margin: 0 auto;
}
</style>