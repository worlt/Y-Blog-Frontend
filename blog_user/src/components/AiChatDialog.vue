<template>
  <div class="ai-chat-container" :style="containerStyle" :class="{ dragging: isDragging }">
    <!-- 悬浮按钮 -->
    <div 
      class="ai-fab" 
      @click="handleClick"
      @mousedown="startDrag" 
      v-show="!visible"
      title="AI 智能助手"
    >
      <Icon icon="mdi:robot-excited-outline" class="fab-icon" />
      <span class="fab-text">AI 助手</span>
    </div>

    <!-- 聊天窗口 -->
    <transition name="chat-fade">
      <div 
        class="chat-window" 
        v-show="visible"
        :style="{ width: windowSize.width + 'px', height: windowSize.height + 'px' }"
      >
        <!-- 缩放手柄 (左上角) -->
        <div class="resize-handle" @mousedown="startResize" title="拖动缩放"></div>

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
              <!-- 当存在图片时显示图片 -->
              <div v-if="msg.image" class="message-image">
                <img :src="msg.image" alt="Uploaded Image" @click="previewImage(msg.image)" />
              </div>
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
          <!-- 图片预览 -->
          <div v-if="selectedImage" class="image-preview">
            <img :src="selectedImage" alt="Preview"/>
            <button class="remove-image-btn" @click="clearImage">
              <Icon icon="mdi:close" />
            </button>
          </div>
          
          <div class="input-controls">
            <input 
              type="file" 
              ref="fileInputRef" 
              accept="image/*" 
              style="display: none" 
              @change="handleFileSelect"
            />
            <button class="icon-btn" @click="triggerFileUpload" title="上传图片">
              <Icon icon="mdi:image-outline" />
            </button>
          </div>

          <textarea
            v-model="inputMessage"
            class="chat-input"
            placeholder="请输入您的问题... (可粘贴图片)"
            @keydown.enter.prevent="handleEnter"
            @paste="handlePaste"
            :disabled="loading"
            rows="3"
          ></textarea>
          <button 
            class="send-btn" 
            @click="sendMessage"
            :disabled="(!inputMessage.trim() && !selectedImage) || loading"
          >
            <Icon icon="mdi:send" />
          </button>
        </div>
      </div>
    </transition>

    <!-- 图片预览遮罩 -->
    <transition name="fade">
      <div v-if="previewVisible" class="image-viewer-overlay" @click="closePreview">
        <div class="image-viewer-content">
          <img :src="previewSrc" alt="Full Preview" @click.stop />
          <button class="close-preview-btn" @click="closePreview">
            <Icon icon="mdi:close" />
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
const selectedImage = ref(null)
const fileInputRef = ref(null)
const previewVisible = ref(false)
const previewSrc = ref('')

// 触发文件选择
const triggerFileUpload = () => {
  fileInputRef.value.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
  // 清空 value 允许重复选择同一文件
  event.target.value = ''
}

// 处理粘贴
const handlePaste = (event) => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile()
      processFile(blob)
      event.preventDefault() // 阻止默认粘贴行为（防止文件名粘贴到文本框）
      break
    }
  }
}

