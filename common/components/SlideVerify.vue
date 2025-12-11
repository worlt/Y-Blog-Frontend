<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { VERIFY_CONFIG } from '../utils/verifyConfig.js'
import axios from 'axios'

const props = defineProps({
  // 模式: 'dev' 或 'prod'。如果未提供，则使用全局配置
  mode: {
    type: String,
    default: null,
    validator: (value) => value === null || ['dev', 'prod'].includes(value)
  },
  // 难度等级
  difficulty: {
    type: String,
    default: 'normal',
    validator: (value) => ['easy', 'normal', 'hard'].includes(value)
  }
})

const emit = defineEmits(['verify', 'reset'])

// 状态管理
const isVerified = ref(false)
const isVerifying = ref(false)
const verifyStatus = ref('idle') // idle | verifying | success | failed
const errorMessage = ref('')
const verifyMode = ref('frontend') // frontend | backend
const captchaToken = ref('')

// 拼图数据
const puzzleData = reactive({
  backgroundImage: '',
  puzzleImage: '',
  offsetX: 0,
  offsetY: 0,
  puzzleId: '',
  mode: 'frontend'
})

// 用户操作数据
const userOffsetX = ref(0)
const userOffsetY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)

// DOM引用
const containerRef = ref(null)
const sliderRef = ref(null)
const puzzleBlockRef = ref(null)

// 计算属性
const sliderWidth = computed(() => {
  const difficulty = props.difficulty
  if (difficulty === 'easy') return 80
  if (difficulty === 'hard') return 40
  return 60 // normal
})

const isDevMode = computed(() => {
  // 优先使用prop传入的mode，否则使用全局配置
  const currentMode = props.mode ?? VERIFY_CONFIG.GLOBAL_VERIFY_MODE;
  return currentMode === 'dev';
})

// 初始化拼图 - 从后端获取
const initPuzzle = async () => {
  try {
    // 尝试从后端获取拼图
    // 使用/api前缀，会自动通过vite.config.js中的proxy转发到后端
    const response = await axios.get('/api/captcha/puzzle', {
      params: { difficulty: props.difficulty }
    })
    
    if (response.data && response.data.data) {
      const puzzle = response.data.data
      puzzleData.backgroundImage = puzzle.backgroundImage
      puzzleData.puzzleImage = puzzle.puzzleImage
      puzzleData.puzzleId = puzzle.puzzleId
      puzzleData.mode = puzzle.mode
      puzzleData.offsetX = puzzle.offsetX
      puzzleData.offsetY = puzzle.offsetY
      verifyMode.value = puzzle.mode
      
      // 如果是前端模式，生成随机拼图块位置
      if (puzzle.mode === 'frontend') {
        generateRandomPuzzle()
      }
    }
  } catch (error) {
    console.warn('从后端获取拼图失败，降级到前端模式:', error)
    // 降级到前端模式
    verifyMode.value = 'frontend'
    puzzleData.mode = 'frontend'
    generateRandomPuzzle()
  }
  
  // 重置用户操作
  userOffsetX.value = 0
  userOffsetY.value = 0
  isDragging.value = false
  verifyStatus.value = 'idle'
  errorMessage.value = ''
}

