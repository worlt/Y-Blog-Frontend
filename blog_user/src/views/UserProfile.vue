<script setup>
import { ref, reactive, onMounted, onBeforeMount, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import * as userApi from '@/api/user.js'
import * as messageApi from '@/api/message.js'
import ReportDialog from '@/components/ReportDialog.vue'

// 路由对象
const router = useRouter()
const route = useRoute()

// 用户信息
const userForm = reactive({
  id: '',
  username: '',
  email: '',
  avatar: '',
  phone: '',
  gender: null,
  fans: 0,
  role: null,
  createTime: null,
  updateTime: null
})

// 个人统计数据
const userStats = reactive({
  blogCount: 0,
  followCount: 0,
  fansCount: 0,
  likeCount: 0,
  viewCount: 0
})

// 关注状态
const isFollowing = ref(false)
const followLoading = ref(false)

const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()
const isLoggedIn = computed(() => !!tokenStore.getToken())
const currentUserId = computed(() => userInfoStore.info?.id)

// 举报相关
const showReportDialog = ref(false)
const reportType = ref('user')
const reportTargetId = ref(0)

const openReportDialog = () => {
   if (!isLoggedIn.value) {
     ElMessage.warning('请先登录')
     // 简单的跳转登录逻辑，实际项目中可能有更复杂的鉴权弹窗
     router.push('/login') 
     return
   }
   
   if (currentUserId.value === userForm.id) {
     ElMessage.warning('不能举报自己')
     return;
   }
   
   reportType.value = 'user'
   reportTargetId.value = userForm.id
   showReportDialog.value = true
}

// 初始化
onBeforeMount(() => {
  // 从路由参数获取用户ID
  const userId = route.params.userId
  if (!userId || isNaN(Number(userId))) {
    router.replace('/notfound?type=user')
    return
  }
})

onMounted(async () => {
  await loadUserProfile()
  await loadUserStats()
  await checkFollowStatus()
})

// 加载用户个人资料
const loadUserProfile = async () => {
  try {
    const userId = route.params.userId
    const result = await userApi.getUserProfileById(userId)
    
    if (result.code === 0 && result.data) {
      const profile = result.data
      
      // 填充表单数据
      userForm.id = profile.id
      userForm.username = profile.username || ''
      userForm.email = profile.email || ''
      userForm.avatar = profile.avatar || ''
      userForm.phone = profile.phone || ''
      userForm.gender = profile.gender
      userForm.fans = profile.fans || 0
      userForm.role = profile.role
      userForm.createTime = profile.createTime
      userForm.updateTime = profile.updateTime
    } else {
      // 用户不存在或获取失败，跳转到 NotFound 页面
      router.replace('/notfound?type=user')
    }
  } catch (error) {
    console.error('获取用户资料失败:', error)
    // 请求异常（含用户不存在 HTTP 500），跳转到 NotFound 页面
    router.replace('/notfound?type=user')
  }
}

// 加载用户统计信息
const loadUserStats = async () => {
  try {
    const userId = route.params.userId
    // 使用getUserStats API获取所有用户统计信息
    const result = await userApi.getUserStats(userId)
    
    if (result.code === 0 && result.data) {
      // 设置统计数据
      userStats.blogCount = result.data.blogCount || 0
      userStats.followCount = result.data.followCount || 0
      userStats.fansCount = result.data.fansCount || 0
      userStats.likeCount = result.data.likeCount || 0
      userStats.viewCount = result.data.viewCount || 0
    } else {
      console.error('获取用户统计信息失败:', result.msg)
      // 设置默认值
      userStats.blogCount = 0
      userStats.followCount = 0
      userStats.fansCount = userForm.fans || 0
      userStats.likeCount = 0
      userStats.viewCount = 0
    }
  } catch (error) {
    console.error('获取用户统计信息失败:', error)
    // 设置默认值
    userStats.blogCount = 0
    userStats.followCount = 0
    userStats.fansCount = userForm.fans || 0
    userStats.likeCount = 0
    userStats.viewCount = 0
  }
}

// 检查关注状态
const checkFollowStatus = async () => {
  try {
    const userId = route.params.userId
    const result = await userApi.isFollowed(userId)
    
    if (result.code === 0) {
      isFollowing.value = result.data
    } else {
      console.error('获取关注状态失败:', result.msg)
    }
  } catch (error) {
    console.error('获取关注状态失败:', error)
  }
}

// 关注/取消关注用户
const toggleFollow = async () => {
  followLoading.value = true
  try {
    const userId = route.params.userId
    const result = await userApi.followUser(userId)
    
    if (result.code === 0) {
      isFollowing.value = !isFollowing.value
      // 更新粉丝数
      if (isFollowing.value) {
        userStats.fansCount += 1
      } else {
        userStats.fansCount = Math.max(0, userStats.fansCount - 1)
      }
      ElMessage.success(isFollowing.value ? '关注成功' : '已取消关注')
    } else {
      ElMessage.error(result.msg || '操作失败')
    }
  } catch (error) {
    console.error('关注/取消关注失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    followLoading.value = false
  }
}

// 处理私信 - 创建/匹配会话后跳转到消息页面
const handleSendMessage = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    router.push('/auth')
    return
  }
  
  try {
    const userId = route.params.userId
    const result = await messageApi.createPrivateConversation(userId)
    if (result.code === 0 && result.data) {
      // 跳转到消息页面并传递会话ID
      router.push({ path: '/messages', query: { conversationId: result.data } })
    } else {
      ElMessage.error(result.msg || '创建会话失败')
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  }
}

// 查看用户的博客
const viewUserBlogs = () => {
  router.push({
    path: '/blogs',
    query: { userId: userForm.id }
  })
}

// 查看用户的关注
const viewUserFollows = () => {
  router.push(`/followed-users/${userForm.id}`)
}

// 查看用户的粉丝
const viewUserFans = () => {
  router.push(`/followers/${userForm.id}`)
}

// 格式化性别显示
const formatGender = (gender) => {
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return '保密'
}

// 格式化角色显示
const getRoleName = (role) => {
  if (role === 2) return '普通用户'
  if (role === 3) return 'VIP用户'
  return '未知'
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="profile-page">
    <!-- 用户个人资料卡片 -->
    <div class="profile-card">
      <div class="profile-header">
        <!-- 个人资料标题 -->
        <div class="header-title">
          <h2 class="title">用户资料</h2>
          <div class="actions">
            <el-button 
              :type="isFollowing ? 'danger' : 'primary'"
              @click="toggleFollow"
              :loading="followLoading"
              v-if="currentUserId !== userForm.id"
            >
              {{ isFollowing ? '取消关注' : '关注' }}
            </el-button>
            <el-button 
              type="success"
              plain
              @click="handleSendMessage"
              v-if="currentUserId !== userForm.id"
            >
              ✉ 
            </el-button>
            <el-button 
              type="warning"
              plain
              @click="openReportDialog"
              v-if="currentUserId !== userForm.id"
            >
              举报
            </el-button>
          </div>
        </div>
        
        <!-- 头像和基本信息 -->
        <div class="profile-info">
          <!-- 头像 -->
          <div class="avatar-container">
            <div class="avatar-wrapper">
              <el-avatar :size="100" :src="userForm.avatar" />
            </div>
          </div>
          
          <!-- 用户名和简介 -->
          <div class="basic-info">
            <h2 class="username">{{ userForm.username }}</h2>
            <p class="bio">这个人很懒，什么都没留下...</p>
          </div>
        </div>
      </div>
      
      <!-- 统计数据 -->
      <div class="stats-container">
        <div class="stat-item" @click="viewUserBlogs">
          <div class="stat-value">{{ userStats.blogCount }}</div>
          <div class="stat-label">博客</div>
        </div>
        
<!--        <div class="stat-item" @click="viewUserFollows">-->
        <div class="stat-item">
          <div class="stat-value">{{ userStats.followCount }}</div>
          <div class="stat-label">关注</div>
        </div>
        
<!--        <div class="stat-item" @click="viewUserFans">-->
        <div class="stat-item">
          <div class="stat-value">{{ userStats.fansCount }}</div>
          <div class="stat-label">粉丝</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ userStats.likeCount }}</div>
          <div class="stat-label">获赞</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-value">{{ userStats.viewCount }}</div>
          <div class="stat-label">总浏览</div>
        </div>
      </div>
      
      <!-- 详细资料 -->
      <div class="detail-container">
        <h3 class="section-title">详细资料</h3>
        
        <div class="detail-content">
          <div class="detail-row">
            <div class="detail-label">邮箱</div>
            <div class="detail-value">{{ userForm.email || '未设置' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">性别</div>
            <div class="detail-value">{{ formatGender(userForm.gender) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">用户角色</div>
            <div class="detail-value">{{ getRoleName(userForm.role) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">注册时间</div>
            <div class="detail-value">{{ userForm.createTime ? formatDate(userForm.createTime) : '未知' }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 举报弹窗 -->
    <ReportDialog
      v-model:visible="showReportDialog"
      :report-type="reportType"
      :target-id="reportTargetId"
    />
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  border: 4px solid #000;
  box-shadow: 6px 6px 0 #000;
  padding: 30px;
  margin-bottom: 20px;
  color: var(--pixel-text-primary);
}

.profile-header {
  margin-bottom: 30px;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 10px;
}

.profile-info {
  display: flex;
  gap: 30px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.basic-info {
  flex: 1;
}

.username {
  font-size: 20px;
  margin: 0 0 10px 0;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.bio {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.stats-container {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  border-top: 1px solid #f0f2f5;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 30px;
}

.stat-item {
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-item:hover {
  color: var(--pixel-primary-light);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.stat-item:hover .stat-value {
  color: var(--pixel-primary-light);
}

.stat-label {
  font-size: 14px;
  color: var(--pixel-text-secondary);
  margin-top: 5px;
}

.section-title {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 600;
}

.detail-row {
  display: flex;
  margin-bottom: 20px;
  align-items: center;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  width: 100px;
  font-size: 14px;
  color: var(--pixel-text-secondary);
  line-height: 32px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 14px;
  color: var(--pixel-text-primary);
  flex: 1;
}

@media (max-width: 768px) {
  .profile-info {
    flex-direction: column;
    align-items: center;
  }
  
  .basic-info {
    text-align: center;
    margin-top: 15px;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .detail-label {
    width: auto;
    margin-bottom: 8px;
  }
  
  .detail-value {
    width: 100%;
  }
}
</style> 