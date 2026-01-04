<script setup>
import { ref, reactive, onMounted, computed, nextTick, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserInfoStore } from '@/stores/userInfo.js'
import * as messageApi from '@/api/message.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { messageState, eventBus } from '@/utils/request.js'
import {Delete, Loading, Plus} from "@element-plus/icons-vue";

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 用户信息
const userInfoStore = useUserInfoStore()
const currentUserId = ref(null)

// 会话列表数据
const conversationList = ref([])
const loadingConversations = ref(false)

// 消息列表数据
const messageList = ref([])
const loadingMessages = ref(false)
const currentConversation = ref(null)

// 消息发送
const messageInput = ref('')
const sendingMessage = ref(false)

// 分页相关 - 消息可能需要分页加载
const messagePagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 轮询间隔（毫秒）
const POLLING_INTERVAL = 10000
let pollingTimer = null

// 引用消息内容区域
const messagesContentRef = ref(null)

// 获取当前登录用户ID
onMounted(async () => {
  // 从store获取用户信息
  const userInfo = userInfoStore.userInfo || JSON.parse(localStorage.getItem('userInfo') || '{}')
  currentUserId.value = userInfo.id

  // 加载会话列表，完成后同步更新顶栏未读数
  await loadConversations()
  // 通知顶栏更新未读消息总数
  eventBus.emit('unread-count-update', totalUnreadCount.value)
  
  // 启动轮询
  startPolling()
  
  // 监听新消息事件
  eventBus.on('conversation-new-message', handleNewMessages)
})

// 组件销毁时清除轮询和事件监听
onUnmounted(() => {
  stopPolling()
  eventBus.off('conversation-new-message', handleNewMessages)
})

