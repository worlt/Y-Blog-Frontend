<script setup>
import { ref, onMounted } from 'vue'
import { getMyCollections } from '@/api/blog.js'
import { useTokenStore } from '@/stores/token.js'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import router from '@/router/index.js'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'
import loadingIcon from '@iconify/icons-mdi/loading'

// Token store
const tokenStore = useTokenStore()

// 收藏列表数据
const collectedBlogs = ref([])
const loading = ref(false)

// 获取收藏博客列表
const fetchCollections = async () => {
  loading.value = true
  
  try {
    const result = await getMyCollections()
    if (result.code === 0) {
      collectedBlogs.value = result.data || []
    }
  } catch (error) {
    console.error('获取收藏博客列表失败', error)
    ElMessage.error('获取收藏博客列表失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 跳转到博客详情
const goToBlogDetail = (blogId) => {
  router.push(`/blog/${blogId}`)
}

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined'
}

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.style.display = 'none'
  const imageContainer = event.target.closest('.article-image')
  if (imageContainer) {
    imageContainer.style.display = 'none'
  }
}

onMounted(async () => {
  // 检查登录状态
  if (!tokenStore.token) {
    ElMessage.warning('请先登录')
    router.push('/auth')
    return
  }
  
  await fetchCollections()
})
</script>

<template>
  <div class="collections-page">
    <h1 class="page-title">我的收藏</h1>
    
    <div class="content-container">
      <!-- 加载中状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-indicator">
          <Icon :icon="loadingIcon" class="loading-spinner" />
          <span>加载中...</span>
        </div>
      </div>
      
      <!-- 没有收藏博客时的空状态 -->
      <div v-else-if="collectedBlogs.length === 0" class="empty-state">
        <el-empty description="你还没有收藏任何文章">
          <el-button type="primary" @click="router.push('/index')">去浏览文章</el-button>
        </el-empty>
      </div>
      
      <div v-else class="blog-list-container">
        <!-- 博客列表 -->
        <div class="article-list">
          <div 
            v-for="blog in collectedBlogs" 
            :key="blog.id"
            class="article-item"
            @click="goToBlogDetail(blog.id)"
          >
            <div class="article-content">
              <h3 class="article-title">{{ blog.title }}</h3>
              <p class="article-summary">{{ blog.content }}</p>
              <div class="article-info">
                <span class="article-author">{{ blog.username }}</span>
                <span class="article-date">{{ formatDate(blog.publishTime || blog.createTime) }}</span>
                <span class="article-count">
                  <Icon :icon="eyeIcon" />
                  {{ blog.views || 0 }}
                </span>
                <span class="article-count">
                  <Icon :icon="heartIcon" />
                  {{ blog.likes || 0 }}
                </span>
                <span class="article-count active">
                  <Icon :icon="starIcon" />
                  {{ blog.collections || 0 }}
                </span>
                <span class="article-category">{{ blog.category }}</span>
              </div>
            </div>
            
            <!-- 文章配图 -->
            <div class="article-image" v-if="hasValidCover(blog.cover)">
              <img :src="blog.cover" :alt="blog.title" @error="handleImageError">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collections-page {
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
  position: relative;
  padding-left: 15px;
}

.page-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background-color: #409eff;
  border-radius: 2px;
}

.content-container {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  min-height: 600px;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  text-align: center;
}

.blog-list-container {
  min-height: 200px;
}

.article-list {
  margin-bottom: 20px;
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

.article-summary {
  font-size: 14px;
  color: #666;
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
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

.article-count.active {
  color: #e6a23c;
}

.article-count.active .iconify {
  color: #e6a23c;
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
}

.article-category {
  background-color: #f0f0f0;
  color: #666;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.loading-spinner {
  font-size: 24px;
  color: #409eff;
  margin-bottom: 0;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 