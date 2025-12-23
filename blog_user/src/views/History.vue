<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="history-container">
    <div class="history-header">
      <h2 class="page-title">浏览历史</h2>
      <el-button 
        v-if="historyList.length > 0" 
        @click="clearHistory" 
        size="small"
        type="danger"
        plain
      >
        清空历史记录
      </el-button>
    </div>

    <!-- 历史列表 -->
    <div class="history-content">
      <!-- 加载中 -->
      <div v-if="loading && historyList.length === 0" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 空状态 -->
      <div v-else-if="historyList.length === 0" class="empty-state">
        <el-empty description="暂无浏览历史">
          <el-button type="primary" @click="router.push('/blogs')">
            去浏览博客
          </el-button>
        </el-empty>
      </div>

      <!-- 历史列表 -->
      <template v-else>
        <div class="blog-list">
          <div 
            v-for="blog in historyList" 
            :key="blog.id"
            class="history-item"
          >
            <div class="blog-content" @click="viewBlog(blog.id)">
              <h3 class="blog-title">{{ blog.title || '无标题博客' }}</h3>
              
              <div class="blog-excerpt">
                {{ blog.content ? blog.content.replace(/<[^>]+>/g, '').substring(0, 120) + '...' : '暂无内容' }}
              </div>
              
              <div class="blog-meta">
                <span class="blog-author">
                  <el-avatar :size="20" :src="blog.avatar">{{ blog.username?.substring(0, 1) }}</el-avatar>
                  {{ blog.username || blog.author || '未知作者' }}
                </span>
                
                <span v-if="blog.categoryName" class="blog-category">
                  {{ blog.categoryName }}
                </span>
                
                <span class="view-time">
                  {{ formatViewTime(blog.viewTime || blog.createTime) }}
                </span>
                
                <div class="blog-stats">
                  <span class="stat-item">
                    <Icon icon="mdi:eye" /> 
                    {{ getBlogStat(blog, 'views') }}
                  </span>
                  <span class="stat-item">
                    <Icon icon="mdi:thumb-up" /> 
                    {{ getBlogStat(blog, 'likes') }}
                  </span>
                  <span class="stat-item">
                    <Icon icon="mdi:bookmark-multiple" /> 
                    {{ getBlogStat(blog, 'collections') }}
                  </span>
                </div>
              </div>
            </div>
            
            <el-button
              class="remove-btn"
              @click.stop="removeFromHistory(blog.id)"
              type="danger"
              text
              title="从历史记录中移除"
              circle
            >
              <Icon icon="mdi:delete" />
            </el-button>
          </div>
        </div>
        
        <!-- 加载更多 -->
        <div v-if="hasMore" class="load-more">
          <el-button 
            v-if="!loading" 
            @click="loadMore" 
            type="primary" 
            text
          >
            加载更多
          </el-button>
          <div v-else class="loading-more">
            <Icon icon="mdi:loading" class="is-loading" />
            <span>加载中...</span>
          </div>
        </div>
        <div v-else class="no-more">
          没有更多历史记录了
        </div>
      </template>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTokenStore } from '@/stores/token.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import * as blogApi from '@/api/blog.js'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'

const router = useRouter()
const tokenStore = useTokenStore()
const historyList = ref([])
const loading = ref(false)
const hasMore = ref(true)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  sortField: 'viewTime',
  sortOrder: 'desc'
})

// 滚动加载控制变量
let scrollTimer = null
let loadCooldown = false

onMounted(() => {
  // 初始加载数据
  loadHistory(true)
  
  // 添加滚动监听
  const scrollElement = document.querySelector('.el-main')
  if (scrollElement) {
    scrollElement.addEventListener('scroll', handleScroll)
  } else {
    window.addEventListener('scroll', handleScroll)
  }
  
  // 检查是否需要加载更多
  setTimeout(checkAndLoadMoreIfNeeded, 500)
})