// 启动轮询
const startPolling = () => {
  // 清除现有的定时器
  stopPolling()
  
  // 创建新的定时器，定期刷新会话列表和当前会话的消息
  pollingTimer = setInterval(() => {
    loadConversations(false) // 静默更新，不显示加载状态
    
    // 如果当前有选中的会话，也更新消息列表
    if (currentConversation.value) {
      loadMessages(currentConversation.value.conversationId, false) // 静默更新
    }
  }, POLLING_INTERVAL)
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 处理新消息通知
const handleNewMessages = (conversationId) => {
  // 如果通知的会话是当前选中的会话，刷新消息列表
  if (conversationId === currentConversation.value?.conversationId) {
    loadMessages(conversationId, false)
  }
}

// 加载会话列表
const loadConversations = async (showLoading = true) => {
  if (showLoading) {
    loadingConversations.value = true
  }
  
  try {
    const result = await messageApi.getConversations()
    if (result.code === 0 && result.data) {
      // 获取当前选中的会话ID
      const currentConversationId = currentConversation.value?.conversationId
      
      // 更新会话列表
      conversationList.value = result.data
      
      // 如果有会话，并且没有选中会话，自动选中第一个
      if (conversationList.value.length > 0 && !currentConversation.value) {
        selectConversation(conversationList.value[0])
      } 
      // 如果当前有选中的会话，保持选中状态
      else if (currentConversationId) {
        const updatedConversation = conversationList.value.find(
          conv => conv.conversationId === currentConversationId
        )
        if (updatedConversation) {
          currentConversation.value = updatedConversation
        }
      }
    } else {
      if (showLoading) {
        ElMessage.error('获取会话列表失败')
      }
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
    if (showLoading) {
      ElMessage.error('获取会话列表失败')
    }
  } finally {
    if (showLoading) {
      loadingConversations.value = false
    }
  }
}

// 加载消息列表
const loadMessages = async (conversationId, showLoading = true) => {
  if (!conversationId) return
  
  if (showLoading) {
    loadingMessages.value = true
  }
  
  try {
    const result = await messageApi.getConversationMessages(conversationId)
    if (result.code === 0 && result.data) {
      // 判断是否有新消息
      const currentLastMessageId = messageList.value.length > 0 
        ? messageList.value[messageList.value.length - 1].id 
        : null
      
      // 处理消息数据，确保与MessageVO匹配
      const newMessages = result.data.map(msg => ({
        ...msg,
        // 确保时间字段正确
        createTime: msg.createTime || msg.sendTime,
        // 确保状态字段正确
        status: msg.status || 1,
        // 标记是否是自己发送的消息
        isMine: msg.senderId === currentUserId.value
      }))
      
      // 更新消息列表
      messageList.value = newMessages
      
      // 更新最后消息ID用于消息检查
      if (newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1]
        messageState.setConversationLastMessageId(conversationId, lastMessage.id)
      }
      
      // 有新消息且当前会话为活动会话时滚动到底部
      const hasNewMessages = newMessages.length > 0 && 
        (!currentLastMessageId || 
         newMessages[newMessages.length - 1].id !== currentLastMessageId)
      
      if (hasNewMessages) {
        nextTick(() => {
          scrollToBottom()
        })
      }
    } else {
      if (showLoading) {
        ElMessage.error('获取消息列表失败')
      }
    }
  } catch (error) {
    console.error('获取消息列表失败:', error)
    if (showLoading) {
      ElMessage.error('获取消息列表失败')
    }
  } finally {
    if (showLoading) {
      loadingMessages.value = false
    }
  }
}

// 选择会话
const selectConversation = (conversation) => {
  currentConversation.value = conversation
  
  // 更新全局状态中的当前活跃会话
  messageState.setActiveConversation(conversation.conversationId)
  
  // 标记为已读
  markConversationAsRead(conversation.conversationId)
  
  // 加载消息
  loadMessages(conversation.conversationId)
}

// 标记会话为已读
const markConversationAsRead = async (conversationId) => {
  try {
    await messageApi.markConversationAsReadFromList(conversationId)
    
    // 更新会话列表中的未读数
    const conversation = conversationList.value.find(item => item.conversationId === conversationId)
    if (conversation) {
      conversation.unreadCount = 0
    }
    // 通知顶栏同步更新未读消息总数
    eventBus.emit('unread-count-update', totalUnreadCount.value)
  } catch (error) {
    console.error('标记会话为已读失败:', error)
  }
}

// 一键标记所有会话为已读
const markAllAsRead = async () => {
  try {
    const result = await messageApi.markAllConversationsAsRead()
    if (result.code === 0) {
      // 更新会话列表中的未读数
      conversationList.value.forEach(conversation => {
        conversation.unreadCount = 0
      })
      // 通知顶栏未读数归零
      eventBus.emit('unread-count-update', 0)
      ElMessage.success('已将所有消息标记为已读')
    }
  } catch (error) {
    console.error('一键已读失败:', error)
    ElMessage.error('操作失败')
  }
}

// 发送消息
const sendMessage = async () => {
  if (!messageInput.value.trim() || !currentConversation.value) {
    return
  }
  
  sendingMessage.value = true
  try {
    const targetUserId = currentConversation.value.targetUserId
    if (!targetUserId) {
      ElMessage.error('无法识别接收者')
      return
    }
    
    const result = await messageApi.sendPrivateMessage(
      targetUserId,
      messageInput.value.trim()
    )
    
    if (result.code === 0) {
      // 清空输入框
      messageInput.value = ''
      
      // 重新加载消息
      loadMessages(currentConversation.value.conversationId)
      
      // 重新加载会话列表以更新最后消息
      loadConversations(false)
    } else {
      ElMessage.error(result.msg || '发送失败')
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
  } finally {
    sendingMessage.value = false
  }
}

// 撤回消息
const retractMessage = async (message) => {
  // 检查是否是自己发送的消息且在两分钟内
  const isSelfMessage = message.senderId === currentUserId.value
  const messageTime = message.createTime || message.sendTime
  const isWithinTwoMinutes = dayjs().diff(dayjs(messageTime), 'minute') <= 2
  
  if (!isSelfMessage) {
    ElMessage.warning('只能撤回自己发送的消息')
    return
  }
  
  if (!isWithinTwoMinutes) {
    ElMessage.warning('只能撤回2分钟内的消息')
    return
  }
  
  ElMessageBox.confirm('确定要撤回这条消息吗？', '撤回消息', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const result = await messageApi.retractMessage(message.id)
      if (result.code === 0) {
        // 重新加载消息
        loadMessages(currentConversation.value.conversationId)
        ElMessage.success('消息已撤回')
      } else {
        ElMessage.error(result.msg || '撤回失败')
      }
    } catch (error) {
      console.error('撤回消息失败:', error)
      ElMessage.error('撤回消息失败')
    }
  }).catch(() => {
    // 用户取消操作
  })
}

