<!--
 * 优化版首页
 * @author Worlt
 * 集成虚拟滚动、懒加载图片和性能优化功能
 -->
<script setup>
import { ref, reactive, onMounted, nextTick, onUnmounted, watch, onBeforeUnmount } from 'vue'
import router from '@/router/index.js'
import { getAllCategories } from '@/api/category.js'
import { getBlogPage } from '@/api/blog.js'
import { Icon } from '@iconify/vue'
import AuthDialog from '@/components/AuthDialog.vue'
import { useTokenStore } from '@/stores/token.js'
import { ElMessage } from 'element-plus'

// 导入性能优化组件
import VirtualScroll from '@common/components/VirtualScroll.vue'
import LazyImage from '@common/components/LazyImage.vue'
import LazyComponent from '@common/components/LazyComponent.vue'

// 导入性能优化工具
import { 
  debounce, 
  throttle, 
  withCache, 
  preloadImages, 
  performanceMonitor,
  adaptiveLoader,
  ScrollOptimizer
} from '@common/utils/performanceUtils.js'

// 图标导入
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

// 博客列表数据
const blogList = ref([]);
const loading = ref(false);

// 是否还有更多数据
const hasMore = ref(true);

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 20, // 增加每页条数，配合虚拟滚动
  categoryId: null
});

// 虚拟滚动配置
const virtualScrollRef = ref(null)
const containerHeight = ref(600) // 可视区域高度
const estimatedItemHeight = ref(180) // 预估每个博客项目高度

// 性能监控
const loadingStrategy = ref('normal')

// 侧边栏菜单项
const sideMenuItems = ref([
  { name: '首页', path: '/index', icon: homeIcon, active: true },
  { name: '我的博客', path: '/my-blogs', icon: accountHeartIcon, active: false },
  { name: '我的点赞', path: '/liked-blogs', icon: thumbUpIcon, active: false },
  { name: '我的收藏', path: '/collections', icon: bookmarkIcon, active: false },
  { name: '浏览历史', path: '/history', icon: historyIcon, active: false }
]);

// 缓存的API调用函数
const cachedGetBlogPage = withCache(getBlogPage, {
  ttl: 2 * 60 * 1000, // 2分钟缓存
  keyGenerator: (params) => `blog-page-${JSON.stringify(params)}`
})

const cachedGetAllCategories = withCache(getAllCategories, {
  ttl: 5 * 60 * 1000 // 5分钟缓存
})

// 获取博客列表的优化版本
const fetchBlogList = async (reset = false, isLoadMore = false) => {
  if (loading.value) return;
  
  performanceMonitor.mark('fetchBlogList')
  
  try {
    loading.value = true;

    if (reset) {
      queryParams.page = 1;
      blogList.value = [];
      hasMore.value = true;
    }

    // 根据加载策略调整请求参数
    const strategy = adaptiveLoader.getLoadingStrategy()
    if (strategy === 'conservative') {
      queryParams.pageSize = 10 // 保守策略减少每页数量
    } else if (strategy === 'aggressive') {
      queryParams.pageSize = 30 // 激进策略增加每页数量
    }

    const response = await cachedGetBlogPage(queryParams);
    
    if (response.code === 200) {
      const newBlogs = response.data.records || [];
      
      if (reset) {
        blogList.value = newBlogs;
      } else {
        blogList.value = [...blogList.value, ...newBlogs];
      }

      // 预加载图片
      const imageUrls = newBlogs
        .map(blog => blog.cover)
        .filter(cover => hasValidCover(cover))
      
      if (imageUrls.length > 0) {
        preloadImages(imageUrls).then(results => {
          console.log(`预加载了 ${results.filter(r => r.success).length}/${results.length} 张图片`)
        })
      }

      hasMore.value = response.data.hasNext || false;
      
      if (newBlogs.length > 0) {
        queryParams.page++;
      }
    } else {
      ElMessage.error(response.message || '获取博客列表失败');
    }
  } catch (error) {
    console.error('获取博客列表失败:', error);
    ElMessage.error('获取博客列表失败，请稍后重试');
  } finally {
    loading.value = false;
    const duration = performanceMonitor.measure('fetchBlogList')
    console.log(`博客列表加载耗时: ${duration}ms`)
  }
};

// 获取分类数据
const fetchCategories = async () => {
  try {
    const response = await cachedGetAllCategories();
    if (response.code === 200) {
      categories.value = [
        { id: null, name: '全部' },
        ...(response.data || [])
      ];
    }
  } catch (error) {
    console.error('获取分类失败:', error);
  }
};

// 优化的滚动处理
const optimizedScrollListener = ScrollOptimizer.createOptimizedScrollListener(
  () => {
    // 滚动时的处理逻辑
  },
  { throttleTime: 16 }
)

