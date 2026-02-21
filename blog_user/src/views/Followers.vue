<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import * as userApi from '@/api/user.js'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'

const router = useRouter()

// 粉丝列表
const fansList = ref([])

// 加载状态
const loading = ref(false)

// 关注状态跟踪
const followingStatus = ref({})

onMounted(() => {
  loadFollowers()
})

// 加载粉丝列表
const loadFollowers = async () => {
  loading.value = true
  try {
    const result = await userApi.getFans()
    
    if (result.code === 0 && result.data) {
      fansList.value = result.data || []
      
      // 更新关注状态
      updateFollowStatus()
    } else {
      ElMessage.error('获取粉丝列表失败')
      fansList.value = []
    }
  } catch (error) {
    console.error('获取粉丝列表失败:', error)
    ElMessage.error('获取粉丝列表失败')
    fansList.value = []
  } finally {
    loading.value = false
  }
}

// 更新关注状态
const updateFollowStatus = async () => {
  // 获取所有粉丝的关注状态
  for (const fan of fansList.value) {
    try {
      const userId = fan.userId || fan.id
      const result = await userApi.isFollowed(userId)
      if (result.code === 0) {
        followingStatus.value[userId] = result.data
      }
    } catch (error) {
      console.error(`获取用户${fan.userId || fan.id}的关注状态失败:`, error)
    }
  }
}

// 关注/取消关注
const handleToggleFollow = async (user) => {
  const userId = user.userId || user.id
  try {
    // 设置加载状态
    followingStatus.value = {
      ...followingStatus.value,
      [userId]: { loading: true, followed: followingStatus.value[userId]?.followed }
    }
    
    // 调用关注接口
    const result = await userApi.followUser(userId)
    
    if (result.code === 0) {
      // 切换关注状态
      const isNowFollowing = !followingStatus.value[userId]?.followed
      followingStatus.value[userId] = {
        loading: false,
        followed: isNowFollowing
      }
      
      ElMessage.success(isNowFollowing ? '已关注' : '已取消关注')
    } else {
      ElMessage.error(result.msg || '操作失败')
    }
  } catch (error) {
    console.error('关注/取消关注失败:', error)
    ElMessage.error('操作失败')
  } finally {
    // 清除加载状态
    if (followingStatus.value[userId]) {
      followingStatus.value[userId].loading = false
    }
  }
}

// 查看用户（新标签页打开）
const handleViewUser = (user) => {
  // 在新标签页打开用户主页
  window.open(`/user/${user.userId || user.id}`, '_blank')
}

// 格式化时间
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const now = new Date()
  const date = new Date(dateString)
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
}
</script>

<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="followers-page">
    <div class="page-header">
      <h2 class="page-title">我的粉丝</h2>
    </div>
    
    <!-- 粉丝列表 -->
    <div class="followers-list-container">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <!-- 空列表 -->
      <div v-else-if="fansList.length === 0" class="empty-container">
        <el-empty description="暂无粉丝">
          <el-button type="primary" @click="router.push('/blogs')">去发布更多博客</el-button>
        </el-empty>
      </div>
      
      <!-- 粉丝列表 -->
      <div v-else class="user-list">
        <div 
          v-for="user in fansList" 
          :key="user.userId || user.id"
          class="user-item"
        >
          <!-- 用户头像 -->
          <div class="user-avatar" @click="handleViewUser(user)">
            <el-avatar :size="60" :src="user.avatar">
              <span v-if="!user.avatar">{{ user.username?.charAt(0).toUpperCase() }}</span>
            </el-avatar>
          </div>
          
          <!-- 用户信息 -->
          <div class="user-info" @click="handleViewUser(user)">
            <h3 class="user-name">{{ user.username }}</h3>
            <div class="user-meta">
              <div class="fans-count">
                <span class="count-label">粉丝：</span>
                <span class="count-value">{{ user.fans !== undefined ? user.fans : '--' }}</span>
              </div>
              <div class="follow-time" v-if="user.followTime">
                关注于 {{ formatDate(user.followTime) }}
              </div>
            </div>
            <div v-if="user.bio" class="user-bio">{{ user.bio }}</div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="user-actions">
            <el-button 
              type="primary"
              size="small"
              @click="handleViewUser(user)"
              title="查看用户"
              plain
            >
              <el-icon><User /></el-icon>
              查看
            </el-button>
            
            <el-button 
              :type="(user.isFollowed || followingStatus[user.userId || user.id]?.followed) ? 'info' : 'success'"
              size="small"
              @click="handleToggleFollow(user)"
              :loading="followingStatus[user.userId || user.id]?.loading"
              plain
            >
              <el-icon><User /></el-icon>
              {{ (user.isFollowed || followingStatus[user.userId || user.id]?.followed) ? '已关注' : '关注' }}
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

.followers-page {
  flex: 1;
  max-width: 900px;
  padding: 20px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  color: var(--pixel-text-primary);
  margin: 0;
  font-size: 26px;
}

.loading-container {
  padding: 20px;
}

.empty-container {
  padding: 60px 0;
  text-align: center;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 0;
  background-color: var(--pixel-bg-card);
  box-shadow: 3px 3px 0 #000;
  transition: box-shadow 0.3s;
  border: 2px solid #000;
}

.user-item:hover {
  box-shadow: 4px 4px 0 #000;
}

.user-avatar {
  margin-right: 20px;
  cursor: pointer;
}

.user-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.user-name {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--pixel-text-primary);
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--pixel-text-secondary);
}

.user-bio {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
}

.el-button+.el-button {
  margin-left: 0
}

/* 统一按钮宽度 */
.user-actions .el-button {
  width: 90px;
  justify-content: center;
}

/* 按钮全局覆盖以解决白色背景不可见问题 */
:deep(.el-button) {
  font-family: 'Pixel', 'Zpix', 'Minecraft', sans-serif !important;
  border-radius: 0 !important;
  border: 2px solid #000 !important;
  box-shadow: 2px 2px 0 #000 !important;
  transition: transform 0.1s, box-shadow 0.1s !important;
}

:deep(.el-button:hover) {
  transform: translate(2px, 2px) !important;
  box-shadow: 0 0 0 #000 !important;
}

:deep(.el-button--default), :deep(.el-button.is-plain) {
  background-color: var(--pixel-bg-primary) !important;
  color: var(--pixel-text-primary) !important;
}

:deep(.el-button--primary) {
  background-color: var(--pixel-primary) !important;
  color: #fff !important;
}

:deep(.el-button--success.is-plain), :deep(.el-button--info.is-plain) {
  background-color: var(--pixel-bg-card) !important;
  color: var(--pixel-text-primary) !important;
  border-color: #000 !important;
}

:deep(.el-button--success.is-plain:hover), :deep(.el-button--info.is-plain:hover) {
  background-color: var(--pixel-bg-secondary) !important;
}
</style> 