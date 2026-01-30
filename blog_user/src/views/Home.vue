<script setup>
import {ref, computed, watch, nextTick, onMounted, onUnmounted} from "vue";
import {useUserInfoStore} from "@/stores/userInfo.js";
import {useTokenStore} from "@/stores/token.js";
import router from "@/router/index.js";
import {ElMessage} from "element-plus";
import AuthDialog from '@/components/AuthDialog.vue';
import { eventBus, stopMessageChecking } from '@/utils/request.js';
import * as messageApi from '@/api/message.js';
import { Icon } from '@iconify/vue';
import { executeAutoLogout } from '@common/utils/autoLogout.js';

const input = ref('')

// 登录弹窗状态
const showAuthDialog = ref(false);

// 使用store
const userInfoStore = useUserInfoStore();
const tokenStore = useTokenStore();

// 未读消息数
const unreadMessageCount = ref(0);

// 使用计算属性监听登录状态
const isLoggedIn = computed(() => {
  return !!tokenStore.token && !!tokenStore.getToken()
});

// 使用计算属性获取用户信息
const userAvatar = computed(() => userInfoStore.info?.avatar || '');
const username = computed(() => userInfoStore.info?.username || '');

// 监听自定义事件，用于显示登录弹窗
const setupAuthDialogListener = () => {
  window.addEventListener('show-auth-dialog', handleShowAuthDialog);
};

// 显示登录弹窗
const handleShowAuthDialog = () => {
  showAuthDialog.value = true;
};

// 处理未读消息数更新
const handleUnreadCountUpdate = (count) => {
  unreadMessageCount.value = count;
};

// 处理 WebSocket 实时消息更新（收到新消息时重新获取未读数）
const handleWsUnreadUpdate = () => {
  loadUnreadMessageCount();
};

// 组件挂载时设置事件监听和加载未读消息数
onMounted(() => {
  setupAuthDialogListener();
  
  // 监听未读消息数更新事件（来自轮询）
  eventBus.on('unread-count-update', handleUnreadCountUpdate);
  
  // 监听 WebSocket 实时消息更新事件
  eventBus.on('ws-unread-update', handleWsUnreadUpdate);
  
  // 如果已登录，获取未读消息数
  if (isLoggedIn.value) {
    loadUnreadMessageCount();
  }

  // 触发一次路由事件，确保页面内容正确加载
  nextTick(() => {
    // 使用自定义事件通知组件路由已变化
    window.dispatchEvent(new CustomEvent('router-change', {
      detail: { 
        to: router.currentRoute.value,
        from: {}
      }
    }));
  });
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('show-auth-dialog', handleShowAuthDialog);
  
  // 移除未读消息数更新事件监听
  eventBus.off('unread-count-update', handleUnreadCountUpdate);
  // 移除 WebSocket 实时消息更新事件监听
  eventBus.off('ws-unread-update', handleWsUnreadUpdate);
});

// 加载未读消息数
const loadUnreadMessageCount = () => {
  // 更严格的登录检查
  if (!tokenStore.token || !userInfoStore.info?.id) {
    console.log('用户未登录，跳过获取未读消息数');
    return;
  }
  
  messageApi.getUnreadCount()
    .then(res => {
      if (res.code === 0) {
        unreadMessageCount.value = res.data;
      } else if (res.code !== -1) {
        // 只有非认证错误才打印日志（code=-1已被拦截器处理）
        console.log('获取未读消息数失败:', res.msg);
      }
    })
    .catch(err => {
      // 如果是认证错误，已由拦截器处理，不需要打印日志
      if (err.message !== '认证过期') {
        console.error('获取未读消息数失败:', err);
      }
    });
};

// 跳转到首页
const goToIndex = () => {
  if (router.currentRoute.value.path === '/index') {
    // 如果已经在首页，则重新触发路由事件以刷新内容
    window.dispatchEvent(new CustomEvent('router-change', {
      detail: { 
        to: router.currentRoute.value,
        from: router.currentRoute.value
      }
    }));
  } else {
    // 跳转到首页
    router.push('/index');
  }
}

// 跳转到完整登录页
const goToAuthPage = () => {
  router.push('/auth');
}

