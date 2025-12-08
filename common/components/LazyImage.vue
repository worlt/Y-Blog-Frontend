<!--
 * 图片懒加载组件
 * @author Worlt
 * 支持图片懒加载、占位符、加载动画和错误处理
 -->
<template>
  <div 
    ref="containerRef"
    class="lazy-image-container"
    :class="containerClass"
    :style="containerStyle"
  >
    <!-- 占位符 -->
    <div 
      v-if="!isLoaded && !hasError"
      class="lazy-image-placeholder"
      :class="placeholderClass"
    >
      <slot name="placeholder">
        <div class="default-placeholder">
          <div class="placeholder-icon">📷</div>
          <div v-if="showLoadingText" class="placeholder-text">加载中...</div>
        </div>
      </slot>
    </div>

    <!-- 加载中动画 -->
    <div 
      v-if="isLoading && !hasError"
      class="lazy-image-loading"
      :class="loadingClass"
    >
      <slot name="loading">
        <div class="default-loading">
          <div class="loading-spinner"></div>
        </div>
      </slot>
    </div>

    <!-- 实际图片 -->
    <img
      v-show="isLoaded && !hasError"
      ref="imageRef"
      :src="currentSrc"
      :alt="alt"
      :class="imageClass"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
      @click="handleClick"
    />

    <!-- 错误占位符 -->
    <div 
      v-if="hasError"
      class="lazy-image-error"
      :class="errorClass"
      @click="retry"
    >
      <slot name="error">
        <div class="default-error">
          <div class="error-icon">❌</div>
          <div class="error-text">加载失败</div>
          <div class="retry-button">点击重试</div>
        </div>
      </slot>
    </div>

    <!-- 图片遮罩 -->
    <div 
      v-if="showMask && isLoaded && !hasError"
      class="lazy-image-mask"
      :class="maskClass"
      @click="handleMaskClick"
    >
      <slot name="mask" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

/**
 * Props 定义
 */
const props = defineProps({
  // 图片源地址
  src: {
    type: String,
    required: true
  },
  // 图片alt属性
  alt: {
    type: String,
    default: ''
  },
  // 占位符图片
  placeholder: {
    type: String,
    default: ''
  },
  // 容器类名
  containerClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 容器样式
  containerStyle: {
    type: Object,
    default: () => ({})
  },
  // 图片类名
  imageClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 图片样式
  imageStyle: {
    type: Object,
    default: () => ({})
  },
  // 占位符类名
  placeholderClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 加载中类名
  loadingClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 错误类名
  errorClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 遮罩类名
  maskClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 是否显示遮罩
  showMask: {
    type: Boolean,
    default: false
  },
  // 是否显示加载文本
  showLoadingText: {
    type: Boolean,
    default: true
  },
  // 懒加载根边距
  rootMargin: {
    type: String,
    default: '50px'
  },
  // 懒加载阈值
  threshold: {
    type: Number,
    default: 0.1
  },
  // 是否立即加载（不使用懒加载）
  eager: {
    type: Boolean,
    default: false
  },
  // 重试次数
  maxRetries: {
    type: Number,
    default: 3
  }
})

/**
 * Emits 定义
 */
const emit = defineEmits(['load', 'error', 'click', 'mask-click', 'retry'])

/**
 * 响应式数据
 */
const containerRef = ref(null)
const imageRef = ref(null)
const observer = ref(null)
const isIntersecting = ref(false)
const isLoading = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)
const retryCount = ref(0)

/**
 * 计算属性
 */
const currentSrc = computed(() => {
  if (hasError.value && props.placeholder) {
    return props.placeholder
  }
  return props.src
})

const shouldLoad = computed(() => {
  return props.eager || isIntersecting.value
})

/**
 * 方法
 */
// 初始化Intersection Observer
const initObserver = () => {
  if (props.eager || !window.IntersectionObserver) {
    isIntersecting.value = true
    return
  }

  observer.value = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        isIntersecting.value = true
        observer.value?.disconnect()
      }
    },
    {
      rootMargin: props.rootMargin,
      threshold: props.threshold
    }
  )

  if (containerRef.value) {
    observer.value.observe(containerRef.value)
  }
}

// 加载图片
const loadImage = () => {
  if (isLoading.value || isLoaded.value || !shouldLoad.value) return

  isLoading.value = true
  hasError.value = false

  // 创建新的图片元素进行预加载
  const img = new Image()
  
  img.onload = () => {
    isLoading.value = false
    isLoaded.value = true
    nextTick(() => {
      emit('load', {
        src: props.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      })
    })
  }

  img.onerror = () => {
    isLoading.value = false
    hasError.value = true
    emit('error', {
      src: props.src,
      retryCount: retryCount.value
    })
  }

  img.src = props.src
}

// 处理图片加载成功
const handleLoad = (event) => {
  // 实际img元素的load事件（备用）
  if (!isLoaded.value) {
    isLoaded.value = true
    emit('load', {
      src: props.src,
      naturalWidth: event.target.naturalWidth,
      naturalHeight: event.target.naturalHeight
    })
  }
}

// 处理图片加载错误
const handleError = (event) => {
  if (!hasError.value) {
    hasError.value = true
    isLoading.value = false
    emit('error', {
      src: props.src,
      retryCount: retryCount.value
    })
  }
}

// 重试加载
const retry = () => {
  if (retryCount.value >= props.maxRetries) {
    return
  }

  retryCount.value++
  isLoaded.value = false
  hasError.value = false
  isLoading.value = false
  
  emit('retry', {
    src: props.src,
    retryCount: retryCount.value
  })

  // 延迟重试
  setTimeout(() => {
    loadImage()
  }, 1000 * retryCount.value)
}

// 处理图片点击
const handleClick = (event) => {
  emit('click', event)
}

// 处理遮罩点击
const handleMaskClick = (event) => {
  emit('mask-click', event)
}

// 重置状态
const reset = () => {
  isLoading.value = false
  isLoaded.value = false
  hasError.value = false
  retryCount.value = 0
}

/**
 * 监听器
 */
watch(() => props.src, (newSrc, oldSrc) => {
  if (newSrc !== oldSrc) {
    reset()
    if (shouldLoad.value) {
      loadImage()
    }
  }
})

watch(shouldLoad, (newValue) => {
  if (newValue && !isLoaded.value && !hasError.value) {
    loadImage()
  }
})

/**
 * 生命周期
 */
onMounted(() => {
  initObserver()
})

onUnmounted(() => {
  observer.value?.disconnect()
})

/**
 * 暴露方法给父组件
 */
defineExpose({
  retry,
  reset,
  loadImage
})
</script>

<style scoped>
.lazy-image-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
}

.lazy-image-placeholder,
.lazy-image-loading,
.lazy-image-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.lazy-image-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image-container:hover .lazy-image-mask {
  opacity: 1;
}

.default-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
}

.placeholder-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.placeholder-text {
  font-size: 12px;
}

.default-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.default-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #f56c6c;
  cursor: pointer;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.error-text {
  font-size: 12px;
  margin-bottom: 4px;
}

.retry-button {
  font-size: 10px;
  color: #409eff;
  text-decoration: underline;
}

.default-error:hover .retry-button {
  color: #66b1ff;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
}
</style> 