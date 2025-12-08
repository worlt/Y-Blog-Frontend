/**
 * 前端性能优化工具库
 * @author Worlt
 * 提供防抖、节流、缓存、预加载等性能优化功能
 */

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间
 * @param {boolean} immediate 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }
    
    const callNow = immediate && !timeout
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func.apply(this, args)
  }
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 时间间隔
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 100) {
  let inThrottle
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 内存缓存类
 */
class MemoryCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 默认5分钟过期
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key, value, customTtl = null) {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    const expireTime = Date.now() + (customTtl || this.ttl)
    this.cache.set(key, {
      value,
      expireTime
    })
  }

  get(key) {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() > item.expireTime) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  has(key) {
    return this.get(key) !== null
  }

  delete(key) {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }

  // 清理过期条目
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireTime) {
        this.cache.delete(key)
      }
    }
  }
}

// 全局缓存实例
export const globalCache = new MemoryCache()

/**
 * 带缓存的异步函数包装器
 * @param {Function} asyncFunc 异步函数
 * @param {Object} options 配置选项
 * @returns {Function} 带缓存的函数
 */
export function withCache(asyncFunc, options = {}) {
  const {
    cache = globalCache,
    keyGenerator = (...args) => JSON.stringify(args),
    ttl = null
  } = options

  return async function cachedFunction(...args) {
    const key = keyGenerator(...args)
    
    // 尝试从缓存获取
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    try {
      // 执行原函数
      const result = await asyncFunc.apply(this, args)
      
      // 存入缓存
      cache.set(key, result, ttl)
      
      return result
    } catch (error) {
      // 错误不缓存，直接抛出
      throw error
    }
  }
}

/**
 * 图片预加载
 * @param {string|Array} urls 图片URL或URL数组
 * @returns {Promise} 预加载Promise
 */
export function preloadImages(urls) {
  const urlArray = Array.isArray(urls) ? urls : [urls]
  
  const promises = urlArray.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ url, success: true })
      img.onerror = () => resolve({ url, success: false }) // 不reject，继续其他图片加载
      img.src = url
    })
  })
  
  return Promise.all(promises)
}

/**
 * 组件预加载
 * @param {Function} componentLoader 组件加载函数
 * @returns {Promise} 预加载Promise
 */
export function preloadComponent(componentLoader) {
  return componentLoader()
}

/**
 * 批量预加载组件
 * @param {Array} loaders 组件加载函数数组
 * @returns {Promise} 预加载Promise
 */
export function preloadComponents(loaders) {
  return Promise.allSettled(loaders.map(loader => preloadComponent(loader)))
}

/**
 * 空闲时执行任务
 * @param {Function} callback 回调函数
 * @param {number} timeout 超时时间
 */
export function runWhenIdle(callback, timeout = 5000) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout })
  } else {
    // 降级处理
    setTimeout(callback, 0)
  }
}

/**
 * 批量处理任务
 * @param {Array} items 要处理的项目数组
 * @param {Function} processor 处理函数
 * @param {number} batchSize 批次大小
 * @param {number} delay 批次间延迟
 * @returns {Promise} 处理Promise
 */
export async function batchProcess(items, processor, batchSize = 10, delay = 16) {
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    
    // 如果不是最后一批，等待一段时间
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return results
}

/**
 * 虚拟滚动计算工具
 */
export class VirtualScrollCalculator {
  constructor(containerHeight, itemHeight, bufferSize = 5) {
    this.containerHeight = containerHeight
    this.itemHeight = itemHeight
    this.bufferSize = bufferSize
  }

  // 计算可视区域信息
  getVisibleRange(scrollTop, totalItems) {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
    const startIndex = Math.floor(scrollTop / this.itemHeight)
    
    const bufferedStart = Math.max(0, startIndex - this.bufferSize)
    const bufferedEnd = Math.min(totalItems - 1, startIndex + visibleCount + this.bufferSize)
    
    return {
      startIndex: bufferedStart,
      endIndex: bufferedEnd,
      visibleCount: bufferedEnd - bufferedStart + 1,
      offsetY: bufferedStart * this.itemHeight
    }
  }