// 处理下拉菜单命令
const handleCommand = (command) => {
  try {
    console.log('处理菜单命令:', command)
    
    switch (command) {
      case 'profile':
        router.push('/my-profile');
        break;
      case 'my-blogs':
        router.push('/my-blogs');
        break;
      case 'collections':
        router.push('/my-collections');
        break;
      case 'liked':
        console.log('点击了点赞菜单项，跳转到/liked')
        router.push({
          path: '/liked',
          replace: false
        });
        break;
      case 'disliked':
        router.push('/my-disliked-blogs');
        break;
      case 'follows':
        console.log('点击了关注菜单项，跳转到/my-follows')
        router.push('/my-follows');
        break;
      case 'followers':
        router.push('/my-followers');
        break;
      case 'messages':
        router.push('/messages');
        break;
      case 'logout':
        logout();
        break;
      default:
        console.error('未知的菜单命令:', command);
    }
  } catch (error) {
    console.error('菜单导航错误:', error);
    ElMessage.error('导航失败，请稍后重试');
  }
}

// 退出登录
const logout = () => {
  // 使用统一的自动登出处理
  executeAutoLogout({
    tokenStore,
    userStore: userInfoStore,
    stopMessageChecking,
    reason: '用户主动退出登录'
  });
  
  // 跳转到首页
  router.push('/');
  ElMessage.success('已退出登录');
}

// 搜索处理
const handleSearch = () => {
  if (input.value.trim()) {
    router.push({
      path: '/search',
      query: { keyword: input.value }
    });
  }
}

// 创作按钮点击
const handleCreate = () => {
  if (!isLoggedIn.value) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再进行创作');
    return;
  }
  router.push('/write');
}

// 消息按钮点击
const goToMessages = () => {
  if (!isLoggedIn.value) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再查看消息');
    return;
  }
  router.push('/messages');
}

// 历史按钮点击
const goToHistory = () => {
  if (!isLoggedIn.value) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再查看历史');
    return;
  }
  router.push('/history');
}

// 创作中心按钮点击
const goToCreation = () => {
  if (!isLoggedIn.value) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再访问创作中心');
    return;
  }
  router.push('/my-blogs');
}

// 监听登录状态变化
watch(
  () => tokenStore.token,
  (newVal, oldVal) => {
    console.log('Token changed:', newVal ? 'logged in' : 'logged out');
    if (newVal && !oldVal) {
      console.log('用户已登录');
      // 登录后加载未读消息数
      loadUnreadMessageCount();
    } else if (!newVal && oldVal) {
      console.log('用户已退出');
      // 退出登录时清空未读消息数
      unreadMessageCount.value = 0;
    }
  },
  { immediate: true }
);

// 监听用户信息变化
watch(
  () => userInfoStore.info,
  (newVal) => {
    console.log('User info changed:', newVal);
  },
  { deep: true, immediate: true }
);

