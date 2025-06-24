<script setup>
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import { onMounted, onUnmounted } from 'vue'
import { eventBus, startMessageChecking, stopMessageChecking } from '@/utils/request.js'
import * as messageApi from '@/api/message.js'

const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 组件挂载时启动消息检查
onMounted(() => {
  // 如果已登录，检查未读消息
  if (tokenStore.token) {
    checkUnreadMessages()
    startMessageChecking()
  }
  
  // 监听登录事件
  eventBus.on('user-login-success', handleUserLogin)
})

// 组件卸载时停止消息检查
onUnmounted(() => {
  stopMessageChecking()
  eventBus.off('user-login-success', handleUserLogin)
})

// 用户登录成功处理
function handleUserLogin() {
  checkUnreadMessages()
  startMessageChecking()
}

// 检查未读消息
function checkUnreadMessages() {
  if (!tokenStore.token) return
  
  messageApi.getUnreadCount()
    .then(res => {
      if (res.code === 0) {
        // 通知组件更新未读消息数
        eventBus.emit('unread-count-update', res.data)
      }
    })
    .catch(err => {
      console.error('获取未读消息数失败:', err)
    })
}
</script>

<template>
  <router-view />
</template>

<style scoped>

</style>