// 监听消息列表变化，自动滚动到底部
watch(messageList, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContentRef.value) {
    messagesContentRef.value.scrollTop = messagesContentRef.value.scrollHeight
  }
}

// 格式化时间 - 用于消息气泡内显示详细时间
const formatDetailTime = (time) => {
  return dayjs(time).format('HH:mm');
}

// 格式化时间 - 用于消息分组时间显示
const formatTime = (time) => {
  return dayjs(time).format('HH:mm');
}

// 格式化日期 - 用于日期分隔线
const formatDate = (time) => {
  const messageDate = dayjs(time);
  const today = dayjs();
  
  if (messageDate.isSame(today, 'day')) {
    return '今天';
  } else if (messageDate.isSame(today.subtract(1, 'day'), 'day')) {
    return '昨天';
  } else if (messageDate.isSame(today, 'year')) {
    return messageDate.format('MM月DD日');
  } else {
    return messageDate.format('YYYY年MM月DD日');
  }
}

// 检查两条消息是否为同一天
const isSameDay = (message, prevMessage) => {
  if (!prevMessage) return false;
  
  const messageTime = dayjs(message.createTime || message.sendTime);
  const prevMessageTime = dayjs(prevMessage.createTime || prevMessage.sendTime);
  
  return messageTime.isSame(prevMessageTime, 'day');
}

// 判断是否应该显示时间
const shouldShowTime = (message, index) => {
  // 对于第一条消息，总是显示时间
  if (index === 0) return true;
  
  const prevMessage = messageList.value[index - 1];
  const messageTime = dayjs(message.createTime || message.sendTime);
  const prevMessageTime = dayjs(prevMessage.createTime || prevMessage.sendTime);
  
  // 如果与前一条消息相隔超过5分钟，显示时间
  return messageTime.diff(prevMessageTime, 'minute') > 5;
}

// 格式化会话时间
const formatConversationTime = (time) => {
  const now = dayjs()
  const messageTime = dayjs(time)
  
  // 如果是今天，显示时间
  if (now.isSame(messageTime, 'day')) {
    return messageTime.format('HH:mm')
  }
  
  // 如果是昨天，显示"昨天"
  if (now.subtract(1, 'day').isSame(messageTime, 'day')) {
    return '昨天'
  }
  
  // 如果是今年，显示月日
  if (now.isSame(messageTime, 'year')) {
    return messageTime.format('MM-DD')
  }
  
  // 否则显示年月日
  return messageTime.format('YYYY-MM-DD')
}

// 计算总未读消息数
const totalUnreadCount = computed(() => {
  return conversationList.value.reduce((total, conversation) => {
    return total + (conversation.unreadCount || 0)
  }, 0)
})

// 样式相关的计算属性
const messageItemClass = (message) => {
  return {
    'message-item': true,
    'self-message': message.senderId === currentUserId.value || message.isMine,
    'other-message': message.senderId !== currentUserId.value && !message.isMine,
    'retracted-message-container': message.status === 0 || message.content.includes('[该消息已撤回]')
  }
}

// 获取会话对方的用户信息
const getOtherUser = (conversation) => {
  return {
    id: conversation.targetUserId,
    username: conversation.targetUsername || '未知用户',
    avatar: conversation.targetAvatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
  }
}

// 获取会话最后消息
const getLastMessage = (conversation) => {
  return {
    content: conversation.lastMessage || '暂无消息',
    createTime: conversation.lastMessageTime || conversation.createTime || new Date()
  }
}

// 创建新会话
const createNewConversation = async () => {
  ElMessageBox.prompt('请输入用户ID', '创建新会话', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^[0-9]+$/,
    inputErrorMessage: '用户ID必须为数字'
  }).then(async ({ value }) => {
    const targetUserId = parseInt(value)
    
    try {
      // 创建会话
      const result = await messageApi.createPrivateConversation(targetUserId)
      if (result.code === 0 && result.data) {
        // 重新加载会话列表
        await loadConversations()
        
        // 查找并选中新创建的会话
        const newConversation = conversationList.value.find(
          conv => (conv.targetUserId === targetUserId)
        )
        
        if (newConversation) {
          selectConversation(newConversation)
          ElMessage.success('已创建新会话')
        } else {
          ElMessage.warning('会话已创建，但未能自动选中，请手动选择')
        }
      } else {
        ElMessage.error(result.msg || '创建会话失败')
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      ElMessage.error('创建会话失败')
    }
  }).catch(() => {
    // 用户取消操作
  })
}
</script>