// 处理登录成功
const handleLoginSuccess = (userData) => {
  ElMessage.success('登录成功');
  // 登录成功后加载未读消息数
  loadUnreadMessageCount();
  // 发送登录成功事件
  eventBus.emit('user-login-success');
};
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header class="header">
        <div class="left" @click="goToIndex">
          Y-Blog
        </div>
        <div class="middle">
          <el-input v-model="input" class="input" placeholder="请输入搜索内容" @keyup.enter="handleSearch"/>
          <el-button class="search-btn" round @click="handleSearch">
            <Icon icon="mdi:magnify" style="margin: 0 5px 0 0"/>
            搜索
          </el-button>
        </div>
        <div class="right">
          <div class="avatar">
            <!-- 未登录时显示登录按钮，直接跳转到登录页 -->
            <div v-if="!isLoggedIn" class="login" @click="goToAuthPage">登录</div>
            <!-- 已登录时显示用户头像下拉菜单 -->
            <el-dropdown v-else @command="handleCommand">
              <div class="login">
                <el-avatar :src="userAvatar" style="width: 35px; height: 35px">
                  <span v-if="!userAvatar">{{ username.charAt(0).toUpperCase() }}</span>
                </el-avatar>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <Icon icon="mdi:account" style="margin-right: 4px"/>
                    个人资料
                  </el-dropdown-item>
                  <el-dropdown-item command="my-blogs">
                    <Icon icon="mdi:file-document-multiple" style="margin-right: 4px"/>
                    我的博客
                  </el-dropdown-item>
                  <el-dropdown-item command="collections">
                    <Icon icon="mdi:bookmark-multiple" style="margin-right: 4px"/>
                    我的收藏
                  </el-dropdown-item>
                  <el-dropdown-item command="liked">
                    <Icon icon="mdi:thumb-up" style="margin-right: 4px"/>
                    我的点赞
                  </el-dropdown-item>
                  <el-dropdown-item command="disliked">
                    <Icon icon="mdi:thumb-down" style="margin-right: 4px"/>
                    我的点踩
                  </el-dropdown-item>
                  <el-dropdown-item command="follows">
                    <Icon icon="mdi:account-multiple" style="margin-right: 4px"/>
                    我的关注
                  </el-dropdown-item>
                  <el-dropdown-item command="followers">
                    <Icon icon="mdi:account-group" style="margin-right: 4px"/>
                    我的粉丝
                  </el-dropdown-item>
                  <el-dropdown-item command="messages">
                    <Icon icon="mdi:message-text" style="margin-right: 4px"/>
                    消息
                    <el-badge v-if="unreadMessageCount > 0" :value="unreadMessageCount" class="message-badge" />
                  </el-dropdown-item>
                  <el-dropdown-item command="logout">
                    <Icon icon="mdi:logout" style="margin-right: 4px"/>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="message-container" @click="goToMessages">
            <Icon icon="mdi:message-text" style="margin-right: 4px"/>
            <span>消息</span>
            <el-badge v-if="unreadMessageCount > 0" :value="unreadMessageCount" :max="99" class="message-badge" />
          </div>
          <div class="history" @click="goToHistory">
            <Icon icon="mdi:history" style="margin-right: 4px"/>
            <span>历史</span>
          </div>
          <div class="creation" @click="goToCreation">
            <Icon icon="mdi:file-document-edit" style="margin-right: 4px"/>
            <span>创作中心</span>
          </div>
          <div class="create">
            <el-button class="create-btn" @click="handleCreate">
              <Icon icon="mdi:plus" style="margin-right: 4px"/>
              创作
            </el-button>
          </div>
        </div>
      </el-header>
      <el-main class="main"><router-view/></el-main>
    </el-container>
    
    <!-- 登录弹窗 -->
    <AuthDialog 
      v-model="showAuthDialog"
      @login-success="handleLoginSuccess"
    />
  </div>
</template>


<style scoped>
:deep(.el-main) {
  padding: 0 !important; /* 去除 el-main 的内边距 */
  overflow-y: auto !important; /* 确保内容可滚动 */
}

.header {
  width: 100vw;
  height: 60px;
  padding: 15px;
  display: flex;
  flex-direction: row;
}

.main {
  height: calc(100vh - 60px);
  width: 100vw;
  overflow-y: auto; /* 确保可以滚动 */
}

.left {
  flex: 1;
  font-size: 28px;
  font-weight: 900;
  cursor: pointer;
}

.middle {
  flex: 2;
  padding: 5px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.middle :deep(.el-input__wrapper) {
  border-radius: 20px !important;
}

/* 修复深层选择器语法 */
:deep(.el-input__wrapper) {
  padding: 0 15px;
}

.right {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  text-align: center;
}

.input {
  margin-left: 20px;
  width: 40%;
  height: 30px;
  padding: 0 15px;
}

.search-btn {
  background-color: #b885e8;
  color: #ffffff;
  border-radius: 20px;
  margin-left: -5px;
}

.avatar {
  margin-left: 20px;
}

.login {
  border-radius: 100%;
  border: #cecdcd 1px solid;
  background-color: #cecdcd;
  height: 35px;
  width: 35px;
  display: flex; /* 使用 flexbox 布局 */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  text-align: center;
  cursor: pointer; /* 增加鼠标指针样式 */
}

.message-container {
  position: relative;
  margin-left: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.message-badge {
  position: absolute;
  top: -10px;
  right: -15px;
}

.history {
  margin-left: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.creation {
  margin-left: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* 右侧导航菜单的文本元素样式 */
.right span {
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.create {
  margin-left: 20px;
  cursor: pointer;
}

.create-btn {
  border-radius: 20px;
  background-color: #b885e8;
  color: white;
  display: flex;
  align-items: center;
}

/* 所有图标垂直居中 */
:deep(.iconify) {
  display: inline-flex;
  vertical-align: middle;
}
</style>