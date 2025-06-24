<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, ThumbsDown } from '@element-plus/icons-vue'
import * as blogApi from '@/api/blog.js'
import { Icon } from '@iconify/vue'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'
import loadingIcon from '@iconify/icons-mdi/loading'

const router = useRouter()

// 点踩博客列表
const dislikedBlogList = ref([])

// 排序选项
const sortOptions = [
  { label: '最近点踩', value: 'dislikeTime,desc' },
  { label: '最新博客', value: 'createTime,desc' },
  { label: '最多浏览', value: 'views,desc' }
]

// 当前排序
const currentSort = ref(sortOptions[0].value)

// 加载状态
const loading = ref(false)

// 取消点踩状态
const cancelingDislike = ref(null)

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

onMounted(() => {
  // 初始加载数据
  fetchDislikedBlogs(true)
  
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

// 处理排序变化
const handleSortChange = () => {
  // 重置分页并重新加载
  fetchDislikedBlogs(true)
}

// 取消点踩
const handleCancelDislike = async (blog) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消点踩"${blog.title}"吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    cancelingDislike.value = blog.id
    
    // 调用点踩接口取消点踩
    const result = await blogApi.dislikeBlog(blog.id)
    
    if (result.code === 0) {
      ElMessage.success('已取消点踩')
      fetchDislikedBlogs(true) // 重新加载列表
    } else {
      ElMessage.error(result.msg || '取消点踩失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消点踩失败:', error)
      ElMessage.error('取消点踩失败')
    }
  } finally {
    cancelingDislike.value = null
  }
}

// 查看博客
const handleView = (blog) => {
  router.push(`/blog/${blog.id}`)
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return 'Invalid Date'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  })
}

// 获取博客统计信息的安全方法
const getBlogStat = (blog, field, defaultValue = 0) => {
  return blog && blog[field] !== undefined ? blog[field] : defaultValue
}

// 获取点踩博客列表
const fetchDislikedBlogs = async (reset = false, isLoadMore = false) => {
  // 如果处于冷却期，直接返回
  if (loadCooldown) return

  if (loading.value) return

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

    // 添加排序参数
    const [sortField, sortOrder] = currentSort.value.split(',')
    
    const params = {
      ...queryParams,
      page: currentPage,
      sortField: sortField,
      sortOrder: sortOrder
    }

    const result = await blogApi.getDislikedBlogs(params)

    if (result.code === 0) {
      // 检查返回数据结构
      console.log('点踩博客返回数据:', result.data)
      
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
        dislikedBlogList.value = records
        queryParams.page = 1
      } else if (records && records.length > 0) {
        dislikedBlogList.value = [...dislikedBlogList.value, ...records]
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
      ElMessage.error(result.msg || '获取点踩博客列表失败')
      dislikedBlogList.value = []
      hasMore.value = false
    }
  } catch (error) {
    console.error('获取点踩博客列表失败:', error)
    ElMessage.error('获取点踩博客列表失败')
    dislikedBlogList.value = []
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

  fetchDislikedBlogs(false, true)
}

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
  <div class="disliked-blogs-page">
    <div class="page-header">
      <h2 class="page-title">我的点踩</h2>
    </div>
    
    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <!-- 右侧排序选择 -->
      <div class="sort-selector">
        <span class="sort-label">排序:</span>
        <el-select 
          v-model="currentSort"
          size="small"
          @change="handleSortChange"
        >
          <el-option
            v-for="option in sortOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>
    
    <!-- 点踩博客列表 -->
    <div class="disliked-blog-list-container">
      <!-- 加载中 -->
      <div v-if="loading && dislikedBlogList.length === 0" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <!-- 空列表 -->
      <div v-else-if="dislikedBlogList.length === 0" class="empty-container">
        <el-empty description="暂无点踩的博客">
          <el-button type="primary" @click="router.push('/blogs')">浏览博客</el-button>
        </el-empty>
      </div>
      
      <!-- 点踩博客列表 -->
      <div v-else class="blog-list">
        <div 
          v-for="blog in dislikedBlogList" 
          :key="blog.id"
          class="blog-item"
        >
          <!-- 博客内容 -->
          <div class="blog-info">
            <h3 class="blog-title" @click="handleView(blog)">
              {{ blog.title || '无标题博客' }}
            </h3>
            
            <div class="blog-summary" v-if="blog.content">
              {{ blog.content.substring(0, 150) || '暂无摘要' }}
            </div>
            <div class="blog-summary" v-else>
              暂无摘要
            </div>
            
            <div class="blog-meta">
              <div class="blog-author">{{ blog.username || '未知作者' }}</div>
              <div class="blog-category" v-if="blog.categoryName">
                {{ blog.categoryName }}
              </div>
              <div class="blog-date">{{ formatDate(blog.createTime || blog.publishTime || blog.dislikeTime) }}</div>
              <div class="blog-stats">
                <span class="stat-item">
                  <Icon :icon="eyeIcon" height="16" />
                  {{ getBlogStat(blog, 'views') }}
                </span>
                <span class="stat-item">
                  <Icon :icon="heartIcon" height="16" />
                  {{ getBlogStat(blog, 'likes') }}
                </span>
                <span class="stat-item">
                  <Icon :icon="starIcon" height="16" />
                  {{ getBlogStat(blog, 'collections') }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 博客操作 -->
          <div class="blog-actions">
            <el-button 
              type="primary"
              icon="View"
              size="small"
              @click="handleView(blog)"
              title="查看博客"
              plain
            >
              查看
            </el-button>
            
            <el-button 
              type="danger"
              icon="ThumbsDown"
              size="small"
              @click="handleCancelDislike(blog)"
              :loading="cancelingDislike === blog.id"
              title="取消点踩"
              plain
            >
              取消点踩
            </el-button>
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
      <div v-else-if="dislikedBlogList.length > 0" class="no-more-data">
        没有更多数据了
      </div>
    </div>
  </div>
</template>

<style scoped>
.disliked-blogs-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  color: #333;
  margin: 0;
  font-size: 24px;
}

.filter-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
}

.sort-selector {
  display: flex;
  align-items: center;
}

.sort-label {
  margin-right: 8px;
  color: #666;
}

.disliked-blog-list-container {
  min-height: 400px;
}

.loading-container {
  padding: 20px;
}

.empty-container {
  padding: 60px 0;
  text-align: center;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blog-item {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  transition: box-shadow 0.3s;
}

.blog-item:hover {
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.1);
}

.blog-info {
  flex: 1;
  min-width: 0;
}

.blog-title {
  margin: 0 0 12px;
  font-size: 18px;
  cursor: pointer;
  color: #333;
  transition: color 0.3s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blog-title:hover {
  color: #409eff;
}

.blog-summary {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.blog-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
  color: #999;
  gap: 12px;
}

.blog-category {
  padding: 2px 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.blog-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.blog-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  margin-left: 16px;
}

.load-more-container {
  text-align: center;
  margin-top: 24px;
  padding: 12px 0;
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #909399;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-more-data {
  text-align: center;
  color: #909399;
  margin-top: 24px;
  padding: 12px 0;
}
</style> 