// 加载历史记录
const loadHistory = async (reset = false, page = null) => {
  if (loadCooldown || loading.value) return
  
  loading.value = true
  
  try {
    const currentPage = reset ? 1 : (page || queryParams.page)
    
    const params = {
      page: currentPage,
      pageSize: queryParams.pageSize,
      sortField: queryParams.sortField,
      sortOrder: queryParams.sortOrder
    }
    
    const result = await blogApi.getViewHistory(params)
    
    if (result.code === 0) {
      // 处理返回结果
      const pageResult = result.data
      const records = Array.isArray(pageResult) ? pageResult : 
                     (pageResult?.records || [])
      const total = pageResult?.total || records.length
      
      // 对数据进行去重处理
      if (records && records.length > 0) {
        // 使用Map去重
        const uniqueRecords = [...new Map(records.map(blog => [blog.id, blog])).values()]
        
        if (reset) {
          historyList.value = uniqueRecords
        } else {
          // 追加数据时过滤掉已有的博客
          const existingIds = new Set(historyList.value.map(blog => blog.id))
          const newRecords = uniqueRecords.filter(blog => !existingIds.has(blog.id))
          historyList.value = [...historyList.value, ...newRecords]
        }
      } else if (reset) {
        historyList.value = []
      }
      
      // 更新页码
      queryParams.page = currentPage
      
      // 判断是否还有更多数据
      const totalPages = Math.ceil(total / queryParams.pageSize)
      hasMore.value = currentPage < totalPages

      // 设置冷却时间
      loadCooldown = true
      setTimeout(() => {
        loadCooldown = false
        // 检查是否需要继续加载
        setTimeout(checkAndLoadMoreIfNeeded, 300)
      }, 300)
    } else {
      ElMessage.error(result.msg || '获取浏览历史失败')
      if (reset) historyList.value = []
      hasMore.value = false
    }
  } catch (error) {
    console.error('获取浏览历史失败:', error)
    ElMessage.error('获取浏览历史失败')
    if (reset) historyList.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 处理滚动加载
const handleScroll = () => {
  if (loading.value || !hasMore.value || scrollTimer || loadCooldown) {
    return
  }

  const container = document.querySelector('.el-main') || document.documentElement
  const scrollTop = container.scrollTop
  const clientHeight = container.clientHeight
  const scrollHeight = container.scrollHeight
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)

  // 当距离底部小于200px时触发加载
  if (distanceFromBottom <= 200) {
    scrollTimer = setTimeout(() => {
      loadMore()
      scrollTimer = null
    }, 300)
  }
}

// 检查是否需要继续加载更多
const checkAndLoadMoreIfNeeded = () => {
  if (!hasMore.value || loading.value || loadCooldown) return
  
  const container = document.querySelector('.el-main') || document.documentElement
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight
  
  if (scrollHeight <= clientHeight && hasMore.value) {
    loadMore()
  }
}

// 加载更多数据
const loadMore = () => {
  if (!hasMore.value || loading.value || loadCooldown) return
  
  const nextPage = queryParams.page + 1
  loadHistory(false, nextPage)
}

// 查看博客详情（新标签页打开，保留历史列表浏览位置）
const viewBlog = (blogId) => {
  window.open(`/blog/${blogId}`, '_blank')
}

// 从历史记录中移除
const removeFromHistory = (blogId) => {
  try {
    historyList.value = historyList.value.filter(blog => blog.id !== blogId)
    ElMessage.success('已从历史记录中移除')
    
    // TODO: 如果后端支持删除单个历史记录接口，可在此调用
    // await blogApi.removeFromHistory(blogId)
  } catch (error) {
    console.error('移除历史记录失败:', error)
    ElMessage.error('移除历史记录失败')
  }
}

// 清空历史记录
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有浏览历史吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    historyList.value = []
    ElMessage.success('历史记录已清空')
    
    // TODO: 如果后端支持清空历史记录接口，可在此调用
    // await blogApi.clearHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空历史记录失败:', error)
      ElMessage.error('清空历史记录失败')
    }
  }
}

// 格式化浏览时间
const formatViewTime = (viewTime) => {
  if (!viewTime) return '未知时间';
  
  try {
    const now = new Date()
    const viewDate = new Date(viewTime)
    
    // 检查日期是否有效
    if (isNaN(viewDate.getTime())) {
      return '未知时间'
    }
    
    const diffInMs = now - viewDate
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
      return '刚刚浏览'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInDays < 7) {
      return `${diffInDays}天前`
    } else {
      return viewDate.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  } catch (e) {
    console.error('格式化浏览时间出错:', e);
    return '未知时间'
  }
}

// 安全获取博客属性
const getBlogStat = (blog, field, defaultValue = 0) => {
  return blog && blog[field] !== undefined ? blog[field] : defaultValue
}

// 组件卸载时清理
onUnmounted(() => {
  const scrollElement = document.querySelector('.el-main')
  if (scrollElement) {
    scrollElement.removeEventListener('scroll', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll)
  }
  
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
})
</script>

<style scoped>
/* 带侧边栏的页面布局 */
.page-with-sidebar {
  display: flex;
  min-height: calc(100vh - 80px);
  background-color: #f5f7fa;
}

.history-container {
  flex: 1;
  max-width: 900px;
  padding: 20px;
  margin: 0 auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.history-content {
  min-height: 300px;
}

.loading-state, .empty-state {
  padding: 40px 0;
  text-align: center;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.history-item {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
}

.blog-content {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.blog-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.blog-excerpt {
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
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
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.blog-author {
  display: flex;
  align-items: center;
  gap: 4px;
}

.blog-category {
  padding: 2px 8px;
  background-color: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;
}

.view-time {
  color: #67c23a;
  font-weight: 500;
}

.blog-stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item svg {
  width: 16px;
  height: 16px;
  color: #909399;
}

.remove-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.remove-btn svg {
  width: 16px;
  height: 16px;
}

.history-item:hover .remove-btn {
  opacity: 1;
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.loading-more {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
}

.loading-more .is-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.no-more {
  text-align: center;
  color: #909399;
  padding: 16px 0;
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .remove-btn {
    opacity: 1;
    position: static;
    margin-left: 8px;
  }
}
</style>