<template>
  <div class="messages-container">
    <div class="messages-layout">
      <!-- 左侧会话列表 -->
      <div class="conversations-panel">
        <div class="conversations-header">
          <h2>消息中心</h2>
          <div class="conversations-actions">
            <el-button 
              type="primary" 
              size="small"
              plain
              @click="createNewConversation"
            >
              <el-icon><Plus /></el-icon>新会话
            </el-button>
            <el-button 
              type="primary" 
              size="small"
              plain
              @click="markAllAsRead"
              :disabled="totalUnreadCount === 0"
            >
              全部已读
            </el-button>
          </div>
        </div>
        
        <div class="conversations-search">
          <el-input
            placeholder="搜索会话"
            prefix-icon="Search"
            clearable
          />
        </div>
        
        <div class="conversations-list">
          <el-empty 
            v-if="!loadingConversations && conversationList.length === 0"
            description="暂无会话"
            :image-size="80"
          >
            <el-button type="primary" @click="createNewConversation">
              开始新会话
            </el-button>
          </el-empty>
          
          <el-scrollbar v-else>
            <div class="conversation-items">
              <div 
                v-for="conversation in conversationList" 
                :key="conversation.conversationId"
                class="conversation-item"
                :class="{ 
                  'active': currentConversation?.conversationId === conversation.conversationId,
                  'unread': conversation.unreadCount > 0
                }"
                @click="selectConversation(conversation)"
              >
                <div class="conversation-avatar">
                  <el-avatar 
                    :size="40" 
                    :src="getOtherUser(conversation).avatar"
                  />
                  <div 
                    v-if="conversation.unreadCount > 0" 
                    class="unread-indicator"
                  >
                    {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
                  </div>
                </div>
                
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">{{ getOtherUser(conversation).username }}</span>
                    <span class="conversation-time">{{ formatConversationTime(getLastMessage(conversation).createTime) }}</span>
                  </div>
                  <div class="conversation-preview" :class="{'preview-unread': conversation.unreadCount > 0}">
                    {{ getLastMessage(conversation).content }}
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
      
      <!-- 右侧消息内容 -->
      <div class="messages-panel">
        <template v-if="currentConversation">
          <!-- 对话头部 -->
          <div class="messages-header">
            <div class="user-info">
              <el-avatar 
                :size="36" 
                :src="getOtherUser(currentConversation).avatar"
              />
              <div class="user-details">
                <div class="user-name">{{ getOtherUser(currentConversation).username }}</div>
<!--                <div class="user-status">在线</div>-->
              </div>
            </div>
            
            <div class="messages-actions">
              <el-tooltip content="查看用户资料" placement="bottom">
                <el-button type="text" icon="User" />
              </el-tooltip>
              <el-tooltip content="查看历史消息" placement="bottom">
                <el-button type="text" icon="Calendar" />
              </el-tooltip>
              <el-tooltip content="更多操作" placement="bottom">
                <el-dropdown trigger="click">
                  <el-button type="text" icon="MoreFilled" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item>清空消息</el-dropdown-item>
                      <el-dropdown-item>举报用户</el-dropdown-item>
                      <el-dropdown-item>屏蔽用户</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </el-tooltip>
            </div>
          </div>
          
          <!-- 消息列表 -->
          <div class="messages-content" ref="messagesContentRef">
            <el-empty 
              v-if="!loadingMessages && messageList.length === 0"
              description="暂无消息记录"
              :image-size="80"
            >
              <p class="empty-tip">发送消息开始对话</p>
            </el-empty>
            
            <div v-else class="message-list-wrapper">
              <div class="loading-indicator" v-if="loadingMessages">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载消息中...</span>
              </div>
              
              <div class="message-list">
                <div 
                  v-for="(message, index) in messageList" 
                  :key="message.id"
                >
                  <!-- 日期分隔线 -->
                  <div 
                    v-if="index === 0 || !isSameDay(message, messageList[index-1])" 
                    class="date-divider"
                  >
                    <span>{{ formatDate(message.createTime || message.sendTime) }}</span>
                  </div>
                  
                  <!-- 时间线 -->
                  <div 
                    v-if="shouldShowTime(message, index)" 
                    class="time-divider"
                  >
                    <span>{{ formatTime(message.createTime || message.sendTime) }}</span>
                  </div>
                  
                  <!-- 消息气泡 -->
                  <div 
                    class="message-item"
                    :class="{
                      'message-self': message.isMine,
                      'message-other': !message.isMine,
                      'message-retracted': message.status === 0 || message.content.includes('[该消息已撤回]')
                    }"
                  >
                    <!-- 左侧头像 - 只在对方消息显示 -->
                    <div class="message-avatar other-avatar" v-if="!message.isMine">
                      <el-avatar 
                        :size="36" 
                        :src="getOtherUser(currentConversation).avatar"
                      />
                    </div>
                    
                    <!-- 消息内容 -->
                    <div class="message-content-wrapper">
                      <div 
                        class="message-bubble"
                        @contextmenu.prevent="message.isMine && message.status !== 0 && !message.content.includes('[该消息已撤回]') && retractMessage(message)"
                        :data-can-retract="message.isMine && message.status !== 0 && !message.content.includes('[该消息已撤回]') && dayjs().diff(dayjs(message.createTime || message.sendTime), 'minute') <= 2"
                      >
                        <div v-if="message.status === 0 || message.content.includes('[该消息已撤回]')" class="retracted-message">
                          <el-icon><Delete /></el-icon>
                          <span>消息已撤回</span>
                        </div>
                        <div v-else class="message-text">{{ message.content }}</div>
                      </div>
                    </div>
                    
                    <!-- 右侧头像 - 只在自己消息显示 -->
                    <div class="message-avatar self-avatar" v-if="message.isMine">
                      <el-avatar 
                        :size="36" 
                        :src="userInfoStore.userInfo?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 输入区域 -->
          <div class="messages-composer">
            <div class="composer-tools">
              <el-tooltip content="表情" placement="top">
                <el-button type="text" icon="SmileFilled" class="tool-button" />
              </el-tooltip>
              <el-tooltip content="图片" placement="top">
                <el-button type="text" icon="PictureFilled" class="tool-button" />
              </el-tooltip>
              <el-tooltip content="文件" placement="top">
                <el-button type="text" icon="Document" class="tool-button" />
              </el-tooltip>
            </div>
            
            <div class="composer-input">
              <el-input
                v-model="messageInput"
                type="textarea"
                :rows="3"
                placeholder="输入消息，按 Ctrl + Enter 发送"
                resize="none"
                @keyup.ctrl.enter="sendMessage"
              />
            </div>
            
            <div class="composer-actions">
              <span class="composer-tip">Ctrl + Enter 发送</span>
              <el-button 
                type="primary" 
                :loading="sendingMessage"
                :disabled="!messageInput.trim()"
                @click="sendMessage"
              >
                发送
              </el-button>
            </div>
          </div>
        </template>
        
        <!-- 未选择会话时的空状态 -->
        <div v-else class="empty-state">
          <img src="https://element-plus.org/images/element-plus-logo.svg" alt="Logo" class="empty-logo" />
          <h3>选择一个会话开始聊天</h3>
          <p>或者创建新的会话</p>
          <el-button type="primary" @click="createNewConversation">
            创建新会话
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.messages-container {
  height: calc(100vh - 60px);
  width: 100%;
  background-color: #f0f2f5;
  overflow: hidden;
}