// 处理文件转 Base64
const processFile = (file) => {
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    selectedImage.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// 清除选中图片
const clearImage = () => {
  selectedImage.value = null
}

// 预览大图
const previewImage = (src) => {
  if (!src) return
  previewSrc.value = src
  previewVisible.value = true
}

// 关闭预览
const closePreview = () => {
  previewVisible.value = false
  previewSrc.value = ''
}

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

// 拖拽相关状态
const isDragging = ref(false)
const hasMoved = ref(false)
const containerStyle = reactive({
  right: '30px',
  bottom: '30px'
})
const dragOffset = { x: 0, y: 0 }

// 开始拖拽
const startDrag = (e) => {
  // 如果是点击了 FAB 内部的图标文字等，由于事件冒泡，也会触发
  // 仅左键点击允许拖拽
  if (e.button !== 0) return

  const container = document.querySelector('.ai-chat-container')
  if (!container) return

  const rect = container.getBoundingClientRect()
  
  // 记录鼠标相对元素的偏移量
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top
  
  hasMoved.value = false
  isDragging.value = true
  
  // 切换为 left/top 定位，防止 resize 时的怪异行为，并准备拖拽
  // 注意：需要先计算当前的 left/top 并固定
  containerStyle.right = 'auto'
  containerStyle.bottom = 'auto'
  containerStyle.left = `${rect.left}px`
  containerStyle.top = `${rect.top}px`

  // 添加全局监听
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

// 拖拽中
const onDrag = (e) => {
  if (!isDragging.value) return
  
  hasMoved.value = true
  e.preventDefault()

  let newLeft = e.clientX - dragOffset.x
  let newTop = e.clientY - dragOffset.y

  // 边界检查
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const elementWidth = 60 // FAB 宽度 approximate (container width depends on child)
  const elementHeight = 60

  // 限制在屏幕内
  // 左边界
  if (newLeft < 0) newLeft = 0
  // 右边界
  if (newLeft > windowWidth - elementWidth) newLeft = windowWidth - elementWidth
  // 上边界
  if (newTop < 0) newTop = 0
  // 下边界
  if (newTop > windowHeight - elementHeight) newTop = windowHeight - elementHeight

  containerStyle.left = `${newLeft}px`
  containerStyle.top = `${newTop}px`
}

// 停止拖拽
const stopDrag = () => {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)

  // 只要移动过，就执行吸附
  if (hasMoved.value) {
    const windowWidth = window.innerWidth
    const elementWidth = 60
    const margin = 30
    
    // 获取当前 left 值（去掉 px）
    const currentLeft = parseInt(containerStyle.left) || 0
    
    // 判断离哪边近
    if (currentLeft + elementWidth / 2 < windowWidth / 2) {
      // 吸附到左边
      containerStyle.left = `${margin}px`
      containerStyle.right = 'auto'
    } else {
      // 吸附到右边
      // 先用 left 动画过去
      const targetLeft = windowWidth - elementWidth - margin
      containerStyle.left = `${targetLeft}px`
      containerStyle.right = 'auto'
      
      // 动画结束后，切换为 right 定位以适应窗口缩放
      setTimeout(() => {
        containerStyle.left = 'auto'
        containerStyle.right = `${margin}px`
      }, 300)
    }
  }
}

// 处理点击
const handleClick = () => {
  // 只有未发生移动时才视为点击
  if (!hasMoved.value) {
    toggleChat()
  }
}

// 切换聊天窗口显示状态
const toggleChat = () => {
  if (!visible.value) {
     // 打开时强制归位，确保窗口内容不被遮挡
     containerStyle.left = 'auto'
     containerStyle.top = 'auto'
     containerStyle.right = '30px'
     containerStyle.bottom = '30px'
  }

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
  const image = selectedImage.value
  
  if ((!content && !image) || loading.value) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: content,
    image: image,
    timestamp: Date.now()
  })
  
  inputMessage.value = ''
  selectedImage.value = null
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
          message: content || (image ? ' ' : ''), // 兼容后端可能需要非空 message
          image: image,
          conversationId: conversationId.value
        },
        (event) => {
            // onMessage
            if (event.type === 'meta') {
                if (event.conversationId) conversationId.value = event.conversationId;
            } else if (event.type === 'thinking') {
                if (event.text) {
                    aiMsg.thinking = (aiMsg.thinking || '') + event.text;
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

// 缩放相关状态
const isResizing = ref(false)
const windowSize = reactive({
  width: 380,
  height: 550
})
const resizeStart = { x: 0, y: 0, width: 0, height: 0 }

// 开始缩放
const startResize = (e) => {
  e.preventDefault()
  e.stopPropagation() // 防止触发拖拽
  
  isResizing.value = true
  resizeStart.x = e.clientX
  resizeStart.y = e.clientY
  resizeStart.width = windowSize.width
  resizeStart.height = windowSize.height
  
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

// 缩放中
const onResize = (e) => {
  if (!isResizing.value) return
  e.preventDefault()
  
  // 向左上角拖动增加宽高
  const deltaX = resizeStart.x - e.clientX
  const deltaY = resizeStart.y - e.clientY
  
  let newWidth = resizeStart.width + deltaX
  let newHeight = resizeStart.height + deltaY
  
  // 限制最小/最大尺寸
  // 最小尺寸
  if (newWidth < 300) newWidth = 300
  if (newHeight < 400) newHeight = 400
  
  // 最大尺寸（屏幕宽度的 90%，高度的 90%）
  const maxWidth = window.innerWidth * 0.9
  const maxHeight = window.innerHeight * 0.9
  
  if (newWidth > maxWidth) newWidth = maxWidth
  if (newHeight > maxHeight) newHeight = maxHeight
  
  windowSize.width = newWidth
  windowSize.height = newHeight
}

// 停止缩放
const stopResize = () => {
  isResizing.value = false
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}

onBeforeUnmount(() => {
  if (abortController.value) {
    abortController.value.abort();
  }
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
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
  transition: left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.ai-chat-container.dragging {
  transition: none !important;
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
  width: 380px; /* Default handled by inline style, but kept as fallback */
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

/* 缩放手柄样式 */
.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  z-index: 100;
}

.resize-handle::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 8px;
  height: 8px;
  border-top: 2px solid #cbd5e1;
  border-left: 2px solid #cbd5e1;
  border-top-left-radius: 2px;
  transition: border-color 0.2s;
}

.resize-handle:hover::before {
  border-color: #667eea;
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
  flex-wrap: wrap; /* 允许预览换行 */
  gap: 10px;
  align-items: flex-end;
  flex-shrink: 0;
  position: relative;
}

.image-preview {
  width: 100%;
  display: flex;
  margin-bottom: 5px;
  position: relative;
}

.image-preview img {
  max-height: 80px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  left: -8px; /* Depending on image width handling, maybe relative to img */
  background: red;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  left: 70px; /* Approximate based on max-height aspect ratio, fix dynamic later */
}

/* Better positioning for remove button */
.image-preview {
  position: relative;
  display: inline-block;
  width: auto;
}

.remove-image-btn {
  left: auto;
  right: -8px;
  top: -8px;
}

.input-controls {
  display: flex;
  align-items: center;
  height: 40px; /* Match send btn height */
}

.icon-btn {
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  color: #667eea;
  background: #f3f4f6;
}

.message-image {
  margin-bottom: 8px;
  max-width: 100%;
}

.message-image img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
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

/* 图片预览遮罩 */
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10000; /* 最高层级 */
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
}

.image-viewer-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-viewer-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.close-preview-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: background 0.3s;
}

.close-preview-btn:hover {
  background: rgba(255, 255, 255, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
