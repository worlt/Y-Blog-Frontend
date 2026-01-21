<script setup>
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import { onMounted, onUnmounted } from 'vue'
import { eventBus } from '@/utils/request.js'
import { initWebSocket, closeWebSocket } from '@/utils/websocket.js'
import * as messageApi from '@/api/message.js'
import { recordVisit } from '@/api/visit.js'
import AiChatDialog from '@/components/AiChatDialog.vue'

const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 组件挂载时启动消息检查
onMounted(() => {
  // 记录网站访问
  recordVisit()

  // 如果已登录，检查未读消息
  if (tokenStore.token) {
    checkUnreadMessages()
    // 初始化WebSocket
    if (userInfoStore.info?.id) {
      initWebSocket(userInfoStore.info.id)
    }
  }
  
  // 监听登录事件
  eventBus.on('user-login-success', handleUserLogin)
})

// 组件卸载时停止消息检查
onUnmounted(() => {
  // 关闭WebSocket连接
  closeWebSocket()
  eventBus.off('user-login-success', handleUserLogin)
})

// 用户登录成功处理
function handleUserLogin() {
  checkUnreadMessages()
  // 登录成功后初始化WebSocket
  if (userInfoStore.info?.id) {
    initWebSocket(userInfoStore.info.id)
  }
}

// 检查未读消息
function checkUnreadMessages() {
  // 更严格的登录检查
  if (!tokenStore.token || !userInfoStore.info?.id) {
    console.log('用户未登录，跳过检查未读消息');
    return;
  }
  
  messageApi.getUnreadCount()
    .then(res => {
      if (res.code === 0) {
        // 通知组件更新未读消息数
        eventBus.emit('unread-count-update', res.data)
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
    })
}
</script>

<template>
  <router-view />
  <!-- 全局 AI 助手 -->
  <AiChatDialog />
</template>

<style scoped>

</style>
