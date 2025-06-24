<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Close } from '@element-plus/icons-vue'
import * as userApi from '@/api/user.js'

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
    const result = await userApi.getFollows()
    
    if (result.code === 0 && result.data) {
      followList.value = result.data || []
    } else {
      ElMessage.error('获取关注列表失败')
      followList.value = []
    }
  } catch (error) {
    console.error('获取关注列表失败:', error)
    ElMessage.error('获取关注列表失败')
    followList.value = []
  } finally {
    loading.value = false
  }
}

// 取消关注
const handleCancelFollow = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消关注"${user.username}"吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    cancelingFollow.value = user.id
    
    // 调用关注接口取消关注
    const result = await userApi.followUser(user.userId || user.id)
    
    if (result.code === 0) {
      ElMessage.success('已取消关注')
      loadFollowedUsers() // 重新加载列表
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

// 查看用户
const handleViewUser = (user) => {
  // 跳转到用户主页或个人资料页
  router.push(`/user/${user.userId || user.id}`)
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
  <div class="followed-users-page">
    <div class="page-header">
      <h2 class="page-title">我的关注</h2>
    </div>
    
    <!-- 关注用户列表 -->
    <div class="followed-list-container">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <!-- 空列表 -->
      <div v-else-if="followList.length === 0" class="empty-container">
        <el-empty description="暂无关注的用户">
          <el-button type="primary" @click="router.push('/blogs')">去关注更多用户</el-button>
        </el-empty>
      </div>
      
      <!-- 关注用户列表 -->
      <div v-else class="user-list">
        <div 
          v-for="user in followList" 
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
              <div class="follow-count">
                <span class="count-label">关注：</span>
                <span class="count-value">{{ user.followCount || '--' }}</span>
              </div>
              <div class="fans-count">
                <span class="count-label">粉丝：</span>
                <span class="count-value">{{ user.fansCount || '--' }}</span>
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
              icon="User"
              size="small"
              @click="handleViewUser(user)"
              title="查看用户"
              plain
            >
              查看
            </el-button>
            
            <el-button 
              type="danger"
              icon="Close"
              size="small"
              @click="handleCancelFollow(user)"
              :loading="cancelingFollow === (user.userId || user.id)"
              title="取消关注"
              plain
            >
              取消关注
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.followed-users-page {
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

.page-title {
  color: #333;
  margin: 0;
  font-size: 24px;
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
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
  transition: box-shadow 0.3s;
}

.user-item:hover {
  box-shadow: 0 4px 16px 0 rgba(0,0,0,0.1);
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
  color: #333;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.user-bio {
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 16px;
}
</style> 