<script setup>
/**
 * @description 个人中心侧边栏组件
 * @author worlt
 * 
 * 提供统一的个人中心导航侧边栏，支持：
 * - 用户头像和用户名显示
 * - 菜单项导航
 * - 当前页面高亮
 * - 折叠/展开功能
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useUserInfoStore } from '@/stores/userInfo.js'

// 路由
const router = useRouter()
const route = useRoute()

// 用户信息
const userInfoStore = useUserInfoStore()

// 侧边栏折叠状态
const isCollapsed = ref(false)

// 用户头像
const userAvatar = computed(() => {
  return userInfoStore.info?.avatar || ''
})

// 用户名
const username = computed(() => {
  return userInfoStore.info?.username || '用户'
})

// 当前路径
const currentPath = computed(() => route.path)

// 菜单项配置
const menuItems = [
  { name: '个人资料', icon: 'mdi:account-circle', path: '/my-profile' },
  { name: '我的博客', icon: 'mdi:file-document', path: '/my-blogs' },
  { name: '我的收藏', icon: 'mdi:star', path: '/my-collections' },
  { name: '我的点赞', icon: 'mdi:thumb-up', path: '/liked' },
  { name: '我的关注', icon: 'mdi:account-heart', path: '/my-follows' },
  { name: '我的粉丝', icon: 'mdi:account-group', path: '/my-followers' },
  { name: '浏览历史', icon: 'mdi:history', path: '/history' }
]

// 切换折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 导航到指定页面
const navigateTo = (path) => {
  if (currentPath.value !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="user-center-sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 用户信息区 -->
    <div class="user-info" @click="navigateTo('/my-profile')">
      <el-avatar 
        :size="isCollapsed ? 40 : 60" 
        :src="userAvatar"
        class="user-avatar"
      >
        <Icon icon="mdi:account" :style="{ fontSize: isCollapsed ? '20px' : '30px' }" />
      </el-avatar>
      <span v-show="!isCollapsed" class="username">{{ username }}</span>
    </div>
    
    <!-- 分割线 -->
    <div class="sidebar-divider"></div>
    
    <!-- 菜单列表 -->
    <div class="sidebar-menu">
      <div 
        v-for="item in menuItems" 
        :key="item.path"
        class="menu-item"
        :class="{ active: currentPath === item.path }"
        :title="isCollapsed ? item.name : ''"
        @click="navigateTo(item.path)"
      >
        <Icon :icon="item.icon" class="menu-icon" />
        <span v-show="!isCollapsed" class="menu-text">{{ item.name }}</span>
      </div>
    </div>
    
    <!-- 折叠按钮 -->
    <div class="collapse-btn" @click="toggleCollapse">
      <Icon :icon="isCollapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'" />
    </div>
  </div>
</template>

<style scoped>
.user-center-sidebar {
  width: 200px;
  min-height: calc(100vh - 80px);
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  flex-shrink: 0;
}

.user-center-sidebar.collapsed {
  width: 60px;
}

/* 用户信息区 */
.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-avatar {
  border: 2px solid #409eff;
  transition: all 0.3s ease;
}

.username {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 分割线 */
.sidebar-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #e4e7ed, transparent);
  margin: 0 15px 10px;
}

/* 菜单列表 */
.sidebar-menu {
  flex: 1;
  padding: 0 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #606266;
}

.menu-item:hover {
  background-color: #ecf5ff;
  color: #409eff;
}

.menu-item.active {
  background-color: #409eff;
  color: #fff;
}

.menu-item.active .menu-icon {
  color: #fff;
}

.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: color 0.2s;
}

.menu-text {
  margin-left: 12px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 折叠按钮 */
.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.collapse-btn:hover {
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
}

/* 折叠状态下的样式调整 */
.collapsed .user-info {
  padding: 15px 10px;
}

.collapsed .menu-item {
  justify-content: center;
  padding: 12px;
}

.collapsed .sidebar-divider {
  margin: 0 10px 10px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .user-center-sidebar {
    width: 60px;
  }
  
  .user-center-sidebar .username,
  .user-center-sidebar .menu-text {
    display: none;
  }
  
  .user-center-sidebar .menu-item {
    justify-content: center;
    padding: 12px;
  }
  
  .collapse-btn {
    display: none;
  }
}
</style>
