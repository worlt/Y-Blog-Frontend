<script setup>
import { ref, reactive, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as blogApi from '@/api/blog.js'
import * as categoryApi from '@/api/category.js'
import { Icon } from '@iconify/vue'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'

const router = useRouter()
const route = useRoute()

// 搜索关键词
const searchKeyword = ref('')

// 筛选条件
const filters = reactive({
  categoryId: '',     // 分类ID
  username: '',       // 用户名
  sortBy: 'newest'    // 排序方式：newest(最新), views(浏览量), likes(点赞数)
})

// 博客列表
const blogList = ref([])

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 15, // 每页条数
  total: 0
})

// 加载状态
const loading = ref(false)

// 是否还有更多数据
const hasMore = ref(true)

// 分类列表
const categories = ref([
  { id: '', name: '全部分类' }
])

// 排序选项
const sortOptions = [
  { value: 'newest', label: '最新发布' },
  { value: 'views', label: '最多浏览' },
  { value: 'likes', label: '最多点赞' }
]

// 滚动加载定时器，防止多次触发
let scrollTimer = null
// 防止连续加载的冷却期
let loadCooldown = false

// 初始化
onMounted(async () => {
  // 加载分类数据
  await loadCategories()
  
  // 从URL参数中获取搜索条件
  const { keyword, categoryId, username, sortBy, page } = route.query
  
  if (keyword) {
    searchKeyword.value = keyword
  }
  
  if (categoryId) {
    filters.categoryId = parseInt(categoryId) || ''
  }
  
  if (username) {
    filters.username = username
  }
  
  if (sortBy) {
    filters.sortBy = sortBy
  }
  
  if (page) {
    pagination.currentPage = parseInt(page) || 1
  }
  
  // 执行搜索加载初始数据
  await search()
  
  // 找到正确的滚动容器并添加事件监听
  const scrollElement = document.querySelector('.el-main');
  if (scrollElement) {
    scrollElement.addEventListener('scroll', lazyLoad);
  } else {
    window.addEventListener('scroll', lazyLoad);
  }
  
  // 检查是否需要加载更多
  setTimeout(() => {
    checkAndLoadMoreIfNeeded();
  }, 1000);
})

// 组件卸载时清理
onUnmounted(() => {
  // 移除正确容器上的事件监听
  const scrollElement = document.querySelector('.el-main');
  if (scrollElement) {
    scrollElement.removeEventListener('scroll', lazyLoad);
  } else {
    window.removeEventListener('scroll', lazyLoad);
  }
  
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
})

// 滚动加载处理函数
const lazyLoad = () => {
  if (loading.value || !hasMore.value || scrollTimer || loadCooldown) {
    return
  }
  
  // 获取正确的滚动容器 - 优先使用el-main元素，退化使用document
  const container = document.querySelector('.el-main') || document.documentElement;
  const scrollTop = container.scrollTop;
  const clientHeight = container.clientHeight;
  const scrollHeight = container.scrollHeight;
  
  // 计算距离底部的距离
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
  
  // 当距离底部小于200px时触发加载
  if (distanceFromBottom <= 200) {
    scrollTimer = setTimeout(() => {
      loadMore();
      scrollTimer = null;
    }, 300); // 增加防抖延迟时间
  }
}

// 检查是否需要继续加载更多
const checkAndLoadMoreIfNeeded = () => {
  // 如果数据已经加载完，或者正在加载，则不执行
  if (!hasMore.value || loading.value || loadCooldown) return;
  
  // 获取滚动容器
  const container = document.querySelector('.el-main') || document.documentElement;
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;
  
  // 如果内容不足以产生滚动，并且还有更多数据可以加载，则继续加载
  if (scrollHeight <= clientHeight && hasMore.value) {
    loadMore();
  }
};