.messages-layout {
  display: flex;
  height: 100%;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 左侧会话列表面板 */
.conversations-panel {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  background-color: #fff;
}

.conversations-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
}

.conversations-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.conversations-actions {
  display: flex;
  gap: 8px;
}

.conversations-search {
  padding: 12px 16px;
  border-bottom: 1px solid #eaeaea;
}

.conversations-list {
  flex: 1;
  overflow: hidden;
}

.conversation-items {
  padding: 8px 0;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.conversation-item:hover {
  background-color: #f5f7fa;
}

.conversation-item.active {
  background-color: #e6f1fc;
}

.conversation-item.unread {
  background-color: #f0f9eb;
}

.conversation-avatar {
  position: relative;
  margin-right: 12px;
}

.unread-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #f56c6c;
  color: white;
  font-size: 12px;
  padding: 0 4px;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conversation-name {
  font-weight: 500;
  color: #333;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.conversation-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.conversation-preview {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-unread {
  color: #333;
  font-weight: 500;
}

/* 右侧消息面板 */
.messages-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
  overflow: hidden;
  width: 100%;
}

.messages-header {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-details {
  margin-left: 12px;
}

.user-name {
  font-weight: 500;
  font-size: 16px;
  color: #333;
}

.user-status {
  font-size: 12px;
  color: #67c23a;
}

.messages-actions {
  display: flex;
  gap: 8px;
}

.messages-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: #909399;
  font-size: 14px;
}

