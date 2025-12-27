<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { getCollections } from '@/api/blog.js'
import { useTokenStore } from '@/stores/token.js'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import router from '@/router/index.js'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'
import loadingIcon from '@iconify/icons-mdi/loading'

// Token store
const tokenStore = useTokenStore()

// 收藏列表数据
const collectedBlogs = ref([])
const loading = ref(false)

// 是否还有更多数据
const hasMore = ref(true)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10
})

// 滚动加载定时器，防止多次触发
let scrollTimer = null
// 防止连续加载的冷却期
let loadCooldown = false

// 获取收藏博客列表
const fetchCollections = async (reset = false, isLoadMore = false) => {
  // 如果处于冷却期或者正在加载，直接返回
  if (loadCooldown || loading.value) return

  loading.value = true
  
  try {
    let currentPage
    if (isLoadMore) {
      currentPage = queryParams.page + 1
    } else if (reset) {
      currentPage = 1
      queryParams.page = 1
    } else {
      currentPage = queryParams.page
    }

    const params = {
      ...queryParams,
      page: currentPage
    }

    const result = await getCollections(params)
    
    if (result.code === 0) {
      // 检查返回数据结构
      console.log('收藏博客返回数据:', result.data)
      
      // 处理不同的返回数据结构情况
      let records, total
      
      if (Array.isArray(result.data)) {
        // 如果直接返回数组，则使用数组作为记录
        records = result.data
        total = records.length
      } else if (result.data && typeof result.data === 'object') {
        // 如果返回分页对象，则从中提取records和total
        records = result.data.records || []
        total = result.data.total || records.length
      } else {
        // 默认为空数组
        records = []
        total = 0
      }
      
      if (reset || !isLoadMore) {
        collectedBlogs.value = records
        queryParams.page = 1
      } else if (records && records.length > 0) {
        collectedBlogs.value = [...collectedBlogs.value, ...records]
      }
      
      queryParams.page = currentPage
      
      // 判断是否还有更多数据
      if (total !== undefined) {
        const totalPages = Math.ceil(total / queryParams.pageSize)
        hasMore.value = queryParams.page < totalPages
      } else {
        hasMore.value = records && records.length === queryParams.pageSize
      }
      
      // 设置加载冷却期，防止连续加载
      loadCooldown = true
      setTimeout(() => {
        loadCooldown = false
        
        // 检查是否需要继续加载（如果内容不足以填满容器）
        setTimeout(() => {
          checkAndLoadMoreIfNeeded()
        }, 300)
      }, 500)
    } else {
      ElMessage.error(result.msg || '获取收藏博客列表失败')
      collectedBlogs.value = []
      hasMore.value = false
    }
  } catch (error) {
    console.error('获取收藏博客列表失败', error)
    ElMessage.error('获取收藏博客列表失败')
    collectedBlogs.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 检查是否需要继续加载更多
const checkAndLoadMoreIfNeeded = () => {
  // 如果数据已经加载完，或者正在加载，则不执行
  if (!hasMore.value || loading.value || loadCooldown) return
  
  // 获取滚动容器
  const container = document.querySelector('.el-main') || document.documentElement
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  
  // 如果内容不足以产生滚动，并且还有更多数据可以加载，则继续加载
  if (scrollHeight <= clientHeight && hasMore.value) {
    loadMore()
  }
}

// 滚动加载处理函数
const lazyLoad = () => {
  if (loading.value || !hasMore.value || scrollTimer || loadCooldown) {
    return
  }

  // 获取正确的滚动容器 - 优先使用el-main元素，退化使用document
  const container = document.querySelector('.el-main') || document.documentElement
  const scrollTop = container.scrollTop
  const clientHeight = container.clientHeight
  const scrollHeight = container.scrollHeight

  // 计算距离底部的距离
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)

  // 当距离底部小于200px时触发加载
  if (distanceFromBottom <= 200) {
    scrollTimer = setTimeout(() => {
      loadMore()
      scrollTimer = null
    }, 300) // 增加防抖延迟时间
  }
}

// 加载更多数据
const loadMore = () => {
  if (!hasMore.value || loading.value || loadCooldown) {
    return
  }

  fetchCollections(false, true)
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return 'Invalid Date'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('zh-CN')
}

// 跳转到博客详情（新标签页打开，保留收藏列表浏览位置）
const goToBlogDetail = (blogId) => {
  window.open(`/blog/${blogId}`, '_blank')
}

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined'
}

// 随机渐变背景数组（多色系协调配色）
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // 紫色
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',  // 粉红
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',  // 天蓝
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',  // 青绿
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',  // 橙粉
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',  // 青紫
  'linear-gradient(135deg, #a8eb12 0%, #58c322 100%)',  // 草绿
  'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',  // 橙红
  'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)',  // 蓝紫
  'linear-gradient(135deg, #08aeea 0%, #2af598 100%)',  // 蓝绿
  'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',  // 橙黄
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'   // 紫粉
]

// 根据博客ID获取固定的渐变背景
const getRandomGradient = (blogId) => {
  const index = blogId % gradients.length
  return gradients[index]
}

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.style.display = 'none'
  const imageContainer = event.target.closest('.article-image')
  if (imageContainer) {
    imageContainer.style.display = 'none'
  }
}

