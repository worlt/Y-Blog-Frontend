<!--
 * 组件懒加载容器
 * @author Worlt
 * 支持异步组件加载、骨架屏和错误处理
 -->
<template>
  <div 
    ref="containerRef"
    class="lazy-component-container"
    :class="containerClass"
  >
    <!-- 骨架屏 -->
    <div 
      v-if="!isLoaded && !hasError"
      class="lazy-component-skeleton"
      :class="skeletonClass"
    >
      <slot name="skeleton">
        <div class="default-skeleton">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-content"></div>
          <div class="skeleton-line skeleton-content short"></div>
        </div>
      </slot>
    </div>

    <!-- 加载中 -->
    <div 
      v-if="isLoading"
      class="lazy-component-loading"
      :class="loadingClass"
    >
      <slot name="loading">
        <div class="default-loading">
          <div class="loading-spinner"></div>
          <span>组件加载中...</span>
        </div>
      </slot>
    </div>

    <!-- 异步组件 -->
    <component
      v-if="isLoaded && !hasError"
      :is="loadedComponent"
      v-bind="componentProps"
      @error="handleComponentError"
    />

    <!-- 错误状态 -->
    <div 
      v-if="hasError"
      class="lazy-component-error"
      :class="errorClass"
      @click="retry"
    >
      <slot name="error">
        <div class="default-error">
          <div class="error-icon">⚠️</div>
          <div class="error-text">组件加载失败</div>
          <div class="retry-button">点击重试</div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

/**
 * Props 定义
 */
const props = defineProps({
  // 组件加载函数
  componentLoader: {
    type: Function,
    required: true
  },
  // 传递给组件的props
  componentProps: {
    type: Object,
    default: () => ({})
  },
  // 容器类名
  containerClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 骨架屏类名
  skeletonClass: {
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
  // 懒加载根边距
  rootMargin: {
    type: String,
    default: '100px'
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
  // 最大重试次数
  maxRetries: {
    type: Number,
    default: 3
  },
  // 加载延迟（毫秒）
  loadDelay: {
    type: Number,
    default: 0
  }
})

/**
 * Emits 定义
 */
const emit = defineEmits(['load', 'error', 'retry'])

/**
 * 响应式数据
 */
const containerRef = ref(null)
const observer = ref(null)
const isIntersecting = ref(false)
const isLoading = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)
const loadedComponent = ref(null)
const retryCount = ref(0)

/**
 * 计算属性
 */
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

// 加载组件
const loadComponent = async () => {
  if (isLoading.value || isLoaded.value || !shouldLoad.value) return

  isLoading.value = true
  hasError.value = false

  try {
    // 延迟加载（如果设置了延迟）
    if (props.loadDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, props.loadDelay))
    }

    // 加载组件
    const component = await props.componentLoader()
    
    // 处理不同的模块导出格式
    loadedComponent.value = component.default || component
    
    isLoading.value = false
    isLoaded.value = true
    
    emit('load', {
      component: loadedComponent.value,
      retryCount: retryCount.value
    })
  } catch (error) {
    isLoading.value = false
    hasError.value = true
    
    emit('error', {
      error,
      retryCount: retryCount.value
    })
  }
}

// 处理组件内部错误
const handleComponentError = (error) => {
  hasError.value = true
  emit('error', {
    error,
    retryCount: retryCount.value,
    type: 'component-error'
  })
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
  loadedComponent.value = null
  
  emit('retry', {
    retryCount: retryCount.value
  })

  // 延迟重试
  setTimeout(() => {
    loadComponent()
  }, 1000 * retryCount.value)
}

// 重置状态
const reset = () => {
  isLoading.value = false
  isLoaded.value = false
  hasError.value = false
  loadedComponent.value = null
  retryCount.value = 0
}

/**
 * 监听器
 */
watch(() => props.componentLoader, () => {
  reset()
  if (shouldLoad.value) {
    loadComponent()
  }
})

watch(shouldLoad, (newValue) => {
  if (newValue && !isLoaded.value && !hasError.value) {
    loadComponent()
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
  loadComponent
})
</script>

<style scoped>
.lazy-component-container {
  position: relative;
  min-height: 100px;
}

.lazy-component-skeleton,
.lazy-component-loading,
.lazy-component-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 20px;
}

.default-skeleton {
  width: 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-title {
  height: 20px;
  width: 60%;
}

.skeleton-content {
  width: 100%;
}

.skeleton-content.short {
  width: 80%;
  margin-bottom: 0;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.default-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #666;
}

.loading-spinner {
  width: 24px;
  height: 24px;
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
  text-align: center;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.error-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.retry-button {
  font-size: 12px;
  color: #409eff;
  text-decoration: underline;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.default-error:hover .retry-button {
  background-color: #409eff;
  color: white;
  text-decoration: none;
}
</style> 