.loading-indicator .el-icon {
  margin-right: 8px;
}

.message-list-wrapper {
  display: flex;
  flex-direction: column;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-divider {
  text-align: center;
  margin: 16px 0;
  position: relative;
}

.date-divider span {
  display: inline-block;
  padding: 0 10px;
  background-color: #f5f7fa;
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: #909399;
  border-radius: 10px;
  border: 1px solid #ebeef5;
}

.time-divider {
  text-align: center;
  margin: 8px 0;
}

.time-divider span {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  color: #909399;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  margin: 8px 0;
  width: 100%;
  position: relative;
}

.message-self {
  justify-content: flex-end;
  text-align: right;
}

.message-other {
  justify-content: flex-start;
  text-align: left;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
}

.other-avatar {
  margin-right: 8px;
}

.self-avatar {
  margin-left: 8px;
}

.message-content-wrapper {
  max-width: 65%;
  position: relative;
}

.message-self .message-content-wrapper {
  order: 1;
}

.message-self .self-avatar {
  order: 2;
}

.message-bubble {
  padding: 10px 15px;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-self .message-bubble {
  background-color: #95ec69;
  color: #000;
  border-top-right-radius: 4px;
}

.message-other .message-bubble {
  background-color: #fff;
  color: #000;
  border-top-left-radius: 4px;
}

.message-retracted .message-bubble {
  background-color: #f5f5f5;
}

.message-text {
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.retracted-message {
  display: flex;
  align-items: center;
  color: #909399;
  font-style: italic;
  font-size: 14px;
}

.retracted-message .el-icon {
  margin-right: 4px;
  font-size: 14px;
}

.message-status {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  gap: 4px;
}

/* 只在对方的消息下显示时间 */
.message-self .message-status {
  display: none;
}

/* 添加撤回提示 */
.message-self .message-bubble:hover::after {
  content: "右键点击可撤回";
  position: absolute;
  bottom: -18px;
  right: 5px;
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  opacity: 0.8;
  pointer-events: none;
}

/* 只对可撤回的消息显示提示 */
.message-retracted .message-bubble:hover::after,
.message-self .message-bubble:hover::after:not([data-can-retract="true"]) {
  display: none;
}

/* 编辑器区域 */
.messages-composer {
  background-color: #fff;
  border-top: 1px solid #eaeaea;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.composer-tools {
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
}

.tool-button {
  font-size: 20px;
  color: #606266;
}

.composer-input {
  margin-bottom: 12px;
  width: 100%;
  box-sizing: border-box;
}

.composer-input :deep(.el-textarea__inner) {
  resize: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  line-height: 1.5;
  border-color: #dcdfe6;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
}

.composer-input :deep(.el-textarea__inner:focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 159, 255, 0.1);
}

.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.composer-tip {
  font-size: 12px;
  color: #909399;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  color: #909399;
  padding: 20px;
  background-color: #f5f7fa;
  width: 100%;
}

.empty-logo {
  width: 100px;
  height: 100px;
  margin-bottom: 30px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 500;
  color: #606266;
}

.empty-state p {
  margin: 0 0 25px;
  font-size: 15px;
}

.empty-tip {
  margin-top: 8px;
  color: #909399;
}

/* 响应式样式 */
@media screen and (max-width: 768px) {
  .messages-layout {
    flex-direction: column;
  }
  
  .conversations-panel {
    width: 100%;
    height: 40%;
    min-height: 200px;
  }
  
  .messages-panel {
    height: 60%;
  }
}

/* 滚动条美化 */
.messages-content::-webkit-scrollbar {
  width: 8px;
}

.messages-content::-webkit-scrollbar-track {
  background: transparent;
}

.messages-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.messages-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}
</style> 