// 加载分类数据
const loadCategories = async () => {
  try {
    const result = await categoryApi.getAllCategories()
    if (result.code === 0 && result.data) {
      // 添加"全部分类"选项
      categories.value = [
        { id: '', name: '全部分类' },
        ...result.data.map(item => ({
          id: item.id,
          name: item.name
        }))
      ]
    }
  } catch (error) {
    console.error('获取分类失败')
    // 使用默认分类
    categories.value = [
      { id: '', name: '全部分类' },
      { id: 1, name: '前端开发' },
      { id: 2, name: '后端开发' },
      { id: 3, name: '移动开发' },
      { id: 4, name: '数据库' },
      { id: 5, name: '人工智能' },
      { id: 6, name: '运维部署' },
      { id: 7, name: '架构设计' },
      { id: 8, name: '算法与数据结构' }
    ]
  }
}

// 监听路由变化
watch(() => route.query, (newQuery) => {
  const { keyword, categoryId, username, sortBy } = newQuery
  
  let needSearch = false
  
  if (keyword !== undefined && keyword !== searchKeyword.value) {
    searchKeyword.value = keyword || ''
    needSearch = true
  }
  
  if (categoryId !== undefined && parseInt(categoryId) !== filters.categoryId) {
    filters.categoryId = parseInt(categoryId) || ''
    needSearch = true
  }
  
  if (username !== undefined && username !== filters.username) {
    filters.username = username || ''
    needSearch = true
  }
  
  if (sortBy !== undefined && sortBy !== filters.sortBy) {
    filters.sortBy = sortBy || 'newest'
    needSearch = true
  }
  
  if (needSearch) {
    pagination.currentPage = 1
    hasMore.value = true
    search()
  }
}, { deep: true })

// 执行搜索
const search = async (isLoadMore = false) => {
  if (loading.value) return
  
  loading.value = true
  try {
    let currentPage = isLoadMore ? pagination.currentPage + 1 : 1
    
    const params = {
      page: currentPage,
      pageSize: pagination.pageSize
    }
    
    // 添加搜索关键词
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    
    // 添加分类
    if (filters.categoryId) {
      params.categoryId = filters.categoryId
    }
    
    // 添加用户名
    if (filters.username) {
      params.username = filters.username
    }
    
    // 添加排序方式
    if (filters.sortBy) {
      params.sortBy = filters.sortBy
    }
    
    const result = await blogApi.searchBlogs(params)
    
    if (result.code === 0 && result.data) {
      const newData = result.data.records || []
      const totalPages = Math.ceil((result.data.total || 0) / pagination.pageSize)
      
      if (isLoadMore) {
        blogList.value = [...blogList.value, ...newData]
      } else {
        blogList.value = newData
      }
      
      pagination.currentPage = currentPage
      pagination.total = result.data.total || 0
      hasMore.value = pagination.currentPage < totalPages
      
      // 设置加载冷却期，防止连续加载
      loadCooldown = true
      setTimeout(() => {
        loadCooldown = false
        
        // 检查是否需要继续加载（如果内容不足以填满容器）
        setTimeout(() => {
          checkAndLoadMoreIfNeeded();
        }, 300);
      }, 500);
      
      if (!isLoadMore) {
        updateUrlParams()
      }
    } else {
      ElMessage.error(result.msg || '搜索失败')
      if (!isLoadMore) {
        blogList.value = []
        pagination.total = 0
        hasMore.value = false
      }
    }
  } catch (error) {
    console.error('搜索失败')
    ElMessage.error('搜索失败，请稍后重试')
    if (!isLoadMore) {
      blogList.value = []
      pagination.total = 0
      hasMore.value = false
    }
  } finally {
    loading.value = false
  }
}

// 加载更多数据
const loadMore = () => {
  if (!hasMore.value || loading.value) {
    return
  }
  
  search(true)
}

