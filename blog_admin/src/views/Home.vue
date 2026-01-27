<script setup>
import {Bell, Document, Setting, SwitchButton, User, DataLine} from "@element-plus/icons-vue";
import {useAdminInfoStore} from "@/stores/adminInfo.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {useTokenStore} from "@/stores/token.js";
import router from "@/router/index.js";
import {computed, onMounted, onUnmounted, ref} from "vue";
import {adminLogout} from "@/api/admin.js";

const adminInfoStore = useAdminInfoStore();
const tokenStore = useTokenStore();
const avatar = ref(null);

// 测试头像是否可用
const fetchAvatar = async () => {
  // 如果头像地址为空或无效，直接使用默认头像
  const avatarUrl = adminInfoStore.info?.avatar;
  if (!avatarUrl || avatarUrl.trim() === '') {
    avatar.value = null;
    return;
  }
  
  try {
    const response = await fetch(avatarUrl);
    // 检查返回的内容类型是否为图片
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('image')) {
      throw new Error('返回的内容不是图片');
    }
    avatar.value = avatarUrl;
  } catch (error) {
    console.log('无效地址：', error);
    avatar.value = null;
  }
}

// 获取头像
const getAvatar = computed(() => {
  if (avatar.value !== null) {
    return avatar.value;
  }
  // 默认头像URL
  return 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
})

// 处理下拉菜单
const handleCommend = (commend) =>{
  if (commend === 'logout') {
    ElMessageBox.confirm(
        '您确定要退出吗？',
        '温馨提示',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning'
        }
    ).then(async () => {
      try {
        // 先调用后端退出接口（需要token）
        await adminLogout()
      } catch (e) {
        // 即使后端退出失败，也继续执行本地退出
        console.warn('后端退出接口调用失败:', e)
      }
      
      // 清除本地认证信息
      tokenStore.removeToken();
      adminInfoStore.removeInfo();
      
      // 跳转到登录页
      await router.push('/login');

      ElMessage({
        type: 'success',
        message: '退出登录成功'
      })
    })
  } else {
    router.push(commend);
  }
}

// 监听头像更新事件
const handleAvatarUpdate = (event) => {
  if (event.detail && event.detail.avatar) {
    // 设置一个随机时间戳参数，避免浏览器缓存
    const timestamp = new Date().getTime();
    // 更新头像
    avatar.value = event.detail.avatar.includes('?')
        ? `${event.detail.avatar}&t=${timestamp}`
        : `${event.detail.avatar}?t=${timestamp}`;
  } else {
    // 强制刷新头像
    fetchAvatar();
  }
};

// 组件挂载时添加事件监听
onMounted(() => {
  fetchAvatar();
  window.addEventListener('avatar-updated', handleAvatarUpdate);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('avatar-updated', handleAvatarUpdate);
});
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header class="head">
        <div class="system-name">
          Y-Blog系统管理
        </div>
        <div class="block">
          <div style="margin-right: 10px">管理员：<strong>{{ adminInfoStore.info.username }}</strong></div>
<!--          <el-avatar :size="40" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" />-->
          <el-dropdown placement="bottom-end" @command="handleCommend">
            <span class="el-dropdown__box">
              <el-avatar :src="getAvatar"></el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="User" command="/config/personal">个人中心</el-dropdown-item>
                <el-dropdown-item :icon="SwitchButton" command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px" class="aside">
          <el-scrollbar>
            <el-menu :default-openeds="['content', 'user', 'interaction', 'config']" router>
              <el-menu-item index="/dashboard">
                <el-icon><DataLine /></el-icon>
                <span>仪表盘</span>
              </el-menu-item>
              <el-sub-menu index="content">
                <template #title>
                  <el-icon><Document /></el-icon>内容管理
                </template>
                <el-menu-item index="/content/blog">博客管理</el-menu-item>
                <el-menu-item index="/content/comment">评论管理</el-menu-item>
                <el-menu-item index="/content/tag">标签管理</el-menu-item>
                <el-menu-item index="/content/category">分类管理</el-menu-item>
                <el-menu-item index="/content/suggestion">建议与反馈</el-menu-item>
              </el-sub-menu>
              <el-sub-menu index="user">
                <template #title>
                  <el-icon><User /></el-icon>用户中心
                </template>
                <el-menu-item index="/user/admin">管理员管理</el-menu-item>
                <el-menu-item index="/user/auditor">审核员管理</el-menu-item>
                <el-menu-item index="/user/user">用户管理</el-menu-item>
              </el-sub-menu>
              <el-sub-menu index="interaction">
                <template #title>
                  <el-icon><Bell /></el-icon>交互管理
                </template>
                <el-menu-item index="/interaction/message">消息管理</el-menu-item>
                <el-menu-item index="/interaction/audit-record">审核记录</el-menu-item>
              </el-sub-menu>
              <el-sub-menu index="config">
                <template #title>
                  <el-icon><Setting /></el-icon>系统配置
                </template>
<!--                <el-menu-item index="/config/permission">用户权限配置</el-menu-item>-->
<!--                <el-menu-item index="/config/settings">网站基础设置</el-menu-item>-->
                <el-menu-item index="/config/personal">个人中心</el-menu-item>
              </el-sub-menu>
            </el-menu>
          </el-scrollbar>
        </el-aside>
        <el-main class="main"><router-view/></el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.head {
  height: 70px;
  width: 100vw;
  padding: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.system-name {
  width: 200px;
  margin: -10px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  color: #9485ef;
  font-weight: bolder;
}

.block {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 20px;
}

.aside {
  height: calc(100vh - 70px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.main {
  height: calc(100vh - 70px);
}
</style>