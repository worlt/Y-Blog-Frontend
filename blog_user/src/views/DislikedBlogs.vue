<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, ThumbsDown } from '@element-plus/icons-vue'
import * as blogApi from '@/api/blog.js'

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

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 加载状态
const loading = ref(false)

// 取消点踩状态
const cancelingDislike = ref(null)

onMounted(() => {
  loadDislikedBlogs()
})

// 加载我点踩的博客
const loadDislikedBlogs = async () => {
  loading.value = true
  try {
    const result = await blogApi.getDislikedBlogs()
    
    if (result.code === 0 && result.data) {
      const blogs = result.data || []
      
      // 客户端排序和分页
      let sortedBlogs = [...blogs]
      
      // 根据当前排序进行排序
      const [sortField, sortOrder] = currentSort.value.split(',')
      sortedBlogs.sort((a, b) => {
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
      pagination.total = sortedBlogs.length
      const startIndex = (pagination.currentPage - 1) * pagination.pageSize
      const endIndex = startIndex + pagination.pageSize
      dislikedBlogList.value = sortedBlogs.slice(startIndex, endIndex)
      
    } else {
      ElMessage.error('获取点踩博客列表失败')
      dislikedBlogList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取点踩博客列表失败:', error)
    ElMessage.error('获取点踩博客列表失败')
    dislikedBlogList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 处理排序变化
const handleSortChange = () => {
  pagination.currentPage = 1 // 重置到第一页
  loadDislikedBlogs()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.currentPage = page
  loadDislikedBlogs()
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
      loadDislikedBlogs() // 重新加载列表
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
      <div v-if="loading" class="loading-container">
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
              {{ blog.title }}
            </h3>
            
            <div class="blog-summary">
              {{ blog.content?.substring(0, 150) || '暂无摘要' }}
            </div>
            
            <div class="blog-meta">
              <div class="blog-author">{{ blog.username || '未知作者' }}</div>
              <div class="blog-category" v-if="blog.category">
                {{ blog.category }}
              </div>
              <div class="blog-date">{{ formatDate(blog.createTime || blog.publishTime) }}</div>
              <div class="blog-stats">
                <span class="stat-item">
                  <i class="el-icon-view"></i> 
                  {{ getBlogStat(blog, 'views') }}
                </span>
                <span class="stat-item">
                  <i class="el-icon-thumb"></i> 
                  {{ getBlogStat(blog, 'likes') }}
                </span>
                <span class="stat-item">
                  <i class="el-icon-chat-dot-round"></i> 
                  {{ getBlogStat(blog, 'comments') }}
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
      
      <!-- 分页 -->
      <div class="pagination-container" v-if="!loading && pagination.total > 0">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="pagination.currentPage"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
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

.pagination-container {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}
</style> 