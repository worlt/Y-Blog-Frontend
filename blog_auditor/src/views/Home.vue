<script setup>
import {useAuditorInfoStore} from "@/stores/auditorInfo.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {useTokenStore} from "@/stores/token.js";
import {auditorLogout} from "@/api/auditor.js";
import router from "@/router/index.js";
import {computed, onMounted, onUnmounted, ref} from "vue";
import {ChatDotRound, Checked, Setting, SwitchButton, User, WarningFilled} from "@element-plus/icons-vue";

const auditorInfo = useAuditorInfoStore()
const tokenStore = useTokenStore()
const avatar = ref(null)

const handleCommend = (commend) => {
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
      tokenStore.removeToken();
      auditorInfo.removeInfo();
      await auditorLogout();
      await router.push('/login');

      ElMessage.success('退出登录成功')
    })
  } else {
    router.push(commend)
  }
}

const fetchAvatar = async () => {
  try {
    const response = await fetch(auditorInfo.info.avatar);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('image')) {
      throw new Error('返回的内容不是图片')
    }
    avatar.value = auditorInfo.info.avatar;
  } catch (err) {
    avatar.value = null
    console.log('无效地址：', err);
  }
}

const getAvatar = computed( () => {
  if (avatar.value !== null) {
    return avatar.value
  }
  // 默认头像URL
  return 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
})

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
          Y-Blog审核系统
        </div>
        <div class="block">
          <div style="margin-right: 20px">审核员：<strong>{{auditorInfo.info.username}}</strong></div>
        <el-dropdown placement="top" @command="handleCommend">
          <span>
            <el-avatar :src="getAvatar"></el-avatar>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="User" command="/setting/user">个人中心</el-dropdown-item>
              <el-dropdown-item :icon="SwitchButton" command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px" class="aside">
          <el-scrollbar>
            <el-menu :default-openeds="['audit', 'report', 'appeal', 'setting']" router>
              <el-sub-menu index="audit">
                <template #title>
                  <el-icon><Checked /></el-icon>审核
                </template>
                <el-menu-item index="/audit/blog">博客审核</el-menu-item>
              </el-sub-menu>
              <el-sub-menu index="report">
                <template #title>
                  <el-icon><WarningFilled /></el-icon>举报
                </template>
                <el-menu-item index="/report/blog">博客举报</el-menu-item>
                <el-menu-item index="/report/comment">评论举报</el-menu-item>
                <el-menu-item index="/report/user">用户举报</el-menu-item>
              </el-sub-menu>
              <el-sub-menu index="appeal">
                <template #title>
                  <el-icon><ChatDotRound /></el-icon>申述
                </template>
                <el-menu-item index="/appeal/user">用户申述</el-menu-item>
              </el-sub-menu>
              <el-sub-menu index="setting">
                <template #title>
                  <el-icon><Setting /></el-icon>设置
                </template>
                <el-menu-item index="/setting/user">个人中心</el-menu-item>
              </el-sub-menu>
            </el-menu>
          </el-scrollbar>
        </el-aside>
        <el-main class="main">
          <router-view/>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.head {
  width: 100vw;
  height: 70px;
  padding: 20px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.system-name {
  font-weight: bolder;
  color: #9485ef;
  font-size: 20px;
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