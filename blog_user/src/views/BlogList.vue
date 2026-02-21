<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import * as blogApi from '@/api/blog.js'
import * as categoryApi from '@/api/category.js'
import * as tagApi from '@/api/tag.js'
import * as userApi from '@/api/user.js'

const router = useRouter()
const route = useRoute()

// 分类数据（从后端获取）
const categories = ref([
  { id: '', name: '全部分类' }
])

// 标签数据（从后端API获取热门标签）
const tags = ref([])
// 标签加载状态
const tagsLoading = ref(false)

// 排序选项
const sortOptions = [
  { label: '最新发布', value: 'newest' },
  { label: '最多浏览', value: 'views' },
  { label: '最多点赞', value: 'likes' },
  { label: '最多评论', value: 'comments' }
]

// 当前排序
const currentSort = ref(sortOptions[0].value)

// 博客列表
const blogList = ref([])

// 搜索关键词
const searchKeyword = ref('')

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 12,
  total: 0
})

// 加载状态
const loading = ref(false)

// 已选分类和标签
const selectedCategory = ref({ id: '', name: '全部分类' })
const selectedTags = ref([])

// 用户ID（从URL参数获取）
const userId = ref(null)
// 用户名称（当查看某个用户的博客时显示）
const username = ref('')

onMounted(async () => {
  // 检查URL参数中是否有userId
  if (route.query.userId) {
    userId.value = route.query.userId
    // 获取用户信息，以便显示用户名
    await loadUserInfo()
  }
  
  // 加载分类数据
  await loadCategories()
  // 加载热门标签数据
  await loadHotTags()
  // 加载博客列表
  loadBlogList()
})

