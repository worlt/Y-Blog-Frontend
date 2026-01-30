<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { StarFilled } from '@element-plus/icons-vue'
import * as blogApi from '@/api/blog.js'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'
import { Icon } from '@iconify/vue'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'

const router = useRouter()

// 收藏博客列表
const collectionList = ref([])

// 排序选项 - 注意：后端可能不支持这些排序，需要确认
const sortOptions = [
  { label: '最近收藏', value: 'collectTime,desc' },
  { label: '最新博客', value: 'createTime,desc' },
  { label: '最多浏览', value: 'viewCount,desc' }
]

// 当前排序
const currentSort = ref(sortOptions[0].value)

// 分页参数 - 注意：后端getCollections返回List，不支持分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 加载状态
const loading = ref(false)

// 取消收藏状态
const cancelingCollection = ref(null)

onMounted(() => {
  loadMyCollections()
})

// 加载我的收藏
const loadMyCollections = async () => {
  loading.value = true
  try {
    // 使用正确的API调用
    const result = await blogApi.getMyCollections()
    
    if (result.code === 0 && result.data) {
      // 后端返回 PageResult 对象，包含 total 和 records 字段
      // 从 records 中获取收藏列表数组
      const collections = result.data.records || result.data || []
      
      // 如果后端返回的是 PageResult，使用后端分页；否则使用客户端分页
      if (result.data.total !== undefined && result.data.records) {
        // 后端已分页，直接使用后端返回的数据
        pagination.total = result.data.total
        collectionList.value = result.data.records
        return // 提前返回，不需要客户端排序和分页
      }
      
      // 兼容后端返回 List 的情况：客户端排序和分页
      let sortedCollections = [...collections]
      
      // 根据当前排序进行排序
      const [sortField, sortOrder] = currentSort.value.split(',')
      sortedCollections.sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]
        
        // 处理时间字段
        if (sortField.includes('Time') || sortField.includes('Date')) {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }
        
        if (sortOrder === 'desc') {
          return bValue - aValue
        } else {
          return aValue - bValue
        }
      })
      
      // 客户端分页
      pagination.total = sortedCollections.length
      const startIndex = (pagination.currentPage - 1) * pagination.pageSize
      const endIndex = startIndex + pagination.pageSize
      collectionList.value = sortedCollections.slice(startIndex, endIndex)
      
    } else {
      ElMessage.error('获取收藏列表失败')
      collectionList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    ElMessage.error('获取收藏列表失败')
    collectionList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 处理排序变化
const handleSortChange = () => {
  pagination.currentPage = 1 // 重置到第一页
  loadMyCollections()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.currentPage = page
  loadMyCollections()
}

// 取消收藏
const handleCancelCollection = async (blog) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消收藏"${blog.title}"吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    cancelingCollection.value = blog.id
    
    // 使用正确的博客ID字段
    const blogId = blog.blogId || blog.id
    const result = await blogApi.collectBlog(blogId)
    
    if (result.code === 0) {
      ElMessage.success('已取消收藏')
      loadMyCollections() // 重新加载列表
    } else {
      ElMessage.error(result.msg || '取消收藏失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消收藏失败:', error)
      ElMessage.error('取消收藏失败')
    }
  } finally {
    cancelingCollection.value = null
  }
}

// 查看博客（新标签页打开，保留收藏列表浏览位置）
const handleView = (blog) => {
  // 使用正确的博客ID字段
  const blogId = blog.blogId || blog.id
  window.open(`/blog/${blogId}`, '_blank')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit'
  })
}

// 获取博客统计信息的安全方法
const getBlogStat = (blog, field, defaultValue = 0) => {
  return blog[field] || defaultValue
}

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined';
};

// 随机渐变背景数组
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8eb12 0%, #58c322 100%)',
  'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',
  'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)',
  'linear-gradient(135deg, #08aeea 0%, #2af598 100%)',
  'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'
];

