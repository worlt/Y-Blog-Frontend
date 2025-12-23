<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {View, Collection, StarFilled} from '@element-plus/icons-vue'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import * as blogApi from '@/api/blog.js'
import { Icon } from '@iconify/vue'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'
import loadingIcon from '@iconify/icons-mdi/loading'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'

const router = useRouter()
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 点赞博客列表
const likedBlogList = ref([])

// 排序选项
const sortOptions = [
  { label: '最近点赞', value: 'likeTime,desc' },
  { label: '最新博客', value: 'createTime,desc' },
  { label: '最多浏览', value: 'views,desc' }
]

// 当前排序
const currentSort = ref(sortOptions[0].value)

// 加载状态
const loading = ref(false)

// 取消点赞状态
const cancelingLike = ref(null)

// 是否还有更多数据
const hasMore = ref(true)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10
})

// 滚动加载控制变量
let scrollTimer = null
let loadCooldown = false

// 监听排序变化自动重新加载
watch(() => currentSort.value, () => {
  fetchLikedBlogs(true)
})

onMounted(() => {
  // 初始加载数据
  fetchLikedBlogs(true)
  
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
  fetchLikedBlogs(false, nextPage)
}

// 获取点赞博客列表
const fetchLikedBlogs = async (reset = false, page = null) => {
  if (loadCooldown || loading.value) return

  loading.value = true

  try {
    const currentPage = reset ? 1 : (page || queryParams.page)
    
    // 解析排序字段和排序方式
    const [sortField, sortOrder] = currentSort.value.split(',')
    
    const params = {
      page: currentPage,
      pageSize: queryParams.pageSize,
      sortField,
      sortOrder
    }

    const result = await blogApi.getLikedBlogs(params)

    if (result.code === 0) {
      // 处理返回结果
      const pageResult = result.data
      const records = Array.isArray(pageResult) ? pageResult : 
                     (pageResult?.records || [])
      const total = pageResult?.total || records.length
      
      // 对数据进行去重处理
      if (records && records.length > 0) {
        // 使用Set去重
        const uniqueRecords = [...new Map(records.map(blog => [blog.id, blog])).values()]
        
        if (reset) {
          likedBlogList.value = uniqueRecords
        } else {
          // 追加数据时过滤掉已有的博客
          const existingIds = new Set(likedBlogList.value.map(blog => blog.id))
          const newRecords = uniqueRecords.filter(blog => !existingIds.has(blog.id))
          likedBlogList.value = [...likedBlogList.value, ...newRecords]
        }
      } else if (reset) {
        likedBlogList.value = []
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
        checkAndLoadMoreIfNeeded()
      }, 300)
    } else {
      ElMessage.error(result.msg || '获取点赞博客列表失败')
      if (reset) likedBlogList.value = []
      hasMore.value = false
    }
  } catch (error) {
    console.error('获取点赞博客列表失败:', error)
    ElMessage.error('获取点赞博客列表失败')
    if (reset) likedBlogList.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// 取消点赞
const handleCancelLike = async (blog) => {
  if (!tokenStore.getToken()) {
    ElMessage.warning('请先登录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要取消点赞"${blog.title || '该博客'}"吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    cancelingLike.value = blog.id
    
    const result = await blogApi.likeBlog(blog.id)
    
    if (result.code === 0) {
      ElMessage.success('已取消点赞')
      // 从列表中移除该博客
      likedBlogList.value = likedBlogList.value.filter(item => item.id !== blog.id)
    } else {
      ElMessage.error(result.msg || '取消点赞失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消点赞失败:', error)
      ElMessage.error('取消点赞失败')
    }
  } finally {
    cancelingLike.value = null
  }
}

// 查看博客详情（新标签页打开，保留点赞列表浏览位置）
const viewBlog = (blog) => {
  window.open(`/blog/${blog.id}`, '_blank')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '未知时间'
    
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
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

<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="liked-blogs-container">
    <div class="liked-blogs-header">
      <h2 class="page-title">我的点赞</h2>
      
      <!-- 排序选择器 -->
      <!-- <div class="filter-bar">
        <span class="sort-label">排序方式：</span>
        <el-select 
          v-model="currentSort" 
          size="small" 
          placeholder="选择排序方式"
        >
          <el-option
            v-for="option in sortOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div> -->
    </div>

    <!-- 博客列表 -->
    <div class="blog-list-wrapper">
      <!-- 加载中 -->
      <div v-if="loading && likedBlogList.length === 0" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="likedBlogList.length === 0" class="empty-state">
        <el-empty description="暂无点赞的博客">
          <el-button type="primary" @click="router.push('/blogs')">
            去浏览博客
          </el-button>
        </el-empty>
      </div>
      
      <!-- 博客列表 -->
      <template v-else>
        <div class="blog-list">
          <div 
            v-for="blog in likedBlogList" 
            :key="blog.id" 
            class="blog-card"
          >
            <div class="blog-content" @click="viewBlog(blog)">
              <h3 class="blog-title">{{ blog.title || '无标题博客' }}</h3>
              
              <div class="blog-excerpt">
                {{ blog.content ? blog.content.replace(/<[^>]+>/g, '').substring(0, 120) + '...' : '暂无内容' }}
              </div>
              
              <div class="blog-meta">
                <span class="blog-author">
                  <el-avatar :size="20" :src="blog.avatar">{{ blog.username?.substring(0, 1) }}</el-avatar>
                  {{ blog.username || '未知作者' }}
                </span>
                
                <span v-if="blog.categoryName" class="blog-category">
                  {{ blog.categoryName }}
                </span>
                
                <span class="blog-date">
                  {{ formatDate(blog.likeTime || blog.createTime) }}
                </span>
                
                <div class="blog-stats">
                  <span class="stat-item">
                    <Icon :icon="eyeIcon" />
                    {{ getBlogStat(blog, 'views') || 0 }}
                  </span>
                  <span 
                    class="stat-item liked clickable" 
                    @click.stop="handleCancelLike(blog)"
                    title="取消点赞"
                  >
                    <Icon :icon="heartIcon" :class="{ 'loading': cancelingLike === blog.id }" />
                    {{ getBlogStat(blog, 'likes') || 0 }}
                  </span>
                  <span class="stat-item">
                    <Icon :icon="starIcon" />
                    {{ getBlogStat(blog, 'collections') || 0 }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- <div class="blog-actions">
              <el-button
                type="primary"
                size="small"
                plain
                @click="viewBlog(blog)"
                title="查看博客"
              >
                查看
              </el-button>
              
              <el-button
                type="danger"
                size="small"
                plain
                @click="handleCancelLike(blog)"
                :loading="cancelingLike === blog.id"
                title="取消点赞"
              >
                取消点赞
              </el-button>
            </div> -->
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
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载中...</span>
          </div>
        </div>
        <div v-else class="no-more">
          没有更多数据了
        </div>
      </template>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* 带侧边栏的页面布局 */
.page-with-sidebar {
  display: flex;
  min-height: calc(100vh - 80px);
  background-color: #f5f7fa;
}

.liked-blogs-container {
  flex: 1;
  max-width: 900px;
  padding: 20px;
}

.liked-blogs-header {
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

.filter-bar {
  display: flex;
  align-items: center;
}

.sort-label {
  margin-right: 8px;
  color: #606266;
  font-size: 14px;
}

.blog-list-wrapper {
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

.blog-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.blog-card:hover {
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

.stat-item.liked {
  color: #f56c6c;
}

/* 可点击的统计项 */
.stat-item.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.stat-item.clickable:hover {
  color: #409eff;
  transform: scale(1.1);
}

.stat-item.clickable .loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.blog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
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

.no-more {
  text-align: center;
  color: #909399;
  padding: 16px 0;
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .liked-blogs-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .blog-card {
    flex-direction: column;
  }
  
  .blog-actions {
    flex-direction: row;
    margin-left: 0;
    margin-top: 12px;
    width: 100%;
  }
}
</style> 