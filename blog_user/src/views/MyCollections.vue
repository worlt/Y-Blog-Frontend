<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, View } from '@element-plus/icons-vue'
import * as blogApi from '@/api/blog.js'

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
</script>

<template>
  <div class="my-collections-page">
    <div class="page-header">
      <h2 class="page-title">我的收藏</h2>
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
    
    <!-- 收藏列表 -->
    <div class="collection-list-container">
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
      
      <!-- 收藏博客列表 -->
      <div v-else class="collection-list">
        <div 
          v-for="blog in collectionList" 
          :key="blog.id || blog.blogId"
          class="collection-item"
        >
          <!-- 博客内容 -->
          <div class="blog-info">
            <h3 class="blog-title" @click="handleView(blog)">
              {{ blog.title }}
            </h3>
            
<!--            <div class="blog-summary">-->
<!--              {{ blog.summary || blog.content?.substring(0, 150) || '暂无摘要' }}-->
<!--            </div>-->
            
            <div class="blog-meta">
              <div class="blog-author">{{ blog.username || blog.author || '未知作者' }}</div>
              <div class="blog-category" v-if="blog.categoryName || blog.category">
                {{ blog.categoryName || blog.category }}
              </div>
              <div class="blog-date">{{ formatDate(blog.createTime || blog.publishTime) }}</div>
              <div class="blog-stats">
                <span class="stat-item">
                  <i class="el-icon-view"></i>
                  {{ getBlogStat(blog, 'views') || getBlogStat(blog, 'viewCount') }}
                </span>
                <span class="stat-item">
                  <i class="el-icon-thumb"></i> 
                  {{ getBlogStat(blog, 'likes') || getBlogStat(blog, 'likeCount') }}
                </span>
                <span class="stat-item">
                  <i class="el-icon-chat-dot-round"></i> 
                  {{ getBlogStat(blog, 'comments') || getBlogStat(blog, 'commentCount') }}
                </span>
              </div>
              <div class="collect-time" v-if="blog.collectTime">
                收藏于 {{ formatDate(blog.collectTime) }}
              </div>
            </div>
          </div>
          
          <!-- 博客操作 -->
          <div class="blog-actions">
<!--            <el-button -->
<!--              :icon="View" -->
<!--              circle-->
<!--              title="阅读"-->
<!--              @click="handleView(blog)"-->
<!--            />-->
            <el-button 
              :icon="Delete" 
              type="danger" 
              circle
              title="取消收藏"
              :loading="cancelingCollection === (blog.id || blog.blogId)"
              @click="handleCancelCollection(blog)"
            />
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
</template>

<style scoped>
.my-collections-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.filter-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.sort-selector {
  display: flex;
  align-items: center;
}

.sort-label {
  margin-right: 8px;
  color: #606266;
  font-size: 14px;
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

.collection-list {
  display: flex;
  flex-direction: column;
}

.collection-item {
  display: flex;
  align-items: flex-start;
  padding: 20px 0;
  border-bottom: 1px solid #f0f2f5;
}

.collection-item:last-child {
  border-bottom: none;
}

.blog-info {
  flex: 1;
  min-width: 0;
  padding-right: 20px;
}

.blog-title {
  font-size: 18px;
  margin: 0 0 12px 0;
  font-weight: 600;
  color: #409eff;
  cursor: pointer;
  transition: color 0.2s;
}

.blog-title:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.blog-summary {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
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
  font-size: 13px;
  color: #909399;
}

.blog-author,
.blog-category,
.blog-date,
.collect-time {
  margin-right: 15px;
}

.blog-stats {
  display: flex;
  margin-right: 15px;
}

.stat-item {
  margin-right: 15px;
  display: flex;
  align-items: center;
}

.stat-item i {
  margin-right: 4px;
}

.collect-time {
  color: #ff9900;
  font-weight: 500;
}

.blog-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .collection-item {
    flex-direction: column;
  }
  
  .blog-info {
    margin-bottom: 15px;
    padding-right: 0;
  }
  
  .blog-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}
</style> 