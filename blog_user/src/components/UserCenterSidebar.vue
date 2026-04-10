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
        <span class="avatar-fallback-text">{{ (username || 'U').charAt(0).toUpperCase() }}</span>
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
  height: calc(100vh - 80px);
  background-color: var(--pixel-bg-card);
  border-right: 4px solid #000;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: sticky;
  top: 0;
  flex-shrink: 0;
  box-shadow: 4px 4px 0 #000;
  z-index: 20;
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
  border-bottom: 4px solid #000;
}

.user-info:hover {
  background-color: var(--pixel-bg-secondary);
}

.user-avatar {
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  transition: all 0.3s ease;
}

.username {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--pixel-text-primary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 分割线 */
.sidebar-divider {
  height: 4px;
  background: #000;
  margin: 0 10px 10px;
}

/* 菜单列表 */
.sidebar-menu {
  flex: 1;
  padding: 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.1s ease;
  color: var(--pixel-text-secondary);
  border: 2px solid transparent;
  font-size: 16px;
}

.menu-item:hover {
  background-color: var(--pixel-bg-secondary);
  color: var(--pixel-text-primary);
  border: 2px solid #000;
}

.menu-item.active {
  background-color: var(--pixel-primary);
  color: #fff;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
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
  background-color: var(--pixel-primary);
  border: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  box-shadow: 2px 2px 0 #000;
  color: #fff;
}

.collapse-btn:hover {
  background-color: var(--pixel-primary-dark);
  transform: translateY(-50%) translate(1px, 1px);
  box-shadow: 1px 1px 0 #000;
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