  // 更新配置
  updateConfig(containerHeight, itemHeight, bufferSize) {
    this.containerHeight = containerHeight || this.containerHeight
    this.itemHeight = itemHeight || this.itemHeight
    this.bufferSize = bufferSize !== undefined ? bufferSize : this.bufferSize
  }
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map()
    this.measures = new Map()
  }

  // 标记开始时间
  mark(name) {
    const markName = `${name}-start`
    if ('performance' in window) {
      performance.mark(markName)
    }
    this.marks.set(name, Date.now())
  }

  // 测量耗时
  measure(name) {
    const startTime = this.marks.get(name)
    if (!startTime) {
      console.warn(`No mark found for ${name}`)
      return 0
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    this.measures.set(name, duration)
    this.marks.delete(name)

    // 使用Performance API
    if ('performance' in window) {
      const markName = `${name}-start`
      const measureName = `${name}-measure`
      performance.mark(`${name}-end`)
      performance.measure(measureName, markName, `${name}-end`)
      
      // 清理标记
      performance.clearMarks(markName)
      performance.clearMarks(`${name}-end`)
      performance.clearMeasures(measureName)
    }

    return duration
  }

  // 获取所有测量结果
  getAll() {
    return Object.fromEntries(this.measures)
  }

  // 清理所有数据
  clear() {
    this.marks.clear()
    this.measures.clear()
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor()

/**
 * 资源预加载策略
 */
export const ResourcePreloader = {
  // DNS预解析
  dnsPrefetch(domains) {
    const domainArray = Array.isArray(domains) ? domains : [domains]
    
    domainArray.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })
  },

  // 预连接
  preconnect(urls) {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    
    urlArray.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = url
      document.head.appendChild(link)
    })
  },

  // 资源预加载
  preload(resources) {
    const resourceArray = Array.isArray(resources) ? resources : [resources]
    
    resourceArray.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource.href
      link.as = resource.as || 'fetch'
      if (resource.type) link.type = resource.type
      if (resource.crossorigin) link.crossOrigin = resource.crossorigin
      document.head.appendChild(link)
    })
  },

  // 资源预获取
  prefetch(urls) {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    
    urlArray.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
    })
  }
}

/**
 * 自适应加载策略
 */
export function createAdaptiveLoader() {
  // 检测网络状况
  const getConnectionInfo = () => {
    if ('connection' in navigator) {
      const conn = navigator.connection
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      }
    }
    return null
  }

  // 检测设备性能
  const getDeviceInfo = () => {
    return {
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4
    }
  }

  // 获取加载策略
  const getLoadingStrategy = () => {
    const connection = getConnectionInfo()
    const device = getDeviceInfo()

    // 如果用户开启了数据节省模式
    if (connection?.saveData) {
      return 'conservative'
    }

    // 根据网络状况决定策略
    if (connection) {
      if (connection.effectiveType === '4g' && connection.downlink > 5) {
        return 'aggressive' // 激进加载
      } else if (connection.effectiveType === '3g' || connection.downlink < 1.5) {
        return 'conservative' // 保守加载
      }
    }

    // 根据设备性能决定策略
    if (device.hardwareConcurrency < 4 || device.memory < 4) {
      return 'conservative'
    }

    return 'normal' // 默认策略
  }

  return {
    getConnectionInfo,
    getDeviceInfo,
    getLoadingStrategy
  }
}

// 导出默认实例
export const adaptiveLoader = createAdaptiveLoader()

/**
 * 滚动优化工具
 */
export const ScrollOptimizer = {
  // 平滑滚动到指定位置
  smoothScrollTo(element, position, duration = 300) {
    const start = element.scrollTop
    const change = position - start
    const startTime = performance.now()

    const animateScroll = (currentTime) => {
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      
      // 使用缓动函数
      const easeInOutQuad = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress

      element.scrollTop = start + change * easeInOutQuad

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }

    requestAnimationFrame(animateScroll)
  },

  // 创建优化的滚动监听器
  createOptimizedScrollListener(callback, options = {}) {
    const {
      throttleTime = 16,
      usePassive = true
    } = options

    const throttledCallback = throttle(callback, throttleTime)
    const listenerOptions = usePassive ? { passive: true } : false

    return {
      add: (element) => element.addEventListener('scroll', throttledCallback, listenerOptions),
      remove: (element) => element.removeEventListener('scroll', throttledCallback, listenerOptions)
    }
  }
}

export default {
  debounce,
  throttle,
  MemoryCache,
  globalCache,
  withCache,
  preloadImages,
  preloadComponent,
  preloadComponents,
  runWhenIdle,
  batchProcess,
  VirtualScrollCalculator,
  PerformanceMonitor,
  performanceMonitor,
  ResourcePreloader,
  adaptiveLoader,
  ScrollOptimizer
} 