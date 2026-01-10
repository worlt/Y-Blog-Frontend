<template>
  <div class="ai-chat-container">
    <!-- 悬浮按钮 -->
    <div 
      class="ai-fab" 
      @click="toggleChat" 
      v-show="!visible"
      title="AI 智能助手"
    >
      <Icon icon="mdi:robot-excited-outline" class="fab-icon" />
      <span class="fab-text">AI 助手</span>
    </div>

    <!-- 聊天窗口 -->
    <transition name="chat-fade">
      <div class="chat-window" v-show="visible">
        <!-- 头部 -->
        <div class="chat-header">
          <div class="header-left">
            <Icon icon="mdi:robot-excited-outline" class="header-icon" />
            <span class="header-title">AI 智能助手</span>
          </div>
          <div class="header-controls">
            <button class="control-btn" @click="clearHistory" title="清除历史">
              <Icon icon="mdi:delete-sweep-outline" />
            </button>
            <button class="control-btn" @click="toggleChat" title="最小化">
              <Icon icon="mdi:minus" />
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="chat-messages" ref="messagesRef">
          <div v-if="messages.length === 0" class="welcome-message">
            <Icon icon="mdi:robot-outline" class="welcome-icon" />
            <p>你好！我是你的 AI 智能助手。</p>
            <p>有什么我可以帮你的吗？</p>
          </div>
          
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            class="message-item"
            :class="msg.role"
            v-show="msg.role === 'user' || msg.content || msg.thinking"
          >
            <div class="message-avatar">
              <Icon v-if="msg.role === 'ai'" icon="mdi:robot-confused-outline" />
              <Icon v-else icon="mdi:account-circle-outline" />
            </div>
            <div class="message-content">
              <div v-if="msg.thinking" class="thinking-section">
                <div class="thinking-header" @click="msg.showThinking = !msg.showThinking">
                  <Icon :icon="msg.showThinking ? 'mdi:chevron-down' : 'mdi:chevron-right'" />
                  <span>深度思考过程</span>
                </div>
                <div v-show="msg.showThinking" class="thinking-content">
                  {{ msg.thinking }}<span v-if="loading && index === messages.length - 1 && !msg.content" class="cursor">_</span>
                </div>
              </div>
              <div class="content-text" v-if="msg.content">
                {{ msg.content }}<span v-if="loading && index === messages.length - 1" class="cursor">_</span>
              </div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <div v-if="loading && !isGenerating" class="message-item ai loading">
            <div class="message-avatar">
              <Icon icon="mdi:robot-confused-outline" />
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="chat-input-area">
          <textarea
            v-model="inputMessage"
            class="chat-input"
            placeholder="请输入您的问题..."
            @keydown.enter.prevent="handleEnter"
            :disabled="loading"
            rows="3"
          ></textarea>
          <button 
            class="send-btn" 
            @click="sendMessage"
            :disabled="!inputMessage.trim() || loading"
          >
            <Icon icon="mdi:send" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onBeforeUnmount, reactive, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { sendChatMessage, sendStreamChatMessage } from '@/api/ai.js'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const inputMessage = ref('')
const loading = ref(false)
const messages = ref([])
const messagesRef = ref(null)
const conversationId = ref(null)

// 判断是否正在生成内容（已有部分输出）
const isGenerating = computed(() => {
  if (!loading.value || messages.value.length === 0) return false
  const lastMsg = messages.value[messages.value.length - 1]
  return lastMsg.role === 'ai' && (!!lastMsg.content || !!lastMsg.thinking)
})

// 从本地存储加载历史记录
const loadHistory = () => {
  const history = localStorage.getItem('ai_chat_history')
  if (history) {
    try {
      const data = JSON.parse(history)
      messages.value = data.messages || []
      conversationId.value = data.conversationId
    } catch (e) {
      console.error('Failed to parse chat history', e)
    }
  }
}

// 保存历史记录到本地存储
const saveHistory = () => {
  localStorage.setItem('ai_chat_history', JSON.stringify({
    messages: messages.value,
    conversationId: conversationId.value
  }))
}

// 切换聊天窗口显示状态
const toggleChat = () => {
  visible.value = !visible.value
  if (visible.value) {
    scrollToBottom()
  }
}