// 加载用户信息
const loadUserInfo = async () => {
  try {
    if (userId.value) {
      const result = await userApi.getUserById(userId.value)
      if (result.code === 0 && result.data) {
        username.value = result.data.username
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

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
      
      // 设置默认选中的分类
      selectedCategory.value = categories.value[0]
    }
  } catch (error) {
    console.error('获取分类失败:', error)
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
    selectedCategory.value = categories.value[0]
  }
}

// 加载热门标签
const loadHotTags = async () => {
  tagsLoading.value = true
  try {
    const result = await tagApi.getHotTags(10) // 获取前10个热门标签
    if (result.code === 0 && result.data) {
      // 将标签数据转换为组件需要的格式
      tags.value = result.data.map(tag => ({
        id: tag.id,
        name: tag.name,
        active: false
      }))
      console.log('获取热门标签成功:', tags.value)
    } else {
      console.error('获取热门标签失败:', result.msg)
      // 设置默认标签
      setDefaultTags()
    }
  } catch (error) {
    console.error('获取热门标签出错:', error)
    // 设置默认标签
    setDefaultTags()
  } finally {
    tagsLoading.value = false
  }
}

// 设置默认标签（在API请求失败时使用）
const setDefaultTags = () => {
  tags.value = [
    { id: 1, name: 'JavaScript', active: false },
    { id: 2, name: 'Java', active: false },
    { id: 3, name: 'Python', active: false },
    { id: 4, name: 'Vue', active: false },
    { id: 5, name: 'React', active: false },
    { id: 6, name: 'Spring', active: false },
    { id: 7, name: '微服务', active: false },
    { id: 8, name: 'Docker', active: false },
    { id: 9, name: '数据结构', active: false },
    { id: 10, name: '算法', active: false }
  ]
}

// 加载博客列表
const loadBlogList = async () => {
  loading.value = true
  try {
    // 构建查询参数，与后端BlogPageQueryDTO对应
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    // 如果有指定用户ID，添加到查询参数中
    if (userId.value) {
      params.userId = userId.value
    }
    
    // 添加搜索关键词
    if (searchKeyword.value.trim()) {
      params.title = searchKeyword.value.trim()
    }
    
    // 添加分类
    if (selectedCategory.value.id) {
      params.categoryId = selectedCategory.value.id
    }
    
    // 添加排序
    if (currentSort.value) {
      // 映射前端排序字段到后端字段
      if (currentSort.value === 'newest') {
        params.sortField = 'createTime'
        params.ignoreTop = false
      } else {
        params.sortField = currentSort.value
        params.ignoreTop = true
      }
      // 默认降序排列
      params.sortOrder = 'desc'
    }
    
    // 添加标签（如果需要的话，后端可能需要支持标签搜索）
    if (selectedTags.value.length > 0) {
      // 这里可以根据后端API设计调整
      // params.tags = selectedTags.value.map(tag => tag.name).join(',')
    }
    
    console.log('博客列表查询参数:', params)
    
    const result = await blogApi.getBlogPage(params)
    
    if (result.code === 0 && result.data) {
      blogList.value = result.data.records || []
      pagination.total = result.data.total || 0
    } else {
      ElMessage.error(result.msg || '获取博客列表失败')
      blogList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取博客列表出错:', error)
    ElMessage.error('获取博客列表失败')
    blogList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 处理分类点击
const handleCategoryClick = (category) => {
  // 更新分类的激活状态
  categories.value.forEach(item => {
    if (item.id === category.id) {
      item.active = true
    } else {
      item.active = false
    }
  })
  
  selectedCategory.value = category
  pagination.currentPage = 1 // 重置到第一页
  loadBlogList()
}

// 处理标签点击
const handleTagClick = (tag) => {
  tag.active = !tag.active
  
  if (tag.active) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value = selectedTags.value.filter(item => item.id !== tag.id)
  }
  
  pagination.currentPage = 1 // 重置到第一页
  loadBlogList()
}

// 处理排序变化
const handleSortChange = (value) => {
  currentSort.value = value
  pagination.currentPage = 1
  loadBlogList()
}

// 处理搜索
const handleSearch = () => {
  pagination.currentPage = 1 // 重置到第一页
  loadBlogList()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.currentPage = page
  loadBlogList()
}

// 跳转到博客详情
const goBlogDetail = (blogId) => {
  router.push(`/blog/${blogId}`)
}

// 跳转到搜索页面
const goToSearch = () => {
  const query = {}
  
  if (searchKeyword.value.trim()) {
    query.keyword = searchKeyword.value.trim()
  }
  
  if (selectedCategory.value.id) {
    query.categoryId = selectedCategory.value.id
  }
  
  router.push({
    path: '/search',
    query
  })
}

// 跳转到用户页面
const goUserProfile = (userId) => {
  router.push(`/user/${userId}`)
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

// 获取标签总数
const getTotalTagCount = (blog) => {
  const systemTagCount = (blog.tagList || []).length
  const customTagCount = (blog.customTagList || []).length
  return systemTagCount + customTagCount
}

// 搜索关键词防抖处理
let searchTimer = null
watch(searchKeyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (searchKeyword.value.trim()) {
    handleSearch()
    }
  }, 500)
})
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
  <div class="blog-list-page">
    <!-- 顶部搜索区域 -->
<!--    <div class="search-section">-->
<!--      <div class="search-container">-->
<!--        <el-input -->
<!--          v-model="searchKeyword"-->
<!--          placeholder="搜索感兴趣的博客..." -->
<!--          size="large"-->
<!--          clearable-->
<!--          @clear="handleSearch"-->
<!--          @keyup.enter="handleSearch"-->
<!--          class="search-input"-->
<!--        >-->
<!--          <template #append>-->
<!--            <el-button @click="goToSearch" type="primary">-->
<!--              <Icon icon="mdi:magnify" />-->
<!--              高级搜索-->
<!--            </el-button>-->
<!--          </template>-->
<!--        </el-input>-->
<!--      </div>-->
<!--    </div>-->

    <!-- 筛选条件区域 -->
    <div class="filter-container">
      <!-- 用户博客提示 -->
      <div v-if="userId" class="user-blogs-header">
        <h2 class="user-blogs-title">
          <el-icon><icon icon="mdi:account" /></el-icon>
          正在查看 <span class="username-highlight">{{ username || '用户' }}</span> 的博客
        </h2>
      </div>
      
      <!-- 分类筛选 -->
      <div class="filter-section">
        <div class="filter-header">
          <h3 class="filter-title">
            <Icon icon="mdi:folder" />
            文章分类
          </h3>
        </div>
        <div class="filter-options">
          <div 
            v-for="category in categories" 
            :key="category.id"
            :class="['filter-tag', { active: selectedCategory.id === category.id }]"
            @click="handleCategoryClick(category)"
          >
            {{ category.name }}
          </div>
        </div>
      </div>
      
      <!-- 标签筛选 -->
      <!-- <div class="filter-section">
        <div class="filter-header">
          <h3 class="filter-title">
            <Icon icon="mdi:tag-multiple" />
            热门标签
          </h3>
        </div>
        <div v-if="tagsLoading" class="tags-loading">
          <el-skeleton :count="5" style="width: 60px" animated />
        </div>
        <div v-else class="filter-options">
          <div 
            v-for="tag in tags" 
            :key="tag.id"
            :class="['filter-tag tag-item', { active: tag.active }]"
            @click="handleTagClick(tag)"
          >
            {{ tag.name }}
          </div>
        </div>
      </div> -->
    </div>
    
    <!-- 博客列表区域 -->
    <div class="blog-content">
      <!-- 列表头部 -->
      <div class="content-header">
        <div class="content-info">
          <h2 class="content-title">
            {{ selectedCategory.id ? selectedCategory.name : (userId ? `${username || '用户'}的博客` : '全部博客') }}
            <span class="blog-count" v-if="!loading">({{ pagination.total }})</span>
          </h2>
          <p class="content-subtitle">{{ userId ? '查看用户发布的博客文章' : '发现优质技术文章' }}</p>
      </div>
      
        <div class="content-actions">
          <div class="sort-selector">
        <el-select 
          v-model="currentSort"
              @change="handleSortChange"
          placeholder="排序方式"
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
      </div>

      <!-- 已选标签显示 -->
      <!-- <div class="selected-tags" v-if="selectedTags.length > 0">
        <span class="tags-label">已选标签：</span>
        <el-tag
          v-for="tag in selectedTags"
          :key="tag.id"
          closable
          @close="handleTagClick(tag)"
          class="selected-tag"
        >
          {{ tag.name }}
        </el-tag>
    </div> -->
    
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="blogList.length === 0" class="empty-container">
        <el-empty description="暂无博客文章">
          <template #description>
            <p>还没有找到相关的博客文章</p>
            <p class="empty-tip">
              尝试：
              <el-button type="text" @click="handleCategoryClick(categories[0])">查看全部分类</el-button>
              或
              <el-button type="text" @click="selectedTags = []; loadBlogList()">清除标签筛选</el-button>
            </p>
          </template>
        </el-empty>
      </div>
      
      <!-- 博客列表 -->
      <div v-else class="article-list">
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
              <span class="article-author" @click.stop="goUserProfile(blog.userId)">
                <el-avatar :size="20" :src="blog.avatar" v-if="blog.avatar" class="author-avatar"/>
                {{ blog.username || '匿名用户' }}
              </span>
              <span class="article-date">{{ formatDate(blog.publishTime || blog.createTime) }}</span>
              <span class="article-count">
                <Icon icon="mdi:eye" />
                {{ blog.views || blog.viewCount || 0 }}
              </span>
              <span class="article-count">
                <Icon icon="mdi:thumb-up" />
                {{ blog.likes || blog.likeCount || 0 }}
              </span>
              <span class="article-category" v-if="blog.category || blog.categoryId">
                {{ blog.category || getCategoryName(blog.categoryId) }}
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
            <span class="placeholder-text">#{{ blog.category || getCategoryName(blog.categoryId) || '文章' }}</span>
          </div>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-container" v-if="pagination.total > pagination.pageSize">
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
    </div>
  </div>
</template>

<style scoped>
.blog-list-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 60px);
}