onMounted(async () => {
  // 检查登录状态
  if (!tokenStore.token) {
    ElMessage.warning('请先登录')
    router.push('/auth')
    return
  }
  
  // 初始加载数据
  await fetchCollections(true)
  
  // 找到正确的滚动容器并添加事件监听
  const scrollElement = document.querySelector('.el-main')
  if (scrollElement) {
    scrollElement.addEventListener('scroll', lazyLoad)
  } else {
    window.addEventListener('scroll', lazyLoad)
  }
  
  setTimeout(() => {
    // 检查是否需要加载更多
    checkAndLoadMoreIfNeeded()
  }, 1000)
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除正确容器上的事件监听
  const scrollElement = document.querySelector('.el-main')
  if (scrollElement) {
    scrollElement.removeEventListener('scroll', lazyLoad)
  } else {
    window.removeEventListener('scroll', lazyLoad)
  }
  
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
})
</script>

<template>
  <div class="collections-page">
    <h1 class="page-title">我的收藏</h1>
    
    <div class="content-container">
      <!-- 加载中状态 -->
      <div v-if="loading && collectedBlogs.length === 0" class="loading-state">
        <div class="loading-indicator">
          <Icon :icon="loadingIcon" class="loading-spinner" />
          <span>加载中...</span>
        </div>
      </div>
      
      <!-- 没有收藏博客时的空状态 -->
      <div v-else-if="collectedBlogs.length === 0" class="empty-state">
        <el-empty description="你还没有收藏任何博客">
          <el-button type="primary" @click="router.push('/index')">去浏览文章</el-button>
        </el-empty>
      </div>
      
      <div v-else class="blog-list-container">
        <!-- 博客列表 -->
        <div class="article-list">
          <div 
            v-for="blog in collectedBlogs" 
            :key="blog.id"
            class="article-item"
            @click="goToBlogDetail(blog.id)"
          >
            <div class="article-content">
              <h3 class="article-title">{{ blog.title }}</h3>
              <p class="article-summary">{{ blog.content }}</p>
              <div class="article-info">
                <span class="article-author">{{ blog.username }}</span>
                <span class="article-date">{{ formatDate(blog.collectTime || blog.createTime) }}</span>
                <span class="article-count">
                  <Icon :icon="eyeIcon" />
                  {{ blog.views || 0 }}
                </span>
                <span class="article-count">
                  <Icon :icon="heartIcon" />
                  {{ blog.likes || 0 }}
                </span>
                <span class="article-count active">
                  <Icon :icon="starIcon" />
                  {{ blog.collections || 0 }}
                </span>
                <span class="article-category">{{ blog.categoryName }}</span>
              </div>
            </div>
            
            <!-- 文章配图 -->
            <div class="article-image" v-if="hasValidCover(blog.cover)">
              <img :src="blog.cover" :alt="blog.title" @error="handleImageError">
            </div>
            <!-- 无封面时显示分类标签渐变背景 -->
            <div 
              v-else 
              class="article-image article-placeholder"
              :style="{ background: getRandomGradient(blog.id) }"
            >
              <span class="placeholder-text">#{{ blog.categoryName || '文章' }}</span>
            </div>
          </div>
        </div>
        
        <!-- 加载更多 -->
        <div v-if="hasMore" class="load-more-container">
          <el-button 
            v-if="!loading" 
            @click="loadMore" 
            type="primary" 
            text
          >
            加载更多
          </el-button>
          <div v-else class="loading-more">
            <Icon :icon="loadingIcon" height="24" class="loading-icon" />
            <span>加载中...</span>
          </div>
        </div>
        <div v-else-if="collectedBlogs.length > 0" class="no-more-data">
          没有更多数据了
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collections-page {
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
  position: relative;
  padding-left: 15px;
}

.page-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background-color: #409eff;
  border-radius: 2px;
}

.content-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  min-height: 600px;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  text-align: center;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.loading-spinner {
  animation: spin 1s linear infinite;
  font-size: 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.blog-list-container {
  min-height: 200px;
}

.article-list {
  margin-bottom: 20px;
}

.article-item {
  display: flex;
  padding: 20px 0;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  transition: all 0.3s;
  gap: 20px;
}

.article-item:hover {
  background-color: #f9fafc;
}

.article-item:last-child {
  border-bottom: none;
}

.article-content {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 18px;
  margin: 0 0 10px 0;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-summary {
  font-size: 14px;
  color: #666;
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.article-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #999;
  flex-wrap: wrap;
}

.article-author {
  margin-right: 15px;
}

.article-date {
  margin-right: 15px;
}

.article-count {
  margin-right: 15px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.article-count.active {
  color: #ff9900;
}

.article-category {
  padding: 2px 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.article-image {
  width: 160px;
  height: 100px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 文章封面占位图样式 */
.article-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

.load-more-container {
  text-align: center;
  margin-top: 20px;
  padding: 10px 0;
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #909399;
}

.no-more-data {
  text-align: center;
  color: #909399;
  margin-top: 20px;
  padding: 10px 0;
}
</style> 