// 生成随机拼图
const generateRandomPuzzle = () => {
  // 生成随机背景图（使用渐变色作为示例）
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  ]
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  puzzleData.backgroundImage = randomColor
  
  // 生成随机拼图块颜色（稍微深一点）
  puzzleData.puzzleImage = 'rgba(255, 255, 255, 0.3)'
  
  // 生成随机正确偏移（在容器宽度范围内）
  const maxOffset = VERIFY_CONFIG.BACKGROUND_SIZE.width - VERIFY_CONFIG.PUZZLE_SIZE.width
  puzzleData.offsetX = Math.floor(Math.random() * maxOffset)
  puzzleData.offsetY = Math.floor(Math.random() * (VERIFY_CONFIG.BACKGROUND_SIZE.height - VERIFY_CONFIG.PUZZLE_SIZE.height))
  
  // 生成唯一ID
  puzzleData.puzzleId = `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 鼠标按下
const handleMouseDown = (e) => {
  if (isVerified.value) return
  
  isDragging.value = true
  dragStartX.value = e.clientX
  sliderRef.value?.classList.add('is-dragging')
}

// 鼠标移动
const handleMouseMove = (e) => {
  if (!isDragging.value || isVerified.value) return
  
  const moveX = e.clientX - dragStartX.value
  const maxMove = VERIFY_CONFIG.BACKGROUND_SIZE.width - VERIFY_CONFIG.PUZZLE_SIZE.width
  
  // 限制拖动范围
  userOffsetX.value = Math.max(0, Math.min(moveX, maxMove))
}

// 鼠标抬起
const handleMouseUp = async () => {
  if (!isDragging.value) return
  
  isDragging.value = false
  sliderRef.value?.classList.remove('is-dragging')
  
  // 验证拼图
  await verify()
}

// 验证拼图
const verify = async () => {
  if (isVerified.value) return
  
  isVerifying.value = true
  verifyStatus.value = 'verifying'
  errorMessage.value = ''
  
  try {
    // 开发模式：直接通过
    if (isDevMode.value) {
      // 模拟验证延迟
      await new Promise(resolve => setTimeout(resolve, 300))
      
      isVerified.value = true
      verifyStatus.value = 'success'
      captchaToken.value = 'dev-token-' + Date.now()
      emit('verify', { success: true, captchaToken: captchaToken.value })
      return
    }
    
    // 后端模式：调用后端验证
    if (verifyMode.value === 'backend') {
      const result = await axios.post('/api/captcha/verify', {
        puzzleId: puzzleData.puzzleId,
        offsetX: userOffsetX.value,
        offsetY: puzzleData.offsetY, // Y轴偏移量应与拼图块的Y轴一致
        difficulty: props.difficulty
      })
      
      if (result.data && result.data.data && result.data.data.captchaToken) {
        isVerified.value = true
        verifyStatus.value = 'success'
        captchaToken.value = result.data.data.captchaToken
        emit('verify', { success: true, captchaToken: captchaToken.value })
      } else {
        verifyStatus.value = 'failed'
        errorMessage.value = '拼图位置不正确，请重试'
        emit('verify', { success: false, captchaToken: null })
      }
    } else {
      // 前端模式：本地验证
      const tolerance = VERIFY_CONFIG.TOLERANCE[props.difficulty] || VERIFY_CONFIG.TOLERANCE['normal'];
      const offsetDiff = Math.abs(userOffsetX.value - puzzleData.offsetX)
      
      // 如果误差在允许范围内，验证成功
      if (offsetDiff <= tolerance) {
        isVerified.value = true
        verifyStatus.value = 'success'
        captchaToken.value = 'frontend-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        emit('verify', { success: true, captchaToken: captchaToken.value })
      } else {
        verifyStatus.value = 'failed'
        errorMessage.value = '拼图位置不正确，请重试'
        emit('verify', { success: false, captchaToken: null })
      }
    }
  } catch (error) {
    console.error('验证失败:', error)
    verifyStatus.value = 'failed'
    errorMessage.value = '验证失败，请重试'
    emit('verify', { success: false, captchaToken: null })
  } finally {
    isVerifying.value = false
  }
}

// 重置验证
const reset = () => {
  isVerified.value = false
  userOffsetX.value = 0
  userOffsetY.value = 0
  isDragging.value = false
  verifyStatus.value = 'idle'
  errorMessage.value = ''
  initPuzzle()
  emit('reset')
}

// 生命周期
onMounted(() => {
  initPuzzle()
  
  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
})

// 暴露方法给父组件
defineExpose({
  reset,
  verify,
  isVerified
})
</script>

<template>
  <div class="slide-verify-container">
    <!-- 验证成功状态 -->
    <div v-if="isVerified" class="verify-success">
      <div class="success-icon">✓</div>
      <span class="success-text">验证成功</span>
      <el-button 
        link 
        type="primary" 
        size="small"
        @click="reset"
      >
        重新验证
      </el-button>
    </div>

    <!-- 验证进行中 -->
    <div v-else-if="verifyStatus === 'verifying'" class="verify-loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>验证中...</span>
    </div>

    <!-- 拼图验证区域 -->
    <div v-else class="puzzle-area">
      <!-- 背景和拼图块 -->
      <div 
        ref="containerRef"
        class="puzzle-container"
        :style="{
          background: puzzleData.backgroundImage,
          width: VERIFY_CONFIG.BACKGROUND_SIZE.width + 'px',
          height: VERIFY_CONFIG.BACKGROUND_SIZE.height + 'px'
        }"
      >
        <!-- 拼图块 -->
        <div
          ref="puzzleBlockRef"
          class="puzzle-block"
          :style="{
            left: puzzleData.offsetX + 'px',
            top: puzzleData.offsetY + 'px',
            width: VERIFY_CONFIG.PUZZLE_SIZE.width + 'px',
            height: VERIFY_CONFIG.PUZZLE_SIZE.height + 'px',
            background: puzzleData.puzzleImage,
            border: '2px solid rgba(255, 255, 255, 0.5)'
          }"
        />

        <!-- 用户拖动的拼图块（跟随鼠标） -->
        <div
          class="puzzle-block-dragging"
          :style="{
            left: userOffsetX + 'px',
            top: puzzleData.offsetY + 'px',
            width: VERIFY_CONFIG.PUZZLE_SIZE.width + 'px',
            height: VERIFY_CONFIG.PUZZLE_SIZE.height + 'px',
            background: puzzleData.puzzleImage,
            border: '2px solid rgba(255, 255, 255, 0.8)',
            opacity: isDragging ? 0.8 : 0.5,
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
          @mousedown="handleMouseDown"
        />
      </div>

      <!-- 滑块区域 -->
      <div class="slider-area">
        <div 
          class="slider-track"
          :style="{
            width: VERIFY_CONFIG.BACKGROUND_SIZE.width + 'px'
          }"
        >
          <span :class="['slider-text', { 'hide': isDragging || userOffsetX > 0 }]" >
            向右滑动完成拼图
          </span>
          <!-- 滑块 -->
          <div
            ref="sliderRef"
            class="slider-button"
            :style="{
              width: sliderWidth + 'px',
              left: userOffsetX + 'px',
              background: isVerified ? '#67c23a' : (isDragging ? '#667eea' : '#409eff'),
              cursor: isVerified ? 'default' : (isDragging ? 'grabbing' : 'grab')
            }"
            @mousedown="handleMouseDown"
          >
            <span class="slider-icon">→</span>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- 开发模式提示 -->
      <div v-if="isDevMode" class="dev-mode-tip">
        💡 开发模式：验证自动通过
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-verify-container {
  width: 100%;
  margin: 20px 0;
}

/* 验证成功状态 */
.verify-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background-color: #f0f9ff;
  border: 1px solid #b3e5fc;
  border-radius: 4px;
  color: #0277bd;
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: #67c23a;
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
}

.success-text {
  font-weight: 500;
}

/* 加载状态 */
.verify-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
}

.is-loading {
  font-size: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 拼图区域 */
.puzzle-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 300px; /* 与拼图背景宽度一致 */
  margin: 0 auto; /* 在 dialog 中水平居中 */
}

.puzzle-container {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.puzzle-block {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
}

.puzzle-block-dragging {
  position: absolute;
  box-sizing: border-box;
  user-select: none;
  transition: opacity 0.2s ease;
}

/* 滑块区域 */
.slider-area {
  display: flex;
  justify-content: center;
}

.slider-track {
  position: relative;
  height: 40px;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-button {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
  font-weight: 500;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.slider-button.is-dragging {
  transition: none;
}

.slider-button:hover:not(:disabled) {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.slider-text {
  position: absolute;
  width: 100%;
  text-align: center;
  color: #909399;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none; /* 确保文字不影响鼠标事件 */
  transition: opacity 0.2s ease;
}

.slider-text.hide {
  opacity: 0;
}

.slider-icon {
  font-size: 16px;
}

/* 错误提示 */
.error-message {
  padding: 8px 12px;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 12px;
  text-align: center;
}

/* 开发模式提示 */
.dev-mode-tip {
  padding: 8px 12px;
  background-color: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 4px;
  color: #e6a23c;
  font-size: 12px;
  text-align: center;
}
</style>