/* 搜索区域样式 */
.search-section {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 4px 4px 0 #000;
  border: 2px solid #000;
}

.search-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  border-radius: 0;
  overflow: hidden;
  box-shadow: 3px 3px 0 #000;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 0 0 0 25px;
  border: 2px solid #000;
  transition: all 0.3s ease;
}

.search-input :deep(.el-input__wrapper):hover {
  border-color: var(--pixel-primary);
}

.search-input :deep(.el-input-group__append) {
  border-radius: 0 25px 25px 0;
  border: 2px solid var(--pixel-primary);
  border-left: none;
  background-color: var(--pixel-primary);
}

.search-input :deep(.el-input-group__append .el-button) {
  border-radius: 0 25px 25px 0;
  padding: 0 16px;
  font-weight: 500;
  color: white;
  border: none;
  background-color: transparent;
}

/* 筛选条件样式 */
.filter-container {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 4px 4px 0 #000;
  border: 2px solid #000;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.filter-header {
  margin-bottom: 15px;
}

.filter-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--pixel-text-primary);
  margin: 0;
}

.filter-title :deep(svg) {
  margin-right: 8px;
  color: var(--pixel-primary-light);
  font-size: 18px;
  width: 18px;
  height: 18px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-tag {
  padding: 8px 16px;
  border-radius: 0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #000;
  background-color: var(--pixel-bg-card);
  color: var(--pixel-text-primary);
  user-select: none;
}

.filter-tag:hover {
  border-color: var(--pixel-primary);
  color: var(--pixel-primary);
  background-color: var(--pixel-bg-card);
}

.filter-tag.active {
  background-color: var(--pixel-primary);
  color: white;
  border-color: var(--pixel-primary);
}

.tag-item {
  font-size: 15px;
  padding: 6px 12px;
}

/* 博客内容区域样式 */
.blog-content {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 30px;
  box-shadow: 4px 4px 0 #000;
  border: 2px solid #000;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.content-info {
  flex: 1;
  min-width: 0;
}

.content-title {
  font-size: 24px;
  margin: 0 0 8px 0;
  font-weight: 700;
  color: var(--pixel-text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.blog-count {
  font-size: 16px;
  color: var(--pixel-text-muted);
  font-weight: 400;
}

.content-subtitle {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin: 0;
  line-height: 1.5;
}}

.content-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.sort-selector {
  min-width: 140px;
}

/* 已选标签样式 */
.selected-tags {
  margin-bottom: 25px;
  padding: 15px;
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  border: 2px solid #000;
}

.tags-label {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin-right: 10px;
  font-weight: 500;
}

.selected-tag {
  margin: 2px 4px 2px 0;
}

/* 加载和空状态样式 */
.loading-container,
.empty-container {
  padding: 60px 0;
  text-align: center;
}

.empty-tip {
  margin-top: 15px;
  font-size: 14px;
  color: var(--pixel-text-muted);
}

/* 博客网格样式 */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.blog-card {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #000;
  box-shadow: 3px 3px 0 #000;
}

.blog-card:hover {
  transform: translateY(-5px);
  box-shadow: 4px 4px 0 #000;
  border-color: var(--pixel-primary);
}

.blog-cover {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: var(--pixel-bg-card);
  border: 2px solid #000;
}

.blog-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.blog-card:hover .blog-cover img {
  transform: scale(1.05);
}

.default-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--pixel-primary);
  color: white;
}