// 处理筛选条件变化
const handleFilterChange = () => {
  pagination.currentPage = 1 // 重置到第一页
  hasMore.value = true // 重置hasMore状态
  search()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.currentPage = page
  // 清空现有数据，重新加载到指定页
  search()
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 跳转到博客详情（新标签页打开，保留搜索结果列表）
const goBlogDetail = (blogId) => {
  window.open(`/blog/${blogId}`, '_blank')
}

// 跳转到用户页面（新标签页打开）
const goUserProfile = (userId) => {
  window.open(`/user/${userId}`, '_blank')
}

// 搜索指定用户的博客
const searchUserBlogs = (username) => {
  filters.username = username
  searchKeyword.value = ''
  handleFilterChange()
}

// 搜索指定分类的博客
const searchCategoryBlogs = (categoryId) => {
  filters.categoryId = categoryId
  handleFilterChange()
}

// 清空筛选条件（保留搜索关键词）
const clearSearch = () => {
  // 只清空筛选条件，保留搜索关键词
  filters.categoryId = ''
  filters.username = ''
  filters.sortBy = 'newest'
  pagination.currentPage = 1
  hasMore.value = true // 重置hasMore状态
  
  // 重新搜索
  search()
}

// 更新URL参数
const updateUrlParams = () => {
  const query = {}
  
  if (searchKeyword.value) {
    query.keyword = searchKeyword.value
  }
  
  if (filters.categoryId) {
    query.categoryId = filters.categoryId
  }
  
  if (filters.username) {
    query.username = filters.username
  }
  
  if (filters.sortBy !== 'newest') {
    query.sortBy = filters.sortBy
  }
  
  router.replace({ query })
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

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(item => item.id === categoryId)
  return category ? category.name : '未分类'
}


</script>

<template>
  <div class="search-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>搜索结果</h2>
      <p class="page-subtitle">筛选和浏览感兴趣的技术文章</p>
    </div>
    
    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <div class="filter-section">
        <div class="filter-group">
          <label class="filter-label">分类筛选：</label>
          <el-select 
            v-model="filters.categoryId"
            placeholder="选择分类"
            clearable
            @change="handleFilterChange"
            class="filter-select"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">作者筛选：</label>
          <el-input
            v-model="filters.username"
            placeholder="输入作者用户名"
            clearable
            @clear="handleFilterChange"
            @keyup.enter="handleFilterChange"
            class="filter-input"
          />
        </div>
        
        <div class="filter-group">
          <label class="filter-label">排序方式：</label>
          <el-select 
            v-model="filters.sortBy"
            @change="handleFilterChange"
            class="filter-select"
          >
            <el-option
              v-for="option in sortOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        
        <div class="filter-actions">
          <el-button @click="clearSearch" size="small">
            重置筛选
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 搜索结果 -->
    <div class="search-results">
      <!-- 搜索结果数量和状态 -->
      <div class="results-header">
        <div class="results-count" v-if="!loading">
          <template v-if="searchKeyword || filters.categoryId || filters.username">
            找到 <span class="highlight">{{ pagination.total }}</span> 条结果
            <template v-if="searchKeyword">
              包含 "<span class="highlight">{{ searchKeyword }}</span>"
            </template>
            <template v-if="filters.categoryId">
              - 分类：<span class="highlight">{{ getCategoryName(filters.categoryId) }}</span>
            </template>
            <template v-if="filters.username">
              - 作者：<span class="highlight">{{ filters.username }}</span>
            </template>
          </template>
          <template v-else>
            <span class="tip-text">请使用顶部搜索框搜索，或选择筛选条件浏览文章</span>
          </template>
        </div>
        
        <div class="results-actions" v-if="blogList.length > 0">
          <span class="results-info">
            第 {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} - 
            {{ Math.min(pagination.currentPage * pagination.pageSize, pagination.total) }} 条
          </span>
        </div>
      </div>
      
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>
      
      <!-- 无搜索结果 -->
      <div v-else-if="blogList.length === 0 && (searchKeyword || filters.categoryId || filters.username)" class="empty-container">
        <el-empty description="未找到相关博客">
          <template #description>
            <p>没有找到匹配的博客文章</p>
            <p class="empty-tip">
              尝试：
              <el-button type="text" @click="clearSearch">重置筛选条件</el-button>
              或使用其他关键词搜索
            </p>
          </template>
        </el-empty>
      </div>
      
      <!-- 博客列表 -->
      <div v-else-if="blogList.length > 0" class="blog-list">
        <div 
          v-for="blog in blogList" 
          :key="blog.id"
          class="blog-item"
          @click="goBlogDetail(blog.id)"
        >
          <!-- 博客内容 -->
          <div class="blog-content">
            <h3 class="blog-title">{{ blog.title }}</h3>
            
            <div class="blog-summary">
              {{ blog.summary || (blog.content && blog.content.substring(0, 200)) || '暂无摘要' }}
            </div>
            
            <div class="blog-meta">
              <div class="blog-author" @click.stop="goUserProfile(blog.userId)">
                <el-avatar :size="24" :src="blog.avatar" />
                <span class="author-name">{{ blog.username || '匿名用户' }}</span>
              </div>
              
              <div class="blog-date">{{ formatDate(blog.createTime) }}</div>
              
              <!-- 分类标签 -->
              <el-tag 
                v-if="blog.category"
                size="small" 
                effect="plain"
                class="category-tag"
                @click.stop="searchCategoryBlogs(blog.categoryId)"
              >
                {{ blog.category }}
              </el-tag>
              
              <!-- 标签列表 -->
              <template v-if="blog.tagList && blog.tagList.length > 0">
                <el-tag 
                  v-for="tag in blog.tagList.slice(0, 3)" 
                  :key="tag" 
                  size="small" 
                  effect="plain"
                  class="blog-tag"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="blog.tagList.length > 3" class="more-tags">
                  +{{ blog.tagList.length - 3 }}
                </span>
              </template>
              
              <div class="blog-stats">
                <span class="stat-item">
                  <Icon :icon="eyeIcon" />
                  {{ blog.views || 0 }}
                </span>
                <span class="stat-item">
                  <Icon :icon="heartIcon" />
                  {{ blog.likes || 0 }}
                </span>
                <span class="stat-item">
                  <Icon :icon="starIcon" />
                  {{ blog.collections || 0 }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 博客封面图 -->
          <div class="blog-cover" v-if="blog.coverImage">
            <img :src="blog.coverImage" :alt="blog.title">
          </div>
        </div>
      
        <!-- 传统分页（仅在需要时显示） -->
        <div class="pagination-container" v-if="pagination.total > pagination.pageSize && pagination.total <= 100">
          <el-pagination
            background
            layout="total, prev, pager, next, jumper"
            :total="pagination.total"
            :page-size="pagination.pageSize"
            :current-page="pagination.currentPage"
            @current-change="handlePageChange"
            :hide-on-single-page="false"
          />
        </div>
        
        <!-- 加载状态提示 -->
        <div class="loading-status">
          <div v-if="loading" class="loading-indicator">
            <i class="el-icon-loading"></i>
            <span>加载中...</span>
          </div>
          <div v-else-if="!hasMore && blogList.length > 0" class="no-more-data">
            <span>—— 已经到底了 ——</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 60px);
}

