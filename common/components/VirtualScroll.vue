<!--
 * 虚拟滚动组件
 * @author Worlt
 * 支持大量数据的高性能渲染，只渲染可视区域的元素
 -->
<template>
  <div 
    ref="containerRef" 
    class="virtual-scroll-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- 占位容器，用于撑起总高度 -->
    <div 
      class="virtual-scroll-spacer"
      :style="{ height: totalHeight + 'px' }"
    >
      <!-- 可视区域渲染的元素 -->
      <div 
        class="virtual-scroll-content"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="(item, index) in visibleItems"
          :key="getItemKey ? getItemKey(item, startIndex + index) : startIndex + index"
          :ref="el => setItemRef(el, startIndex + index)"
          class="virtual-scroll-item"
          :data-index="startIndex + index"
        >
          <slot 
            :item="item" 
            :index="startIndex + index"
            :isVisible="true"
          />
        </div>
      </div>
    </div>

    <!-- 加载更多指示器 -->
    <div v-if="loading" class="virtual-scroll-loading">
      <slot name="loading">
        <div class="loading-indicator">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      </slot>
    </div>

    <!-- 无更多数据指示器 -->
    <div v-if="!hasMore && items.length > 0" class="virtual-scroll-no-more">
      <slot name="no-more">
        <span>—— 已经到底了 ——</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

/**
 * Props 定义
 */
const props = defineProps({
  // 数据数组
  items: {
    type: Array,
    default: () => []
  },
  // 预估每个元素的高度
  estimatedItemHeight: {
    type: Number,
    default: 100
  },
  // 容器高度
  containerHeight: {
    type: Number,
    default: 400
  },
  // 缓冲区大小（在可视区域外额外渲染的元素数量）
  bufferSize: {
    type: Number,
    default: 5
  },
  // 获取元素唯一key的函数
  getItemKey: {
    type: Function,
    default: null
  },
  // 是否正在加载
  loading: {
    type: Boolean,
    default: false
  },
  // 是否还有更多数据
  hasMore: {
    type: Boolean,
    default: true
  },
  // 触发加载更多的距离
  loadMoreDistance: {
    type: Number,
    default: 200
  }
})

/**
 * Emits 定义
 */
const emit = defineEmits(['load-more', 'scroll'])

/**
 * 响应式数据
 */
const containerRef = ref(null)
const scrollTop = ref(0)
const itemHeights = ref(new Map()) // 存储每个元素的实际高度
const itemRefs = ref(new Map()) // 存储元素的DOM引用

/**
 * 计算属性
 */
// 总高度
const totalHeight = computed(() => {
  if (props.items.length === 0) return 0
  
  let height = 0
  for (let i = 0; i < props.items.length; i++) {
    height += itemHeights.value.get(i) || props.estimatedItemHeight
  }
  return height
})

// 可视区域能容纳的元素数量
const visibleCount = computed(() => {
  return Math.ceil(props.containerHeight / props.estimatedItemHeight) + props.bufferSize * 2
})

// 开始索引
const startIndex = computed(() => {
  let index = 0
  let accumulatedHeight = 0
  
  while (index < props.items.length && accumulatedHeight < scrollTop.value) {
    accumulatedHeight += itemHeights.value.get(index) || props.estimatedItemHeight
    index++
  }
  
  return Math.max(0, index - props.bufferSize)
})

// 结束索引
const endIndex = computed(() => {
  return Math.min(props.items.length - 1, startIndex.value + visibleCount.value)
})

// 可视区域的元素
const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1)
})

// 偏移量
const offsetY = computed(() => {
  let offset = 0
  for (let i = 0; i < startIndex.value; i++) {
    offset += itemHeights.value.get(i) || props.estimatedItemHeight
  }
  return offset
})

/**
 * 方法
 */
// 设置元素引用
const setItemRef = (el, index) => {
  if (el) {
    itemRefs.value.set(index, el)
    // 测量元素高度
    nextTick(() => {
      measureItemHeight(index)
    })
  }
}

// 测量元素高度
const measureItemHeight = (index) => {
  const el = itemRefs.value.get(index)
  if (el) {
    const height = el.offsetHeight
    if (height > 0 && height !== itemHeights.value.get(index)) {
      itemHeights.value.set(index, height)
    }
  }
}

// 处理滚动事件
const handleScroll = (event) => {
  const container = event.target
  scrollTop.value = container.scrollTop
  
  // 检查是否需要加载更多
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  const distanceFromBottom = scrollHeight - (scrollTop.value + clientHeight)
  
  if (distanceFromBottom <= props.loadMoreDistance && props.hasMore && !props.loading) {
    emit('load-more')
  }
  
  emit('scroll', {
    scrollTop: scrollTop.value,
    startIndex: startIndex.value,
    endIndex: endIndex.value
  })
}

// 滚动到指定索引
const scrollToIndex = (index) => {
  if (!containerRef.value) return
  
  let offset = 0
  for (let i = 0; i < index; i++) {
    offset += itemHeights.value.get(i) || props.estimatedItemHeight
  }
  
  containerRef.value.scrollTop = offset
}

// 滚动到顶部
const scrollToTop = () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0
  }
}

// 刷新高度缓存
const refreshHeights = () => {
  itemHeights.value.clear()
  nextTick(() => {
    // 重新测量所有可见元素的高度
    itemRefs.value.forEach((el, index) => {
      measureItemHeight(index)
    })
  })
}

/**
 * 监听器
 */
watch(() => props.items.length, (newLength, oldLength) => {
  // 如果数据长度变化，清理不再需要的高度缓存
  if (newLength < oldLength) {
    for (let i = newLength; i < oldLength; i++) {
      itemHeights.value.delete(i)
      itemRefs.value.delete(i)
    }
  }
})

/**
 * 生命周期
 */
onMounted(() => {
  // 初始化时测量可见元素的高度
  nextTick(() => {
    refreshHeights()
  })
})

onUnmounted(() => {
  itemHeights.value.clear()
  itemRefs.value.clear()
})

/**
 * 暴露方法给父组件
 */
defineExpose({
  scrollToIndex,
  scrollToTop,
  refreshHeights,
  containerRef
})
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  position: relative;
}

.virtual-scroll-spacer {
  position: relative;
}

.virtual-scroll-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-scroll-item {
  /* 由父组件定义具体样式 */
}

.virtual-scroll-loading,
.virtual-scroll-no-more {
  padding: 20px;
  text-align: center;
  color: #666;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
</style> 