.default-cover i {
  font-size: 48px;
  opacity: 0.8;
}

.category-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  background-color: var(--pixel-primary);
  color: white;
  border-radius: 0;
  font-size: 14px;
  font-weight: 500;
  ;
}

.blog-info {
  padding: 20px;
}

.blog-title {
  font-size: 18px;
  margin: 0 0 12px 0;
  font-weight: 600;
  color: var(--pixel-text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.3s ease;
}

.blog-card:hover .blog-title {
  color: var(--pixel-primary-light);
}



.blog-summary {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin-bottom: 15px;
  line-height: 1.6;
  height: 4.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  text-overflow: ellipsis;
  word-break: break-all;
}

.blog-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
  align-items: center;
}

.blog-tag {
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 0;
  transition: all 0.3s ease;
}

.blog-tag:hover {
  color: var(--pixel-primary-light);
  border-color: var(--pixel-primary-light);
}

.more-tags {
  font-size: 14px;
  color: var(--pixel-text-muted);
  background-color: var(--pixel-bg-secondary);
  padding: 2px 6px;
  border-radius: 0;
}

.blog-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 2px solid #000;
}

.author-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: color 0.3s ease;
}

.author-info:hover {
  color: var(--pixel-primary-light);
}

.author-name {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--pixel-text-primary);
}