// 清除历史记录
const clearHistory = () => {
  messages.value = []
  conversationId.value = null
  localStorage.removeItem('ai_chat_history')
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 处理回车键
const handleEnter = (e) => {
  if (!e.shiftKey) {
    sendMessage()
  }
}

const abortController = ref(null)

// 发送消息
const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || loading.value) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: content,
    timestamp: Date.now()
  })
  
  inputMessage.value = ''
  loading.value = true
  scrollToBottom()

  // AI 占位消息
  const aiMsgIndex = messages.value.push({
    role: 'ai',
    content: '',
    thinking: '',
    showThinking: true, // 默认展开思考
    timestamp: Date.now()
  }) - 1
  const aiMsg = messages.value[aiMsgIndex] // 获取响应式对象

  try {
      abortController.value = await sendStreamChatMessage(
        {
          message: content,
          conversationId: conversationId.value
        },
        (event) => {
            // onMessage
            if (event.type === 'meta') {
                if (event.conversationId) conversationId.value = event.conversationId;
            } else if (event.type === 'thinking') {
                if (event.text) {
                    aiMsg.thinking = (aiMsg.thinking || '') + event.text;
                    // 有思考内容时保持展开
                    if (!aiMsg.showThinking) aiMsg.showThinking = true;
                }
            } else if (event.type === 'content') {
                if (event.text) {
                     aiMsg.content = (aiMsg.content || '') + event.text;
                }
            }
            scrollToBottom();
        },
        (error) => {
            // onError
            console.error('Stream error', error);
            if (!aiMsg.content && !aiMsg.thinking) {
                 aiMsg.content = '网络请求失败，请稍后重试。';
                 aiMsg.isError = true;
            } else {
                 aiMsg.content += '\n[连接中断]';
            }
            loading.value = false;
            scrollToBottom();
            ElMessage.error('网络请求失败');
        },
        () => {
            // onComplete
            loading.value = false;
            saveHistory();
            scrollToBottom();
            abortController.value = null;
        }
      );
  } catch(e) {
      console.error(e);
      loading.value = false;
  }
}

onBeforeUnmount(() => {
  if (abortController.value) {
    abortController.value.abort();
  }
})

// 初始化
onMounted(() => {
  loadHistory()
})

// 监听消息变化自动保存
watch(messages, () => {
  saveHistory()
}, { deep: true })

</script>

<style scoped>
.ai-chat-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 2000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* 悬浮按钮样式 */
.ai-fab {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  color: white;
  overflow: hidden;
}

.ai-fab:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.fab-icon {
  font-size: 28px;
  margin-bottom: -2px;
}

.fab-text {
  font-size: 10px;
  font-weight: bold;
}

/* 聊天窗口样式 */
.chat-window {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 380px;
  height: 550px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.05);
  transform-origin: bottom right;
}

/* 头部样式 */
.chat-header {
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 24px;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
}

.header-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 消息列表样式 */
.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.welcome-message {
  text-align: center;
  color: #6b7280;
  margin-top: 40px;
  padding: 20px;
}

.welcome-icon {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 12px;
}

.message-item {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message-item.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-item.ai {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: #667eea;
  flex-shrink: 0;
  font-size: 20px;
}

.message-item.user .message-avatar {
  background: #667eea;
  color: white;
  border: none;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.content-text {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-item.user .content-text {
  background: #667eea;
  color: white;
  border-bottom-right-radius: 2px;
}

.message-item.ai .content-text {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 2px;
}

.message-time {
  font-size: 10px;
  color: #9ca3af;
  padding: 0 4px;
}

.message-item.user .message-time {
  text-align: right;
}

/* 输入区域样式 */
.chat-input-area {
  padding: 15px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  background: #f9fafb;
  font-family: inherit;
}

.chat-input:focus {
  border-color: #667eea;
  background: white;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #667eea;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  font-size: 20px;
}

.send-btn:hover:not(:disabled) {
  background: #5a6fd6;
}

.send-btn:disabled {
  background: #e5e7eb;
  cursor: not-allowed;
  color: #9ca3af;
}

/* 加载动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 过渡动画 */
.chat-fade-enter-active,
.chat-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.chat-fade-enter-from,
.chat-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.thinking-section {
  max-width: 100%;
  margin-bottom: 8px;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  background: #f9fafb;
  user-select: none;
}

.thinking-header:hover {
  background: #f3f4f6;
}

.thinking-content {
  padding: 8px 10px;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  white-space: pre-wrap;
  background: #f9fafb;
  line-height: 1.4;
}

.cursor {
  display: inline-block;
  font-weight: bold;
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
