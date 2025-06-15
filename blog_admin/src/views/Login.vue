<script setup>
  import {ref, reactive, onMounted} from "vue";
  import {useTokenStore} from "@/stores/token.js";
  import {useAdminInfoStore} from '@/stores/adminInfo.js'
  import {useRouter, useRoute} from "vue-router";
  import {adminLogin} from "@/api/admin.js";
  import {ElMessage} from "element-plus";

  // 定义表单规则
  const rules = {
    username: [
      {required: true, message: '用户名不能为空', trigger: 'blur'},
    ],
    password: [
      {required: true, message: '密码不能为空', trigger: 'blur'},
    ],
  }

  const loginData = ref({
    username: '',
    password: '',
  })

  const tokenStore = useTokenStore();
  const adminInfoStore = useAdminInfoStore();
  const router = useRouter();
  const route = useRoute();
  
  // 获取重定向地址
  const getRedirect = () => {
    const redirect = route.query.redirect;
    return redirect ? decodeURIComponent(redirect) : '/';
  }

  // 登录
  const login = async ()=> {
    if (!loginData.value.username || !loginData.value.password) {
      ElMessage.warning('请填写用户名和密码');
      return;
    }
    
    let result = await adminLogin(loginData.value);
    console.log(result)
    if (result.code === 0) {
      ElMessage.success(result.msg ? result.msg : '登录成功');
      // 将token存储到pinia中
      console.log(result.data)
      tokenStore.setToken(result.data.token)
      // 将用户消息存储到pinia中
      adminInfoStore.setInfo(result.data)
      // 跳转到重定向地址或首页
      await router.push(getRedirect())
    } else {
      ElMessage.error(result.msg ? result.msg : '登录失败');
    }
  }

</script>

<template>
<div class="login-container">
  <div class="login-box">
    <div class="login-header">
      <h2 class="login-title">Y-Blog管理系统</h2>
<!--      <p class="login-subtitle">欢迎回来，请登录您的账号</p>-->
    </div>
    <el-form class="login-form" :model="loginData" :rules="rules" label-width="80px" @keyup.enter="login()">
      <el-form-item label="用户名" prop="username">
        <el-input 
          v-model="loginData.username" 
          placeholder="请输入用户名"
          clearable
        >
        </el-input>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input 
          type="password" 
          v-model="loginData.password" 
          placeholder="请输入密码"
          show-password
        >
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="login-button" @click="login()">登 录</el-button>
      </el-form-item>
    </el-form>
  </div>
</div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0e6ff;
  background-image: linear-gradient(135deg, #f0e6ff 0%, #e6e6ff 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 8px 20px rgba(106, 90, 205, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-title {
  color: #6a5acd;
  font-weight: 600;
  font-size: 24px;
  margin-bottom: 8px;
}

.login-subtitle {
  color: #999;
  font-size: 14px;
}

.login-form {
  width: 100%;
}

:deep(.el-form-item__label) {
  line-height: 40px;
  font-size: 14px;
  color: #606266;
}

:deep(.el-input__inner) {
  height: 40px;
  border-radius: 4px;
}

:deep(.el-input__inner:focus) {
  border-color: #6a5acd;
}

:deep(.el-form-item__error) {
  padding-top: 4px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  height: 40px;
  font-size: 16px;
  font-weight: 500;
  background-color: #6a5acd;
  border: none;
  transition: all 0.3s ease;
}

.login-button:hover {
  background-color: #5649b3;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(106, 90, 205, 0.3);
}
</style>