/* 页面标题样式 */
.page-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 30px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.page-header h2 {
  font-size: 28px;
  margin: 0 0 10px 0;
  font-weight: 700;
}

.page-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

/* 筛选工具栏样式 */
.filter-toolbar {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f2f5;
}

.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.filter-select {
  min-width: 120px;
}

.filter-input {
  min-width: 160px;
}

.filter-actions {
  margin-left: auto;
}

/* 搜索结果样式 */
.search-results {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f2f5;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f2f5;
}

.results-count {
  font-size: 14px;
  color: #666;
}

.results-info {
  font-size: 13px;
  color: #999;
}

.highlight {
  color: #409eff;
  font-weight: 600;
}

.tip-text {
  color: #999;
  font-style: italic;
}

.loading-container,
.empty-container {
  padding: 60px 0;
  text-align: center;
}

.empty-tip {
  margin-top: 10px;
  font-size: 14px;
  color: #999;
}

/* 博客列表样式 */
.blog-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.blog-item {
  display: flex;
  padding: 25px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #f0f2f5;
  background-color: #fafbfc;
}

.blog-item:hover {
  background-color: white;
  border-color: #409eff;
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.blog-content {
  flex: 1;
  min-width: 0;
  padding-right: 20px;
}

.blog-title {
  font-size: 20px;
  margin: 0 0 15px 0;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.blog-item:hover .blog-title {
  color: #409eff;
}

.blog-summary {
  font-size: 14px;
  color: #666;
  margin: 0 0 15px 0;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.blog-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
  font-size: 13px;
}

.blog-author {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: color 0.3s;
}

.blog-author:hover {
  color: #409eff;
}

.author-name {
  font-weight: 500;
}

.blog-category {
  cursor: pointer;
}

.blog-date {
  color: #999;
}

.blog-stats {
  display: flex;
  gap: 15px;
  margin-left: auto;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
}

.stat-item svg {
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.blog-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.category-tag {
  cursor: pointer;
  background-color: #ecf5ff;
  border-color: #d9ecff;
  color: #409eff;
}

.blog-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.blog-tag:hover {
  color: #409eff;
  border-color: #409eff;
}

.more-tags {
  font-size: 12px;
  color: #999;
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.blog-cover {
  width: 200px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background-color: #f8f9fa;
}

.blog-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.blog-item:hover .blog-cover img {
  transform: scale(1.05);
}

/* 分页样式 */
.pagination-container {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  padding-top: 30px;
  border-top: 1px solid #f0f2f5;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .search-page {
    padding: 15px;
  }
  
  .page-header {
    padding: 25px 20px;
  }
  
  .page-header h2 {
    font-size: 24px;
  }
  
  .blog-cover {
    width: 160px;
    height: 120px;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .filter-select,
  .filter-input {
    width: 100%;
    min-width: unset;
  }
  
  .filter-actions {
    margin-left: 0;
    margin-top: 10px;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .blog-stats {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 20px 15px;
  }
  
  .page-header h2 {
    font-size: 22px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .blog-item {
    flex-direction: column;
    padding: 20px;
  }
  
  .blog-content {
    padding-right: 0;
    margin-bottom: 15px;
  }
  
  .blog-cover {
    width: 100%;
    height: 180px;
  }
  
  .blog-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .blog-stats {
    margin-left: 0;
    align-self: stretch;
  }
  
  .pagination-container {
    margin-top: 30px;
  }
}

@media (max-width: 480px) {
  .search-page {
    padding: 10px;
  }
  
  .page-header {
    padding: 15px 10px;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
  
  .filter-toolbar,
  .search-results {
    padding: 15px;
  }
  
  .blog-item {
    padding: 15px;
  }
  
  .blog-title {
    font-size: 18px;
  }
  
  .blog-summary {
    font-size: 13px;
  }
}

/* 自定义元素样式调整 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-input__wrapper) {
  transition: all 0.3s ease;
}

:deep(.el-select__wrapper) {
  transition: all 0.3s ease;
}

:deep(.el-button) {
  transition: all 0.3s ease;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: white;
  --el-pagination-button-color: #666;
}

:deep(.el-pagination .btn-next),
:deep(.el-pagination .btn-prev) {
  background-color: white;
  border: 1px solid #dcdfe6;
}

:deep(.el-pagination .btn-next:hover),
:deep(.el-pagination .btn-prev:hover) {
  color: #409eff;
  border-color: #409eff;
}

:deep(.el-pager li) {
  background-color: white;
  border: 1px solid #dcdfe6;
  margin: 0 2px;
  border-radius: 4px;
}

:deep(.el-pager li:hover) {
  color: #409eff;
  border-color: #409eff;
}

:deep(.el-pager li.is-active) {
  color: white;
  background-color: #409eff;
  border-color: #409eff;
}

/* 加载状态提示 */
.loading-status {
  padding: 20px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.loading-indicator i {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.no-more-data {
  color: #909399;
  display: inline-block;
  position: relative;
}

.no-more-data span {
  background-color: #f9fafc;
  padding: 0 10px;
  position: relative;
}

.no-more-data:before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background-color: #ebeef5;
  z-index: -1;
}

/* 移除滚动状态面板相关样式 */
.scroll-status-panel,
.status-info,
.page-info,
.total-info,
.separator,
.load-status,
.loading-text,
.no-more-text,
.scroll-hint,
.loading-icon,
.complete-icon,
.scroll-icon,
.progress-bar-container,
.progress-bar {
  display: none;
}
</style> 