<script setup>
import { ref, reactive, onMounted, nextTick, onUnmounted, watch, onBeforeUnmount } from 'vue'
import router from '@/router/index.js'
import { getAllCategories } from '@/api/category.js'
import { getBlogPage, getHotBlogs, getRecommendedBlogs } from '@/api/blog.js'
import { Icon } from '@iconify/vue'
import AuthDialog from '@/components/AuthDialog.vue'

import { useTokenStore } from '@/stores/token.js'
import { ElMessage } from 'element-plus'
import eyeIcon from '@iconify/icons-mdi/eye'
import heartIcon from '@iconify/icons-mdi/heart'
import starIcon from '@iconify/icons-mdi/star'
import loadingIcon from '@iconify/icons-mdi/loading'
import homeIcon from '@iconify/icons-mdi/home'
import accountHeartIcon from '@iconify/icons-mdi/account-heart'
import thumbUpIcon from '@iconify/icons-mdi/thumb-up'
import bookmarkIcon from '@iconify/icons-mdi/bookmark'
import historyIcon from '@iconify/icons-mdi/history'
import menuIcon from '@iconify/icons-mdi/menu'

// 分类数据
const categories = ref([]);
const currentCategoryId = ref(null);

// 侧边栏折叠状态
const sidebarCollapsed = ref(false);

// 登录弹窗状态
const showAuthDialog = ref(false);

// token store
const tokenStore = useTokenStore();

// 博客列表数据（最新文章）
const blogList = ref([]);
const loading = ref(false);

// 热门博客列表（按浏览量排序）
const hotBlogList = ref([]);

// 推荐阅读列表（置顶文章）
const recommendList = ref([]);

// 是否还有更多数据
const hasMore = ref(true);

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 15, // 每页条数
  categoryId: null
});

// 滚动加载定时器，防止多次触发
let scrollTimer = null;
// 防止连续加载的冷却期
let loadCooldown = false;
// 滚动容器引用
const scrollContainer = ref(null);

// 记录是否是手动触发的resize事件
let isManualResize = false;

// 窗口大小变化处理函数
const handleResize = () => {
  // 避免无限递归：只有当不是手动触发的事件才重新触发
  if (!isManualResize) {
    isManualResize = true;
    // 触发el-affix重新计算位置
    window.dispatchEvent(new Event('resize'));
    // 设置一个短暂的延时后重置标志
    setTimeout(() => {
      isManualResize = false;
    }, 100);
  }
};

// 手动触发一次resize事件的函数
const triggerResize = () => {
  isManualResize = true;
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => {
    isManualResize = false;
  }, 100);
};

// 获取所有分类
const fetchAllCategories = async () => {
  try {
    const result = await getAllCategories();
    if (result.code === 0) {
      // 在分类列表前添加"全部"选项
      const allCategory = { id: null, name: '全部' };
      categories.value = [allCategory, ...result.data];
    }
  } catch (error) {
    console.error('获取分类失败');
  }
};

