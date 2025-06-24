<script setup>
import { ref, onMounted } from 'vue'
import { getFollows } from '@/api/user.js'
import { getBlogPage } from '@/api/blog.js'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import router from '@/router/index.js'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'
import loadingIcon from '@iconify/icons-mdi/loading'

// Token store
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 关注列表数据
const followList = ref([])
// 博客列表数据
const blogList = ref([])
const loading = ref(false)
// 是否还有更多数据
const hasMore = ref(true)

// 分页参数
const queryParams = ref({
  page: 1,
  pageSize: 10,
  userIds: [] // 关注的用户ID列表
})

// 获取关注列表
const fetchFollowList = async () => {
  try {
    const result = await getFollows()
    if (result.code === 0) {
      followList.value = result.data || []
      
      // 提取关注的用户ID
      const followedUserIds = followList.value.map(follow => follow.id)
      queryParams.value.userIds = followedUserIds
      
      // 加载博客数据
      if (followedUserIds.length > 0) {
        await fetchBlogList(true)
      }
    }
  } catch (error) {
    console.error('获取关注列表失败', error)
    ElMessage.error('获取关注列表失败')
  }
}

// 分页查询博客
const fetchBlogList = async (reset = false) => {
  if (loading.value) return
  
  // 如果没有关注的用户，直接返回
  if (queryParams.value.userIds.length === 0) {
    blogList.value = []
    hasMore.value = false
    return
  }
  
  loading.value = true
  
  try {
    let params = { ...queryParams.value }
    
    if (reset) {
      params.page = 1
    }
    
    const result = await getBlogPage(params)
    
    if (result.code === 0) {
      const { records, total } = result.data
      
      if (reset) {
        blogList.value = records
      } else {
        blogList.value = [...blogList.value, ...records]
      }
      
      // 更新页码
      queryParams.value.page = reset ? 1 : queryParams.value.page + 1
      
      // 判断是否还有更多数据
      hasMore.value = blogList.value.length < total
    }
  } catch (error) {
    console.error('获取关注博客列表失败', error)
    ElMessage.error('获取关注博客列表失败')
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) {
    return
  }
  fetchBlogList(false)
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
  
  await fetchFollowList()
})
</script>

<template>
  <div class="following-page">
    <h1 class="page-title">关注的文章</h1>
    
    <div class="content-container">
      <!-- 没有关注用户时的空状态 -->
      <div v-if="followList.length === 0" class="empty-state">
        <el-empty description="你还没有关注任何人">
          <el-button type="primary" @click="router.push('/index')">去发现更多博主</el-button>
        </el-empty>
      </div>
      
      <div v-else class="blog-list-container">
        <!-- 博客列表 -->
        <div class="article-list">
          <div 
            v-for="blog in blogList" 
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
                <span class="article-count">
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
        
        <!-- 没有文章数据时的提示 -->
        <div v-if="!loading && blogList.length === 0" class="no-data">
          <p>关注的博主暂未发布文章</p>
        </div>
        
        <!-- 加载更多 -->
        <div class="load-more">
          <el-button v-if="hasMore && !loading" @click="loadMore" plain>加载更多</el-button>
          <div v-if="loading" class="loading-indicator">
            <Icon :icon="loadingIcon" class="loading-spinner" />
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
.following-page {
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
}

.empty-state {
  padding: 60px 0;
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

.load-more {
  text-align: center;
  margin-top: 20px;
}

.loading-indicator {
  padding: 20px;
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

.no-more-data {
  padding: 20px;
  color: #999;
  font-size: 14px;
  text-align: center;
  position: relative;
}

.no-more-data span {
  background-color: white;
  padding: 0 10px;
  position: relative;
  z-index: 1;
}

.no-more-data:before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background-color: #ebeef5;
  z-index: 0;
}

.no-data {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}
</style> 