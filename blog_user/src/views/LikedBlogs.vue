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

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined';
};

// 像素风纯色背景数组
const pixelColors = [
  '#6C5CE7', '#FF7675', '#00CEC9', '#FDCB6E',
  '#00B894', '#74B9FF', '#A29BFE', '#E17055',
  '#FD79A8', '#55EFC4', '#FFEAA7', '#DDA0DD'
];

// 获取纯色背景
const getRandomGradient = (blogId) => {
  const index = blogId % pixelColors.length;
  return pixelColors[index];
};

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.style.display = 'none';
  const container = event.target.closest('.article-image');
  if (container) {
    container.style.display = 'none';
  }
};

// 去除HTML标签（保留文本内容）
const stripHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

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
    <div class="blog-list-wrapper">
      <div class="liked-blogs-header">
        <h2 class="page-title">我的点赞</h2>
      </div>
      
      <!-- 分割线 -->
      <div class="header-divider"></div>
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
      
      <!-- 博客列表 (New Layout) -->
      <template v-else>
        <div class="article-list">
          <div 
            v-for="blog in likedBlogList" 
            :key="blog.id" 
            class="article-item"
            @click="viewBlog(blog)"
          >
            <div class="article-content">
              <h3 class="article-title">{{ blog.title || '无标题博客' }}</h3>
              <p class="article-summary">{{ stripHtml(blog.content) }}</p>
              
              <div class="article-info">
                <span class="article-author">
                  <el-avatar :size="20" :src="blog.avatar">{{ blog.username?.substring(0, 1) }}</el-avatar>
                  <span style="margin-left: 5px">{{ blog.username || '未知作者' }}</span>
                </span>
                
                <span class="article-date">
                  {{ formatDate(blog.likeTime || blog.createTime) }}
                </span>
                
                <span class="article-count">
                  <Icon :icon="eyeIcon" />
                  {{ getBlogStat(blog, 'views') || 0 }}
                </span>
                
                <!-- Like Button (Highlighted/Active) -->
                <span 
                  class="article-count clickable active-action" 
                  @click.stop="handleCancelLike(blog)"
                  title="取消点赞"
                >
                  <Icon :icon="heartIcon" :class="{ 'loading': cancelingLike === blog.id, 'liked-icon': true }" />
                  {{ getBlogStat(blog, 'likes') || 0 }}
                </span>
                
                <span class="article-count">
                  <Icon :icon="starIcon" />
                  {{ getBlogStat(blog, 'collections') || 0 }}
                </span>

                <span v-if="blog.category || blog.categoryName" class="article-category">
                  {{ blog.category || blog.categoryName }}
                </span>
              </div>
            </div>
            
            <!-- Cover Image -->
            <div class="article-image" v-if="hasValidCover(blog.cover)">
              <img :src="blog.cover" :alt="blog.title" @error="handleImageError">
            </div>
            <!-- Placeholder -->
            <div 
              v-else 
              class="article-image article-placeholder"
              :style="{ background: getRandomGradient(blog.id) }"
            >
              <span class="placeholder-text">#{{ (blog.category || blog.categoryName || '文章').substring(0, 2) }}</span>
            </div>
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
            <el-icon class="is-loading"><loadingIcon /></el-icon>
            <span>加载中...</span>
          </div>
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
  background-color: var(--pixel-bg-primary);
}

.liked-blogs-container {
  flex: 1;
  max-width: 900px;
  padding: 20px;
  margin: 0 auto;
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
  color: var(--pixel-text-primary);
  font-family: 'Pixel', 'Zpix', 'Minecraft', sans-serif;
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

.header-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #e4e7ed, transparent);
  margin: 15px 0;
}

.blog-list-wrapper {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 20px;
  box-shadow: 4px 4px 0 #000;
  border: 2px solid #000;
}

.loading-state, .empty-state {
  padding: 40px 0;
  text-align: center;
}


/* 新版文章列表样式 (复制自首页/Search) */
.article-list {
  display: flex;
  flex-direction: column;
}

.article-item {
  display: flex;
  padding: 20px 0;
  border-bottom: 2px dashed #000;
  cursor: pointer;
  transition: all 0.3s;
  gap: 20px;
}

.article-item:hover {
  background-color: var(--pixel-bg-primary);
  transform: translateX(4px);
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
  color: var(--pixel-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-title:hover {
  color: #409eff;
}

.article-summary {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin: 0 0 10px 0;
  line-height: 1.6;
  /* 多行省略 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.article-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #999;
}

.article-author {
  margin-right: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.article-author:hover {
  color: #409eff;
}

.article-date {
  margin-right: 15px;
}

.article-count {
  margin-right: 15px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-count .iconify {
  font-size: 14px;
  color: #999;
  width: 14px;
  height: 14px;
}

/* 激活状态的操作图标 */
.active-action :deep(.liked-icon) {
  color: #f56c6c !important; /* 红色心形 - 强制覆盖 */
}

.active-action:hover :deep(.liked-icon) {
  color: #f56c6c !important; /* 保持红色 */
  transform: scale(1.1); /* 悬停放大效果 */
}

.article-count.clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.article-count.clickable:hover {
  color: #f56c6c; /* 悬停文字颜色 */
}

.article-image {
  width: 180px;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.article-item:hover .article-image img {
  transform: scale(1.05);
}

.article-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

.article-category {
  background-color: var(--pixel-bg-primary);
  color: var(--pixel-text-primary);
  padding: 2px 8px;
  border-radius: 0;
  border: 1px solid #000;
  box-shadow: 2px 2px 0 #000;
  font-size: 12px;
  margin-left: 10px;
}

.liked-icon.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .article-item {
    flex-direction: column;
  }
  
  .article-image {
    width: 100%;
    height: 160px;
  }
}
</style> 