// 分页查询博客
const fetchBlogList = async (reset = false, isLoadMore = false) => {
  // 如果处于冷却期，直接返回
  if (loadCooldown) return;

  if (loading.value) return;

  loading.value = true;

  try {
    let currentPage;
    if (isLoadMore) {
      currentPage = queryParams.page + 1;
    } else if (reset) {
      currentPage = 1;
      queryParams.page = 1;
    } else {
      currentPage = queryParams.page;
    }

    const params = {
      ...queryParams,
      page: currentPage,
      ignoreTop: true  // 最新文章不按置顶优先排序
    };

    const result = await getBlogPage(params);

    if (result.code === 0) {
      const { records, total } = result.data;

      if (reset || !isLoadMore) {
        blogList.value = records;
        queryParams.page = 1;
      } else {
        blogList.value = [...blogList.value, ...records];
      }

      queryParams.page = currentPage;

      // 判断是否还有更多数据
      if (total !== undefined) {
        const totalPages = Math.ceil(total / queryParams.pageSize);
        hasMore.value = queryParams.page < totalPages;
      } else {
        hasMore.value = records.length === queryParams.pageSize;
      }

      // 设置加载冷却期，防止连续加载
      loadCooldown = true;
      setTimeout(() => {
        loadCooldown = false;
        
        // 检查是否需要继续加载（如果内容不足以填满容器）
        setTimeout(() => {
          checkAndLoadMoreIfNeeded();
        }, 300);
      }, 500);
    }
  } catch (error) {
    console.error('获取博客列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取热门博客列表（按浏览量排序）
const fetchHotBlogs = async () => {
  try {
    const result = await getHotBlogs({ page: 1, pageSize: 5 });
    if (result.code === 0) {
      hotBlogList.value = result.data.records || [];
    }
  } catch (error) {
    console.error('获取热门博客失败');
  }
};

// 获取推荐阅读列表（置顶博客）
const fetchRecommendedBlogs = async () => {
  try {
    const result = await getRecommendedBlogs({ page: 1, pageSize: 8 });
    if (result.code === 0) {
      recommendList.value = result.data.records || [];
    }
  } catch (error) {
    console.error('获取推荐阅读失败');
  }
};

// 检查是否需要继续加载更多
const checkAndLoadMoreIfNeeded = () => {
  // 如果数据已经加载完，或者正在加载，则不执行
  if (!hasMore.value || loading.value || loadCooldown) return;
  
  // 获取滚动容器
  const container = document.querySelector('.el-main') || document.documentElement;
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;
  
  // 如果内容不足以产生滚动，并且还有更多数据可以加载，则继续加载
  if (scrollHeight <= clientHeight && hasMore.value) {
    loadMore();
  }
};

// 滚动加载处理函数
const lazyLoad = () => {
  if (loading.value || !hasMore.value || scrollTimer || loadCooldown) {
    return;
  }

  // 获取正确的滚动容器 - 优先使用el-main元素，退化使用document
  const container = document.querySelector('.el-main') || document.documentElement;
  const scrollTop = container.scrollTop;
  const clientHeight = container.clientHeight;
  const scrollHeight = container.scrollHeight;

  // 计算距离底部的距离
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

  // 当距离底部小于200px时触发加载
  if (distanceFromBottom <= 200) {
    scrollTimer = setTimeout(() => {
      loadMore();
      scrollTimer = null;
    }, 300); // 增加防抖延迟时间
  }
};

// 加载更多数据
const loadMore = () => {
  if (!hasMore.value || loading.value || loadCooldown) {
    return;
  }

  fetchBlogList(false, true);
};

// 切换分类
const switchCategory = (categoryId) => {
  currentCategoryId.value = categoryId;
  queryParams.categoryId = categoryId;
  queryParams.page = 1;
  hasMore.value = true; // 重置hasMore状态
  fetchBlogList(true);
};

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

// 跳转到博客详情（新标签页打开，保留用户当前浏览位置）
const goToBlogDetail = (blogId) => {
  window.open(`/blog/${blogId}`, '_blank');
};

// 处理需要登录的操作
const handleAuthRequiredAction = (action) => {
  if (!isLoggedIn()) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再进行此操作');
    return false;
  }
  return true;
};

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined';
};

// 随机渐变背景数组（多色系协调配色）
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // 紫色
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',  // 粉红
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',  // 天蓝
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',  // 青绿
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',  // 橙粉
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',  // 青紫
  'linear-gradient(135deg, #a8eb12 0%, #58c322 100%)',  // 草绿
  'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',  // 橙红
  'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)',  // 蓝紫
  'linear-gradient(135deg, #08aeea 0%, #2af598 100%)',  // 蓝绿
  'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',  // 橙黄
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'   // 紫粉
];

// 根据博客ID获取固定的渐变背景（确保同一博客每次显示相同的渐变）
const getRandomGradient = (blogId) => {
  const index = blogId % gradients.length;
  return gradients[index];
};

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.style.display = 'none';
  const imageContainer = event.target.closest('.article-image, .recommend-image');
  if (imageContainer) {
    imageContainer.style.display = 'none';
  }
};