// 处理虚拟滚动加载更多
const handleVirtualLoadMore = debounce(() => {
  if (!hasMore.value || loading.value) return
  fetchBlogList(false, true)
}, 300)

// 切换分类
const switchCategory = (categoryId) => {
  currentCategoryId.value = categoryId;
  queryParams.categoryId = categoryId;
  queryParams.page = 1;
  hasMore.value = true;
  fetchBlogList(true);
  
  // 滚动到顶部
  if (virtualScrollRef.value) {
    virtualScrollRef.value.scrollToTop()
  }
};

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined'
}

// 图片加载错误处理
const handleImageError = (event) => {
  console.warn('图片加载失败:', event.target.src)
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

// 跳转到博客详情
const goToBlogDetail = (blogId) => {
  router.push(`/blog/${blogId}`);
};

// 处理需要登录的操作
const handleAuthRequiredAction = (action) => {
  if (!tokenStore.token) {
    showAuthDialog.value = true;
    return;
  }
  
  // 这里可以添加具体的操作逻辑
  console.log(`执行操作: ${action}`);
};

// 处理登录成功
const handleLoginSuccess = () => {
  showAuthDialog.value = false;
  ElMessage.success('登录成功！');
};

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

// 处理侧边栏菜单点击
const handleSideMenuClick = (item) => {
  if (item.path === '/index') {
    // 当前页面，不需要跳转
    return;
  }
  
  if (!tokenStore.token && item.path !== '/index') {
    handleAuthRequiredAction('navigate');
    return;
  }
  
  router.push(item.path);
};

// 处理创作按钮点击
const handleCreateClick = () => {
  if (!tokenStore.token) {
    handleAuthRequiredAction('create');
    return;
  }
  
  router.push('/create');
};

// 自定义事件处理
const handleShowAuthDialog = () => {
  showAuthDialog.value = true;
};

const handleRouterChange = (event) => {
  const newPath = event.detail.path;
  
  // 重置所有菜单项的active状态
  sideMenuItems.value.forEach(item => {
    item.active = false;
  });
  
  // 设置当前路径对应的菜单项为active
  const activeItem = sideMenuItems.value.find(item => item.path === newPath);
  if (activeItem) {
    activeItem.active = true;
  }
};

// 窗口大小变化处理
const handleResize = throttle(() => {
  // 更新容器高度
  const mainElement = document.querySelector('.el-main')
  if (mainElement) {
    containerHeight.value = Math.min(600, mainElement.clientHeight - 100)
  }
}, 250)

// 初始化性能优化
const initPerformanceOptimizations = () => {
  // 检测加载策略
  loadingStrategy.value = adaptiveLoader.getLoadingStrategy()
  console.log(`当前加载策略: ${loadingStrategy.value}`)
  
  // 根据策略调整配置
  if (loadingStrategy.value === 'conservative') {
    queryParams.pageSize = 10
    estimatedItemHeight.value = 160
  } else if (loadingStrategy.value === 'aggressive') {
    queryParams.pageSize = 30
    estimatedItemHeight.value = 200
  }
}

// 生命周期钩子
onMounted(async () => {
  performanceMonitor.mark('pageInit')
  
  // 初始化性能优化
  initPerformanceOptimizations()
  
  // 添加自定义事件监听
  window.addEventListener('show-auth-dialog', handleShowAuthDialog);
  window.addEventListener('router-change', handleRouterChange);
  window.addEventListener('resize', handleResize);
  
  // 并行加载数据
  await Promise.all([
    fetchCategories(),
    fetchBlogList(true)
  ])
  
  const duration = performanceMonitor.measure('pageInit')
  console.log(`页面初始化耗时: ${duration}ms`)
});

// 监听路由变化
watch(() => router.currentRoute.value.path, (newPath) => {
  // 重置所有菜单项的active状态
  sideMenuItems.value.forEach(item => {
    item.active = false;
  });
  
  // 查找并激活当前路径对应的菜单项
  let activeFound = false;
  sideMenuItems.value.forEach(item => {
    if (item.path === newPath) {
      item.active = true;
      activeFound = true;
    }
  });
  
  // 如果没有找到匹配的菜单项，默认激活首页
  if (!activeFound && (newPath === '/' || newPath === '/index')) {
    sideMenuItems.value.find(item => item.path === '/index').active = true;
  }
}, { immediate: true });

// 组件卸载时清理
onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('show-auth-dialog', handleShowAuthDialog);
  window.removeEventListener('router-change', handleRouterChange);
  window.removeEventListener('resize', handleResize);
  
  // 清理性能监控数据
  performanceMonitor.clear()
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
        
        <!-- 最新文章区域 -->
        <div class="article-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 class="section-title" style="margin: 0;">最新文章</h2>
            <div class="performance-info" v-if="loadingStrategy !== 'normal'">
              <el-tag :type="loadingStrategy === 'aggressive' ? 'success' : 'warning'" size="small">
                {{ loadingStrategy === 'aggressive' ? '高性能模式' : '节能模式' }}
              </el-tag>
            </div>
          </div>
          
          <!-- 使用虚拟滚动优化的文章列表 -->
          <VirtualScroll
            ref="virtualScrollRef"
            :items="blogList"
            :estimated-item-height="estimatedItemHeight"
            :container-height="containerHeight"
            :buffer-size="3"
            :loading="loading"
            :has-more="hasMore"
            :get-item-key="(item) => `blog-${item.id}`"
            @load-more="handleVirtualLoadMore"
            class="virtual-blog-list"
          >
            <template #default="{ item: blog, index }">
              <div 
                class="article-item optimized"
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
                
                <!-- 使用懒加载图片组件 -->
                <div class="article-image" v-if="hasValidCover(blog.cover)">
                  <LazyImage
                    :src="blog.cover"
                    :alt="blog.title"
                    :container-style="{ width: '120px', height: '80px' }"
                    :image-style="{ borderRadius: '6px' }"
                    @error="handleImageError"
                    class="lazy-blog-image"
                  />
                </div>
              </div>
            </template>
            
            <!-- 自定义加载状态 -->
            <template #loading>
              <div class="optimized-loading">
                <Icon :icon="loadingIcon" class="loading-spinner" />
                <span>智能加载中...</span>
              </div>
            </template>
            
            <!-- 自定义无更多数据状态 -->
            <template #no-more>
              <div class="optimized-no-more">
                <span>—— 已加载全部内容 ——</span>
              </div>
            </template>
          </VirtualScroll>
          
          <!-- 暂无数据提示 -->
          <div v-if="!loading && blogList.length === 0" class="no-data">
            <p>暂无文章数据</p>
          </div>
        </div>
      </el-main>
      
      <!-- 右侧边栏 -->
      <el-aside width="300px" class="right-sidebar">
        <el-affix :offset="80">
          <div class="sidebar-content right-sidebar-content">
            <!-- 懒加载的热门文章组件 -->
            <LazyComponent
              :component-loader="() => import('@/components/HotArticles.vue')"
              :component-props="{ articles: blogList.slice(0, 5) }"
              class="sidebar-card"
            >
              <template #skeleton>
                <div class="hot-articles-skeleton">
                  <div class="skeleton-title"></div>
                  <div class="skeleton-list">
                    <div v-for="i in 5" :key="i" class="skeleton-item">
                      <div class="skeleton-text"></div>
                      <div class="skeleton-text short"></div>
                    </div>
                  </div>
                </div>
              </template>
            </LazyComponent>
            
            <!-- 推荐阅读区域 -->
            <div class="sidebar-card recommended">
              <h3 class="card-title">推荐阅读</h3>
              
              <div class="recommend-scroll-container">
                <div class="recommend-list">
                  <div 
                    v-for="blog in blogList.slice(0, 8)" 
                    :key="`recommend-${blog.id}`"
                    class="recommend-item"
                    @click="goToBlogDetail(blog.id)"
                  >
                    <div class="recommend-image" v-if="hasValidCover(blog.cover)">
                      <LazyImage
                        :src="blog.cover"
                        :alt="blog.title"
                        :container-style="{ width: '60px', height: '40px' }"
                        :image-style="{ borderRadius: '4px' }"
                        :show-loading-text="false"
                      />
                    </div>
                    <h4 class="recommend-title" :class="{ 'no-image': !hasValidCover(blog.cover) }">
                      {{ blog.title }}
                    </h4>
                  </div>
                </div>
              </div>
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
/* 基础样式保持不变 */
.blog-index {
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;
}

.main-container {
  height: auto;
  position: relative;
  display: flex;
}

/* 虚拟滚动优化样式 */
.virtual-blog-list {
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.article-item.optimized {
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.article-item.optimized:hover {
  background-color: #f8f9fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.article-item.optimized:last-child {
  border-bottom: none;
}

/* 懒加载图片样式 */
.lazy-blog-image {
  border-radius: 6px;
  overflow: hidden;
}

/* 性能信息样式 */
.performance-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 优化的加载状态 */
.optimized-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px;
  color: #409eff;
  font-size: 14px;
}

.optimized-no-more {
  text-align: center;
  padding: 30px;
  color: #909399;
  font-size: 14px;
}

/* 骨架屏样式 */
.hot-articles-skeleton {
  padding: 20px;
}

.skeleton-title {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 16px;
  width: 60%;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-text {
  height: 14px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-text.short {
  width: 70%;
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 其他样式继承原有样式... */
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

.banner-content {
  padding: 0 40px;
  color: white;
  z-index: 2;
}

.banner-content h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.banner-content p {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

/* 继续其他必要的样式... */
</style> 