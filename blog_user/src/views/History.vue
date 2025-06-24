<template>
  <div class="history-page">
    <div class="page-header">
      <h2>浏览历史</h2>
      <div class="actions">
        <button @click="clearHistory" class="clear-btn" v-if="historyList.length > 0">
          清空历史记录
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else-if="historyList.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>暂无浏览历史</h3>
      <p>您还没有浏览过任何博客内容</p>
      <router-link to="/blogs" class="go-browse-btn">去看看</router-link>
    </div>

    <div v-else class="history-list">
      <div 
        v-for="blog in historyList" 
        :key="blog.id"
        class="history-item"
        @click="goToBlog(blog.id)"
      >
        <div class="blog-info">
          <h3 class="blog-title">{{ blog.title }}</h3>
          <p class="blog-summary">{{ blog.summary || blog.content?.substring(0, 150) || '暂无摘要' }}</p>
          <div class="blog-meta">
            <span class="author">{{ blog.username || blog.author || '未知作者' }}</span>
            <span class="category" v-if="blog.category || blog.categoryName">
              {{ blog.category || blog.categoryName }}
            </span>
            <span class="view-time">{{ formatViewTime(blog.viewTime || blog.lastViewTime) }}</span>
          </div>
        </div>
        
        <div class="blog-stats">
          <div class="stat-item">
            <span class="icon">👁</span>
            <span class="count">{{ blog.views || blog.viewCount || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="icon">👍</span>
            <span class="count">{{ blog.likes || blog.likeCount || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="icon">💬</span>
            <span class="count">{{ blog.comments || blog.commentCount || 0 }}</span>
          </div>
        </div>

        <button 
          @click.stop="removeFromHistory(blog.id)" 
          class="remove-btn"
          title="从历史记录中移除"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElSkeleton } from 'element-plus'
import * as blogApi from '@/api/blog.js'

const router = useRouter()
const historyList = ref([])
const loading = ref(true)

const loadHistory = async () => {
  try {
    loading.value = true
    const result = await blogApi.getViewHistory()
    
    if (result.code === 0 && result.data) {
      // 处理历史记录数据，确保与后端BlogVO格式匹配
      historyList.value = result.data.map(blog => ({
        ...blog,
        // 确保必要字段存在
        id: blog.id,
        title: blog.title || '无标题',
        summary: blog.summary || '',
        content: blog.content || '',
        username: blog.username || blog.author || '未知作者',
        category: blog.category || blog.categoryName,
        categoryName: blog.categoryName || blog.category,
        views: blog.views || blog.viewCount || 0,
        likes: blog.likes || blog.likeCount || 0,
        comments: blog.comments || blog.commentCount || 0,
        viewTime: blog.viewTime || blog.lastViewTime || blog.createTime
      }))
    } else {
      ElMessage.error('加载浏览历史失败')
      historyList.value = []
    }
  } catch (error) {
    console.error('加载浏览历史失败:', error)
    ElMessage.error('加载浏览历史失败')
    historyList.value = []
  } finally {
    loading.value = false
  }
}

const goToBlog = (blogId) => {
  router.push(`/blog/${blogId}`)
}

const removeFromHistory = (blogId) => {
  try {
    // 从本地历史记录中移除
    historyList.value = historyList.value.filter(blog => blog.id !== blogId)
    ElMessage.success('已从历史记录中移除')
    
    // TODO: 如果后端支持删除单个历史记录的接口，可以在这里调用
    // await blogApi.removeFromHistory(blogId)
  } catch (error) {
    console.error('移除历史记录失败:', error)
    ElMessage.error('移除历史记录失败')
  }
}

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有浏览历史吗？此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    // 清空本地历史记录
    historyList.value = []
    ElMessage.success('历史记录已清空')
    
    // TODO: 如果后端支持清空历史记录的接口，可以在这里调用
    // await blogApi.clearHistory()
  } catch (error) {
    // 用户取消操作
    if (error !== 'cancel') {
      console.error('清空历史记录失败:', error)
      ElMessage.error('清空历史记录失败')
    }
  }
}

const formatViewTime = (viewTime) => {
  if (!viewTime) return ''
  
  const now = new Date()
  const viewDate = new Date(viewTime)
  const diffInMs = now - viewDate
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) {
    return '刚刚浏览'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`
  } else if (diffInDays < 7) {
    return `${diffInDays}天前`
  } else {
    return viewDate.toLocaleDateString('zh-CN')
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.history-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h2 {
  color: #333;
  margin: 0;
}

.clear-btn {
  background: #f56c6c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.clear-btn:hover {
  background: #f78989;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  color: #666;
  margin-bottom: 24px;
}

.go-browse-btn {
  display: inline-block;
  background: #409eff;
  color: white;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 4px;
  transition: background 0.3s;
}

.go-browse-btn:hover {
  background: #66b1ff;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  position: relative;
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.blog-info {
  margin-bottom: 12px;
}

.blog-title {
  color: #333;
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.4;
}

.blog-summary {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #999;
}

.blog-meta span {
  display: flex;
  align-items: center;
}

.author {
  color: #409eff;
}

.category {
  color: #67c23a;
}

.view-time {
  color: #e6a23c;
}

.blog-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
}

.stat-item .icon {
  opacity: 0.7;
}

.remove-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.remove-btn:hover {
  background: #f5f5f5;
  color: #f56c6c;
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .blog-meta {
    flex-direction: column;
    gap: 8px;
  }

  .blog-stats {
    justify-content: space-around;
  }
}
</style>