// 左侧导航菜单数据
const sideMenuItems = ref([
  { name: '首页', icon: homeIcon, path: '/index', active: true, requireAuth: false },
  { name: '关注', icon: accountHeartIcon, path: '/my-follows', requireAuth: true },
  { name: '点赞', icon: thumbUpIcon, path: '/liked', requireAuth: true },
  { name: '收藏', icon: bookmarkIcon, path: '/my-collections', requireAuth: true },
  { name: '历史', icon: historyIcon, path: '/history', requireAuth: true }
]);

// 检查用户是否登录
const isLoggedIn = () => {
  return tokenStore.token && tokenStore.token.trim() !== '';
};

// 初始化活跃菜单项
const initActiveMenuItem = () => {
  const currentPath = router.currentRoute.value.path;
  sideMenuItems.value.forEach(item => {
    item.active = item.path === currentPath;
  });
};

// 侧边栏导航处理
const handleSideMenuClick = (item) => {
  // 检查是否需要登录
  if (item.requireAuth && !isLoggedIn()) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再访问该功能');
    return;
  }

  // 如果已经在当前路由，刷新页面
  if (router.currentRoute.value.path === item.path) {
    router.go(0);
    return;
  }

  // 更新活跃状态
  sideMenuItems.value.forEach(menu => menu.active = false);
  item.active = true;

  // 路由跳转
  router.push(item.path);
};

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  // 侧边栏状态变化后，需要触发重新计算
  nextTick(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// 处理登录成功
const handleLoginSuccess = (userData) => {
  ElMessage.success('登录成功');
  // 可以在这里刷新用户相关数据
};

// 处理创作按钮点击
const handleCreateClick = () => {
  if (!isLoggedIn()) {
    showAuthDialog.value = true;
    ElMessage.warning('请先登录后再进行创作');
    return;
  }
  router.push('/write');
};

// 监听自定义登录事件
const setupAuthDialogListener = () => {
  window.addEventListener('show-auth-dialog', handleShowAuthDialog);
};

// 显示登录弹窗
const handleShowAuthDialog = () => {
  showAuthDialog.value = true;
};

// 组件挂载时初始化数据
onMounted(async () => {
  await fetchAllCategories();
  await fetchBlogList(true);
  // 获取热门博客和推荐阅读
  fetchHotBlogs();
  fetchRecommendedBlogs();
  
  // 初始化活跃菜单项
  initActiveMenuItem();
  
  // 添加自定义登录事件监听
  setupAuthDialogListener();
  
  // 找到正确的滚动容器并添加事件监听
  const scrollElement = document.querySelector('.el-main');
  if (scrollElement) {
    scrollElement.addEventListener('scroll', lazyLoad);
  } else {
    window.addEventListener('scroll', lazyLoad);
  }

  // 添加自定义路由事件监听，用于处理路由变化后的组件刷新
  window.addEventListener('router-change', handleRouterChange);

  setTimeout(() => {
    // 检查是否需要加载更多
    checkAndLoadMoreIfNeeded();
  }, 1000);

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
  
  // 延迟触发一次resize事件，确保初始加载时affixes正确定位
  setTimeout(() => {
    triggerResize();
  }, 500);
});

// 处理路由变化事件
const handleRouterChange = (event) => {
  const { to } = event.detail;
  
  // 如果路由变为首页，刷新数据
  if (to.path === '/index') {
    fetchAllCategories();
    fetchBlogList(true);
    // 刷新热门博客和推荐阅读
    fetchHotBlogs();
    fetchRecommendedBlogs();
    // 确保首页菜单项激活
    sideMenuItems.value.forEach(item => {
      item.active = item.path === '/index';
    });
  }
};

// 监听路由变化，更新活跃菜单项
watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    // 当路由变化时，根据当前路径更新侧边栏激活状态
    let activeFound = false;
    sideMenuItems.value.forEach(item => {
      if (item.path === newPath) {
        item.active = true;
        activeFound = true;
      } else {
        item.active = false;
      }
    });
    
    // 如果没有匹配的菜单项，默认激活首页
    if (!activeFound && (newPath === '/' || newPath === '/index')) {
      sideMenuItems.value.find(item => item.path === '/index').active = true;
    }
  },
  { immediate: true }
);

