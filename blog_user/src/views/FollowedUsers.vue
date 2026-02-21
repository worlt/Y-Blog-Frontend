<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Close } from '@element-plus/icons-vue'
import * as userApi from '@/api/user.js'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'

const router = useRouter()

// 关注用户列表
const followList = ref([])

// 加载状态
const loading = ref(false)

// 取消关注状态
const cancelingFollow = ref(null)

onMounted(() => {
  loadFollowedUsers()
})

// 加载我关注的用户
const loadFollowedUsers = async () => {
  loading.value = true
  
  try {
    console.log('正在加载关注用户列表...')
    const result = await userApi.getFollows()
    console.log('关注用户列表API响应:', result)
    
    if (result.code === 0) {
      // 处理不同的返回数据结构
      let userData = []
      
      if (Array.isArray(result.data)) {
        userData = result.data
      } else if (result.data && typeof result.data === 'object' && result.data.records) {
        userData = result.data.records
      } else if (result.data && typeof result.data === 'object') {
        userData = [result.data]
      }
      
      // 确保所有用户数据都有一个唯一ID
      followList.value = userData.map(user => {
        return {
          ...user,
          id: user.userId || user.id || Math.random().toString(36).substr(2, 9)
        }
      })
      
      console.log('处理后的关注用户列表:', followList.value)
    } else {
      ElMessage.warning(result.msg || '暂无关注数据')
      followList.value = []
    }
  } catch (error) {
    console.error('获取关注列表失败:', error)
    ElMessage.error('获取关注列表失败，请稍后重试')
    followList.value = []
  } finally {
    loading.value = false
  }
}

// 取消关注
const handleCancelFollow = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消关注"${user.username || '该用户'}"吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const userId = user.userId || user.id
    if (!userId) {
      ElMessage.error('无法获取用户ID')
      return
    }
    
    cancelingFollow.value = userId
    
    // 调用关注接口取消关注
    const result = await userApi.followUser(userId)
    
    if (result.code === 0) {
      ElMessage.success('已取消关注')
      // 从本地列表中移除该用户
      followList.value = followList.value.filter(item => 
        (item.userId !== userId) && (item.id !== userId)
      )
    } else {
      ElMessage.error(result.msg || '取消关注失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消关注失败:', error)
      ElMessage.error('取消关注失败')
    }
  } finally {
    cancelingFollow.value = null
  }
}

// 查看用户（新标签页打开）
const handleViewUser = (user) => {
  const userId = user.userId || user.id
  if (!userId) {
    ElMessage.warning('无法获取用户ID')
    return
  }
  
  // 在新标签页打开用户主页
  try {
    window.open(`/user/${userId}`, '_blank')
  } catch (error) {
    console.error('导航失败:', error)
    ElMessage.warning('暂不支持查看用户详情')
  }
}

// 格式化时间
const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  
  try {
    const now = new Date()
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return '未知时间'
    }
    
    const diffInMs = now - date
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 1) {
      return '今天'
    } else if (diffInDays < 7) {
      return `${diffInDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit'
      })
    }
  } catch (e) {
    return '未知时间'
  }
}
</script>

<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="followed-users-page">
    <div class="page-header">
      <h2 class="page-title">我的关注</h2>
    </div>
    
    <!-- 关注用户列表 -->
    <div class="followed-list-container">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <!-- 空列表 -->
      <div v-else-if="followList.length === 0" class="empty-container">
        <el-empty description="暂无关注的用户">
          <el-button type="primary" @click="router.push('/blogs')">浏览更多用户</el-button>
        </el-empty>
      </div>
      
      <!-- 关注用户列表 -->
      <div v-else class="user-list">
        <div 
          v-for="user in followList" 
          :key="user.id"
          class="user-item"
        >
          <!-- 用户头像 -->
          <div class="user-avatar" @click="handleViewUser(user)">
            <el-avatar :size="60" :src="user.avatar">
              {{ (user.username || 'User').charAt(0).toUpperCase() }}
            </el-avatar>
          </div>
          
          <!-- 用户信息 -->
          <div class="user-info" @click="handleViewUser(user)">
            <h3 class="user-name">{{ user.username || '未知用户' }}</h3>
            <div class="user-meta">
              <!-- <div class="follow-count">
                <span class="count-label">关注：</span>
                <span class="count-value">{{ user.followCount || 0 }}</span>
              </div> -->
              <div class="fans-count">
                <span class="count-label">粉丝：</span>
                <span class="count-value">{{ user.fans || 0 }}</span>
              </div>
              <div class="follow-time" v-if="user.followTime">
                关注于 {{ formatDate(user.followTime) }}
              </div>
            </div>
            <div v-if="user.bio" class="user-bio">{{ user.bio }}</div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="user-actions">
            <!-- 暂时隐藏查看按钮，因为暂不支持查看用户详情 -->
            <!-- <el-button 
              type="primary"
              size="small"
              plain
              @click="handleViewUser(user)"
              title="查看用户"
            >
              <el-icon><User /></el-icon>
              查看
            </el-button> -->
            
            <el-button 
              type="danger"
              size="small"
              plain
              @click="handleCancelFollow(user)"
              :loading="cancelingFollow === (user.userId || user.id)"
              title="取消关注"
            >
              <el-icon><Close /></el-icon>
              取消关注
            </el-button>
          </div>
        </div>
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
  background-color: var(--pixel-bg-primary);
}

.followed-users-page {
  flex: 1;
  max-width: 900px;
  padding: 20px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  color: var(--pixel-text-primary);
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.loading-container, .empty-container {
  padding: 40px;
  text-align: center;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-radius: 0;
  background-color: var(--pixel-bg-card);
  box-shadow: 4px 4px 0 #000;
  transition: all 0.3s;
  border: 2px solid #000;
}

.user-item:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0 #000;
}

.user-avatar {
  margin-right: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.user-name {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--pixel-text-secondary);
}

.follow-count, .fans-count {
  display: flex;
  align-items: center;
}

.count-label {
  margin-right: 2px;
  color: var(--pixel-text-muted);
}

.count-value {
  font-weight: 500;
  color: var(--pixel-primary-light);
}

.follow-time {
  color: var(--pixel-text-muted);
}

.user-bio {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin-top: 8px;
  white-space: pre-line;
  line-height: 1.5;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
  flex-shrink: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .user-item {
    flex-direction: column;
  }
  
  .user-avatar {
    margin-right: 0;
    margin-bottom: 16px;
  }
  
  .user-actions {
    flex-direction: row;
    margin-left: 0;
    margin-top: 16px;
  }
}
</style> 