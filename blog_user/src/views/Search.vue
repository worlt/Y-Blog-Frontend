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
      if (filters.sortBy === 'newest') {
        params.sortField = 'createTime'
        params.ignoreTop = false
      } else {
        params.sortField = filters.sortBy
        params.ignoreTop = true
      }
      params.sortOrder = 'desc'
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

// 去除HTML标签
const stripHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(item => item.id === categoryId)
  return category ? category.name : '未分类'
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
  const imageContainer = event.target.closest('.article-image');
  if (imageContainer) {
    imageContainer.style.display = 'none';
  }
};
</script>

<template>
  <div class="search-page">
    <!-- 页面标题 -->
<!--    <div class="page-header">-->
<!--      <h2>搜索结果</h2>-->
<!--      <p class="page-subtitle">筛选和浏览感兴趣的技术文章</p>-->
<!--    </div>-->
    
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
      <div v-else-if="blogList.length > 0" class="article-list">
        <div 
          v-for="blog in blogList" 
          :key="blog.id"
          class="article-item"
          @click="goBlogDetail(blog.id)"
        >
          <div class="article-content">
            <h3 class="article-title">{{ blog.title }}</h3>
            <p class="article-summary">{{ stripHtml(blog.summary || blog.content) || '暂无摘要' }}</p>
            <div class="article-info">
              <span class="article-author" @click.stop="goUserProfile(blog.userId || blog.publisherId)">
                {{ blog.username || blog.publisherName || '匿名用户' }}
              </span>
              <span class="article-date">{{ formatDate(blog.createTime || blog.publishTime) }}</span>
              <span class="article-count">
                <Icon :icon="eyeIcon" />
                {{ blog.views || 0 }}
              </span>
              <span class="article-count">
                <Icon :icon="heartIcon" />
                {{ blog.likes || 0 }}
              </span>
              <span class="article-count">
                <Icon :icon="starIcon" />
                {{ blog.collections || 0 }}
              </span>
              <span class="article-category" v-if="blog.category">
                {{ blog.category }}
              </span>
            </div>
          </div>
          
          <!-- 文章配图 -->
          <div class="article-image" v-if="hasValidCover(blog.cover || blog.coverImage)">
            <img :src="blog.cover || blog.coverImage" :alt="blog.title" @error="handleImageError">
          </div>
          <!-- 无封面时显示分类标签渐变背景 -->
          <div 
            v-else 
            class="article-image article-placeholder"
            :style="{ background: getRandomGradient(blog.id) }"
          >
            <span class="placeholder-text">#{{ blog.category || '文章' }}</span>
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
  background: var(--pixel-primary);
  border-radius: 0;
  color: white;
  box-shadow: 4px 4px 0 #000;
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
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 3px 3px 0 #000;
  border: 2px solid #000;
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
  color: var(--pixel-text-secondary);
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
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 30px;
  box-shadow: 3px 3px 0 #000;
  border: 2px solid #000;
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
  color: var(--pixel-text-secondary);
}

.results-info {
  font-size: 15px;
  color: var(--pixel-text-muted);
}

.highlight {
  color: var(--pixel-primary-light);
  font-weight: 600;
}

.tip-text {
  color: var(--pixel-text-muted);
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
  color: var(--pixel-text-muted);
}

/* 博客列表样 (复用首页样式) */
.article-list {
  display: flex;
  flex-direction: column;
}

.article-item {
  display: flex;
  padding: 20px 0;
  border-bottom: 2px solid #000;
  cursor: pointer;
  transition: all 0.1s;
  gap: 20px;
  background-color: var(--pixel-bg-card);
}

.article-item:hover {
  background-color: var(--pixel-bg-secondary);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 #000;
}

.article-item:last-child {
  border-bottom: none;
}

.article-content {
  flex: 1;
  min-width: 0;
}


/* 搜索列表样式 (复用首页和BlogList样式) */
.article-list {
  display: flex;
  flex-direction: column;
}

.article-item {
  display: flex;
  padding: 20px 0;
  border-bottom: 2px solid #000;
  cursor: pointer;
  transition: all 0.1s;
  gap: 20px;
  background-color: var(--pixel-bg-card);
}

.article-item:hover {
  background-color: var(--pixel-bg-secondary);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 #000;
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
  color: var(--pixel-primary-light);
}

.article-summary {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin: 0 0 10px 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.article-info {
  display: flex;
  align-items: center;
  font-size: 15px;
  color: var(--pixel-text-muted);
}

.article-author {
  margin-right: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.article-author:hover {
  color: var(--pixel-primary-light);
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
  color: var(--pixel-text-muted);
  width: 14px;
  height: 14px;
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
  background-color: var(--pixel-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 0;
  font-size: 14px;
  margin-left: 10px;
  border: 2px solid #000;
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

/* 加载状态提示 */
.loading-status {
  padding: 20px 0;
  text-align: center;
  color: var(--pixel-text-muted);
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
  color: var(--pixel-text-muted);
  display: inline-block;
  position: relative;
}

.no-more-data span {
  background-color: var(--pixel-bg-card);
  padding: 0 10px;
  position: relative;
}

.no-more-data:before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 2px;
  background-color: #000;
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