// 组件卸载时清理
onUnmounted(() => {
  // 移除正确容器上的事件监听
  const scrollElement = document.querySelector('.el-main');
  if (scrollElement) {
    scrollElement.removeEventListener('scroll', lazyLoad);
  } else {
    window.removeEventListener('scroll', lazyLoad);
  }
  
  // 移除自定义事件监听
  window.removeEventListener('show-auth-dialog', handleShowAuthDialog);
  window.removeEventListener('router-change', handleRouterChange);
  
  if (scrollTimer) {
    clearTimeout(scrollTimer);
    scrollTimer = null;
  }

  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="blog-index">
    <!-- 主体容器 -->
    <el-container class="main-container">
      <!-- 左侧导航栏 -->
      <el-aside :width="sidebarCollapsed ? '60px' : '200px'" class="left-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <el-affix :offset="80">
          <div class="sidebar-content">
            <div class="sidebar-header" @click="toggleSidebar">
              <Icon :icon="menuIcon" class="menu-toggle-icon" />
              <h3 v-show="!sidebarCollapsed">导航菜单</h3>
            </div>
            <div class="sidebar-menu">
              <div 
                v-for="item in sideMenuItems" 
                :key="item.name"
                class="menu-item"
                :class="{ active: item.active }"
                @click="handleSideMenuClick(item)"
                :title="sidebarCollapsed ? item.name : ''"
              >
                <Icon :icon="item.icon" class="menu-icon" />
                <span v-show="!sidebarCollapsed" class="menu-text">{{ item.name }}</span>
              </div>
            </div>
          </div>
        </el-affix>
      </el-aside>
      
      <!-- 中间主要内容区域 -->
      <el-main class="main-content">
        <!-- 横幅区域 -->
        <div class="banner">
          <div class="banner-content">
            <h1>分享知识，共同成长</h1>
            <p>在这里记录你的学习足迹，分享你的技术见解</p>
            <el-button type="primary" size="large" @click="handleCreateClick">
              立即创作
            </el-button>
          </div>
        </div>
        <!-- 分类标签 -->
        <div class="categories">
          <ul>
            <li 
              v-for="category in categories" 
              :key="category.id || 'all'"
              :class="{ active: currentCategoryId === category.id }"
              @click="switchCategory(category.id)"
            >
              {{ category.name }}
            </li>
          </ul>
        </div>
        
        <!-- 最新博客区域 -->
        <div class="article-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 class="section-title" style="margin: 0;">最新博客</h2>
          </div>
          
          <!-- 文章列表 -->
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
                  <span class="article-count clickable" @click.stop="handleAuthRequiredAction('like')">
                    <Icon :icon="heartIcon" />
                    {{ blog.likes || 0 }}
                  </span>
                  <span class="article-count clickable" @click.stop="handleAuthRequiredAction('collect')">
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
              <!-- 无封面时显示分类标签渐变背景 -->
              <div 
                v-else 
                class="article-image article-placeholder"
                :style="{ background: getRandomGradient(blog.id) }"
              >
                <span class="placeholder-text">#{{ blog.category || '文章' }}</span>
              </div>
            </div>
            
            <!-- 暂无数据提示 -->
            <div v-if="!loading && blogList.length === 0" class="no-data">
              <p>暂无文章数据</p>
            </div>
          </div>
          
          <!-- 加载更多状态 -->
          <div class="load-more">
            <div v-if="loading" class="loading-indicator">
              <Icon :icon="loadingIcon" class="loading-spinner" />
              <span>加载中...</span>
            </div>
            <div v-else-if="!hasMore && blogList.length > 0" class="no-more-data">
              <span>—— 已经到底了 ——</span>
            </div>
          </div>
        </div>
      </el-main>
      
      <!-- 右侧边栏 -->
      <el-aside width="300px" class="right-sidebar">
        <el-affix :offset="80">
          <div class="sidebar-content right-sidebar-content">
            <!-- 热门文章区域 -->
            <div class="sidebar-card hot-articles">
              <h3 class="card-title">热门博客</h3>
              
              <ul class="hot-article-list" v-if="hotBlogList.length > 0">
                <li v-for="(blog, index) in hotBlogList" :key="blog.id">
                  <div class="hot-article-index">{{ index + 1 }}</div>
                  <div class="hot-article-info" @click="goToBlogDetail(blog.id)">
                    <h4 class="hot-article-title">{{ blog.title }}</h4>
                    <div class="hot-article-count">
                      <Icon :icon="eyeIcon" />
                      {{ blog.views || 0 }}阅读
                    </div>
                  </div>
                </li>
              </ul>
              <div v-else class="no-recommend">暂无热门博客</div>
            </div>
            
            <!-- 推荐阅读区域 -->
            <div class="sidebar-card recommended">
              <h3 class="card-title">推荐阅读</h3>
              
              <div class="recommend-scroll-container" v-if="recommendList.length > 0">
                <div class="recommend-list">
                  <div 
                    v-for="blog in recommendList" 
                    :key="`recommend-${blog.id}`"
                    class="recommend-item"
                    @click="goToBlogDetail(blog.id)"
                  >
                  <div class="recommend-image" v-if="hasValidCover(blog.cover)">
                      <img :src="blog.cover" :alt="blog.title" @error="handleImageError">
                    </div>
                    <!-- 无封面时显示分类标签渐变背景 -->
                    <div 
                      v-else 
                      class="recommend-image recommend-placeholder"
                      :style="{ background: getRandomGradient(blog.id) }"
                    >
                      <span class="placeholder-text">#{{ blog.category || '文章' }}</span>
                    </div>
                    <h4 class="recommend-title">{{ blog.title }}</h4>
                  </div>
                </div>
              </div>
              <div v-else class="no-recommend">暂无推荐阅读的博客</div>
            </div>
          </div>
        </el-affix>
      </el-aside>
    </el-container>
    
    <!-- 登录弹窗 -->
    <AuthDialog 
      v-model="showAuthDialog"
      @login-success="handleLoginSuccess"
    />


  </div>
</template>

<style scoped>
/* 确保容器填满整个宽度 */
* {
  box-sizing: border-box;
}

.el-container {
  height: auto;
  position: relative;
  display: flex; 
}

.el-aside, .el-main {
  height: auto;
  overflow-y: visible;
}

.blog-index {
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;
}

:deep(.el-input__wrapper) {
  padding: 0 15px;
}

.banner {
  height: 300px;
  background: linear-gradient(135deg, #3a8ffe 0%, #9658fe 100%);
  margin-bottom: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  overflow: hidden;
}

.banner::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 40%;
  height: 100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path fill="rgba(255,255,255,0.1)" d="M37.5,186c-12.1-10.5-11.8-32.3-7.2-46.7c4.8-15,13.1-17.8,30.1-36.7C91,68.8,83.5,56.7,103.4,45 c22.2-13.1,51.1-9.5,69.6-1.6c18.1,7.8,15.7,15.3,43.3,33.2c28.8,18.8,37.2,14.3,46.7,27.9c15.6,22.3,6.4,53.3,4.4,60.2 c-3.3,11.2-7.1,23.9-18.5,32c-16.3,11.5-29.5,0.7-48.6,11c-16.2,8.7-12.6,19.7-28.2,33.2c-22.7,19.7-63.8,25.7-79.9,9.7 c-15.2-15.1,0.3-41.7-16.6-54.9C63,186,49.7,196.7,37.5,186z"/></svg>');
  background-repeat: no-repeat;
  background-position: right center;
  background-size: contain;
  opacity: 0.7;
  transform: rotate(180deg);
}

.banner-content {
  padding: 0 60px;
  max-width: 60%;
  z-index: 1;
  color: white;
}

.banner-content h1 {
  font-size: 36px;
  margin-bottom: 16px;
  font-weight: 700;
}

.banner-content p {
  font-size: 18px;
  margin-bottom: 24px;
  opacity: 0.9;
}

.main-container {
  width: 100%;
  max-width: none;
  background-color: transparent;
  position: relative;
}

.left-sidebar {
  background-color: white;
  border-right: 1px solid #e4e7ed;
  margin-right: 0;
  box-shadow: none;
  transition: width 0.3s ease;
}

/* el-affix组件样式 */
:deep(.el-affix) {
  width: inherit !important;
  transition: width 0.3s ease;
}

.left-sidebar :deep(.el-affix) {
  width: inherit !important;
  z-index: 10;
  transition: width 0.3s ease;
}

.right-sidebar {
  transition: width 0.3s ease;
  padding-left: 15px;
  position: relative;  /* 确保相对定位 */
  margin-right: 20px;
}

/* el-affix组件样式 */
:deep(.el-affix) {
  width: inherit !important;
  transition: width 0.3s ease;
}

.right-sidebar :deep(.el-affix) {
  width: 300px !important;
  z-index: 10;
  position: fixed !important;
  transition: transform 0.3s ease; /* 添加过渡效果 */
}

/* 确保右侧内容容器样式正确 */
.right-sidebar-content {
  width: 300px;
  background-color: white;
}

.right-sidebar .sidebar-card {
  margin-bottom: 20px;
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.left-sidebar.collapsed {
  width: 60px !important;
  transition: width 0.3s ease;
}

.left-sidebar.collapsed :deep(.el-affix) {
  width: 60px !important;
  transition: width 0.3s ease;
}

.sidebar-header {
  /* padding: 20px; */
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.sidebar-header:hover {
  background-color: #f5f7fa;
}

.menu-toggle-icon {
  width: 20px;
  height: 20px;
  color: #666;
  margin-right: 12px;
  transition: transform 0.3s ease;
}

.collapsed .menu-toggle-icon {
  margin-right: 0;
  transform: rotate(180deg);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.sidebar-menu {
  padding: 10px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
  position: relative;
}

.collapsed .menu-item {
  padding: 15px 20px;
  justify-content: center;
}

.menu-item:hover {
  background-color: #e8e8e8;
  color: #000000;
}

.menu-item.active {
  background-color: #e8e8e8;
  color: #000000;
  position: relative;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background-color: #ffffff;
  border-radius: 0 2px 2px 0;
}

.menu-icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.collapsed .menu-icon {
  margin-right: 0;
}

/* 折叠时的工具提示效果 */
.collapsed .menu-item:hover::after {
  content: attr(title);
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  margin-left: 10px;
}

.main-content {
  padding: 20px;
  min-width: 0;
  background-color: #f5f7fa;
  flex: 1;
  min-height: 100vh;
}

.right-sidebar {
  background-color: white;
  border-left: 1px solid #e4e7ed;
  margin-left: 0;
  /* padding: 20px; */
}

.categories {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.categories ul {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0;
}

.categories li {
  padding: 6px 16px;
  margin-right: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.3s;
  font-size: 14px;
}

.categories li.active {
  background-color: #409eff;
  color: white;
}

.categories li:not(.active):hover {
  background-color: #f0f9ff;
  color: #409eff;
}

.article-section {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 20px;
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 600;
  position: relative;
  padding-left: 12px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background-color: #409eff;
  border-radius: 2px;
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
}

.article-info {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #999;
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

.article-count.clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.article-count.clickable:hover {
  color: #409eff;
}

.article-count.clickable:hover .iconify {
  color: #409eff;
}

.article-image {
  width: 180px;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 文章封面占位图样式 */
.article-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.placeholder-text {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

/* 推荐阅读区域占位图样式 */
.recommend-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.recommend-placeholder .placeholder-text {
  font-size: 14px;
  font-weight: 500;
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
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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
  background-color: #f9fafc;
  padding: 0 10px;
  position: relative;
}

.no-more-data:before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background-color: #ebeef5;
  z-index: -1;
}

.sidebar-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.card-title {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 600;
  position: relative;
  padding-left: 12px;
}

.card-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: #ff6b00;
  border-radius: 2px;
}

.hot-article-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hot-article-list li {
  display: flex;
  margin-bottom: 15px;
  cursor: pointer;
}

.hot-article-list li:last-child {
  margin-bottom: 0;
}

.hot-article-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #f0f0f0;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  margin-right: 10px;
  flex-shrink: 0;
}

.hot-article-list li:nth-child(1) .hot-article-index {
  background-color: #f56c6c;
  color: white;
}

.hot-article-list li:nth-child(2) .hot-article-index {
  background-color: #e6a23c;
  color: white;
}

.hot-article-list li:nth-child(3) .hot-article-index {
  background-color: #409eff;
  color: white;
}

.hot-article-info {
  flex: 1;
}

.hot-article-title {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-article-count {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
}

.hot-article-count svg {
  margin-right: 4px;
}

.recommend-scroll-container {
  max-height: 380px;
  overflow-y: auto;
  padding-right: 5px;
  margin-right: -5px;
  /* 滚动条美化 */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #d1d5db #f8f9fa; /* Firefox */
}

/* 滚动条样式 */
.recommend-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.recommend-scroll-container::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 3px;
}

.recommend-scroll-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
  transition: background 0.2s;
}

.recommend-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.recommend-list {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 15px;
}

.recommend-item {
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  background-color: #f9f9f9;
}

.recommend-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recommend-image {
  height: 120px;
  width: 100%;
  overflow: hidden;
}

.recommend-image img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  transition: transform 0.3s;
}

.recommend-item:hover .recommend-image img {
  transform: scale(1.05);
}

.recommend-title {
  padding: 10px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-title.no-image {
  padding: 15px;
}

.loading-skeleton {
  padding: 10px 0;
}

.article-category {
  background-color: #f0f0f0;
  color: #666;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: 10px;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.no-data p {
  font-size: 16px;
  margin: 0;
}

/* 推荐阅读/热门博客空数据提示样式 */
.no-recommend {
  text-align: center;
  padding: 30px 15px;
  color: #999;
  font-size: 14px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.hot-article-info {
  cursor: pointer;
  transition: all 0.3s;
}

.hot-article-info:hover {
  background-color: #f9fafc;
}

.recommend-item:hover {
  transform: translateY(-2px);
  transition: all 0.3s;
}

.recommend-title.no-image {
  margin-top: 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px solid #e9ecef;
  font-size: 13px;
  line-height: 1.4;
  color: #555;
}

/* 修改响应式布局，确保在小屏幕上也能正确滚动 */
@media (max-width: 992px) {
  .main-container {
    flex-direction: column;
  }
  
  .left-sidebar, .right-sidebar {
    width: 100% !important;
  }
  
  .left-sidebar.collapsed {
    width: 100% !important;
  }
  
  .left-sidebar :deep(.el-affix) {
    width: 100% !important;
    position: static !important;
  }
  
  .right-sidebar :deep(.el-affix) {
    width: 100% !important;
    position: static !important;
  }
  
  .right-sidebar-content {
    width: 100%;
  }
  
  .sidebar-header {
    display: none;
  }
  
  .sidebar-menu {
    display: flex;
    overflow-x: auto;
    padding: 10px;
  }
  
  .menu-item {
    white-space: nowrap;
    padding: 10px 15px;
    margin-right: 10px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  
  .main-content {
    padding: 10px;
    min-height: auto;
  }
  
  .banner {
    margin-bottom: 15px;
  }
  
  .banner-content {
    max-width: 80%;
    padding: 0 30px;
  }
  
  .recommend-scroll-container {
    max-height: 300px;
  }
  
  .recommend-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .banner {
    height: 200px;
  }
  
  .banner-content {
    padding: 0 30px;
  }
  
  .banner-content h1 {
    font-size: 28px;
  }
  
  .banner-content p {
    font-size: 16px;
  }
}

/* 移除滚动状态面板相关样式 */
.scroll-status-panel,
.status-info,
.page-info,
.separator,
.load-status,
.loading-text,
.no-more-text,
.scroll-hint,
.loading-icon,
.complete-icon,
.scroll-icon,
.progress-bar-container,
.progress-bar {
  display: none;
}

/* 侧边栏通用样式 */
.sidebar-content {
  width: 100%;
  background-color: white;
  transition: all 0.3s ease;
}

.left-sidebar {
  transition: width 0.3s ease;
  background-color: white;
  position: relative;
}
</style>