// 获取渐变背景
const getRandomGradient = (blogId) => {
  const index = (blogId || 0) % gradients.length;
  return gradients[index];
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
</script>

<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="my-collections-page">
    <!-- 收藏列表容器 -->
    <div class="collection-list-container">
      <!-- 页面头部：标题和筛选工具栏在同一行 -->
      <div class="page-header">
        <h2 class="page-title">我的收藏</h2>
        
        <!-- 右侧排序选择（横排布局） -->
        <div class="sort-selector">
          <span class="sort-label">排序:</span>
          <el-select 
            v-model="currentSort"
            size="default"
            style="width: 180px;"
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
      
      <!-- 分割线 -->
      <div class="header-divider"></div>
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <!-- 空列表 -->
      <div v-else-if="collectionList.length === 0" class="empty-container">
        <el-empty description="暂无收藏的博客">
          <el-button type="primary" @click="router.push('/blogs')">浏览博客</el-button>
        </el-empty>
      </div>
      
      <!-- 收藏博客列表 (New Layout) -->
      <div v-else class="article-list">
        <div 
          v-for="blog in collectionList" 
          :key="blog.id || blog.blogId"
          class="article-item"
          @click="handleView(blog)"
        >
          <div class="article-content">
            <h3 class="article-title">{{ blog.title }}</h3>
            
            <p class="article-summary">{{ stripHtml(blog.summary || blog.content) }}</p>
            
            <div class="article-info">
              <span class="article-author">
                <el-avatar :size="20" :src="blog.avatar">{{ (blog.username || blog.author || '未知').substring(0, 1) }}</el-avatar>
                <span style="margin-left: 5px">{{ blog.username || blog.author || '未知作者' }}</span>
              </span>

              <span class="article-category" v-if="blog.categoryName || blog.category">
                {{ blog.categoryName || blog.category }}
              </span>

              <span class="article-date">{{ formatDate(blog.createTime || blog.publishTime) }}</span>
              
              <span class="article-count">
                <Icon :icon="eyeIcon" />
                {{ getBlogStat(blog, 'views') || getBlogStat(blog, 'viewCount') || 0 }}
              </span>
              <span class="article-count">
                <Icon :icon="heartIcon" />
                {{ getBlogStat(blog, 'likes') || getBlogStat(blog, 'likeCount') || 0 }}
              </span>
              
              <!-- Collection Button (Highlighted/Active) -->
              <span 
                class="article-count clickable active-action" 
                @click.stop="handleCancelCollection(blog)"
                title="取消收藏"
              >
                <Icon :icon="starIcon" :class="{ 'loading': cancelingCollection === (blog.id || blog.blogId), 'collected-icon': true }" />
                {{ getBlogStat(blog, 'collections') || getBlogStat(blog, 'collectionCount') || 0 }}
              </span>

              <div class="collect-time" v-if="blog.collectTime">
                收藏于 {{ formatDate(blog.collectTime) }}
              </div>
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
            :style="{ background: getRandomGradient(blog.id || blog.blogId) }"
          >
            <span class="placeholder-text">#{{ (blog.categoryName || blog.category || '文章').substring(0, 2) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-container" v-if="pagination.total > pagination.pageSize">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          :current-page="pagination.currentPage"
          @current-change="handlePageChange"
        />
      </div>
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

.my-collections-page {
  flex: 1;
  max-width: 1000px;
  padding: 20px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.page-title {
  font-size: 22px;
  margin: 0;
  font-weight: 600;
  color: #303133;
}

.sort-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.sort-label {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.header-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #e4e7ed, transparent);
  margin: 15px 0;
}

.collection-list-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.loading-container,
.empty-container {
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

.article-title:hover {
  color: #409eff;
}

.article-summary {
  font-size: 14px;
  color: #666;
  margin: 0 0 10px 0;
  line-height: 24px;
  height: 48px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  text-overflow: ellipsis;
  word-break: break-all;
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

/* 激活状态的操作图标（收藏） */
.active-action :deep(.collected-icon) {
  color: #f56c6c !important; /* 红色星形 */
}

.active-action:hover :deep(.collected-icon) {
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
  background-color: #f0f0f0;
  color: #666;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-right: 15px;
}

.collect-time {
  color: #909399;
  font-size: 12px;
  margin-left: auto; /* Push to right if space permits */
}

.collected-icon.loading {
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