.meta-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--pixel-text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  margin-right: 12px;
  font-size: 15px;
  color: var(--pixel-text-secondary);
}

.meta-item :deep(svg) {
  margin-right: 4px;
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.publish-date {
  font-size: 14px;
  color: var(--pixel-text-muted);
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
  .blog-list-page {
    padding: 15px;
  }
  
  .blog-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  
  .content-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .content-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .blog-list-page {
    padding: 10px;
  }
  
  .search-section,
  .filter-container,
  .blog-content {
    padding: 20px;
  }
  
  .blog-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .blog-card {
    border-radius: 0;
  }
  
  .blog-cover {
    height: 180px;
  }
  
  .content-title {
    font-size: 20px;
  }
  
  .filter-options {
    gap: 8px;
  }
  
  .filter-tag {
    padding: 6px 12px;
    font-size: 15px;
  }
  
  .tag-item {
    font-size: 14px;
    padding: 4px 8px;
  }
}

@media (max-width: 480px) {
  .blog-list-page {
    padding: 5px;
  }
  
  .search-section,
  .filter-container,
  .blog-content {
    padding: 15px;
  }
  
  .blog-info {
    padding: 15px;
  }
  
  .blog-title {
    font-size: 16px;
  }
  
  .blog-summary {
    font-size: 15px;
  }
  
  .content-title {
    font-size: 18px;
  }
  
  .blog-cover {
    height: 160px;
  }
  
  .blog-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .meta-stats {
    align-self: stretch;
    justify-content: space-between;
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

:deep(.el-tag) {
  transition: all 0.3s ease;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: var(--pixel-bg-card);
  --el-pagination-button-color: var(--pixel-text-secondary);
  --el-pagination-button-disabled-color: var(--pixel-text-muted);
}

:deep(.el-pagination .btn-next),
:deep(.el-pagination .btn-prev) {
  background-color: var(--pixel-bg-card);
  border: 2px solid #000;
  border-radius: 0;
}

:deep(.el-pagination .btn-next:hover),
:deep(.el-pagination .btn-prev:hover) {
  color: var(--pixel-primary-light);
  border-color: var(--pixel-primary);
}

:deep(.el-pager li) {
  background-color: var(--pixel-bg-card);
  border: 2px solid #000;
  margin: 0 2px;
  border-radius: 0;
}

:deep(.el-pager li:hover) {
  color: var(--pixel-primary-light);
  border-color: var(--pixel-primary);
  }

:deep(.el-pager li.is-active) {
  color: white;
  background-color: var(--pixel-primary);
  border-color: var(--pixel-primary);
}

:deep(.el-skeleton__item) {
  background: var(--pixel-bg-secondary);
  border-radius: 0;
}

.user-blogs-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #000;
}

.user-blogs-title {
  font-size: 18px;
  color: var(--pixel-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-blogs-title .el-icon {
  color: var(--pixel-primary-light);
  font-size: 18px;
}

.username-highlight {
  color: var(--pixel-primary-light);
  font-weight: 600;
}

.tags-loading {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
/* 博客列表样式 (复用首页样式) */
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
  background-color: var(--pixel-bg-hover);
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
  border-radius: 0;
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
  background-color: var(--pixel-bg-card);
  color: var(--pixel-text-primary);
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
</style> 