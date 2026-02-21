<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import * as blogApi from '@/api/blog.js'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'

const router = useRouter()

// 博客列表
const blogList = ref([])

// 状态筛选选项 - 根据后端BlogStatusConstant的status字段调整
const statusOptions = [
  { label: '全部', value: '' },
  { label: '审核中', value: 0 },    // 待审核
  { label: '已发布', value: 1 },    // 已发布
  { label: '被拒绝', value: 2 },    // 审核不通过
  { label: '整改中', value: 3 },    // 整改
  { label: '已封禁', value: 4 },    // 永久封禁
  { label: '草稿', value: 5 },      // 草稿
  { label: '处理中', value: 6 }     // 审核员处理中
]

// 排序选项
const sortOptions = [
  { label: '最新创建', value: 'createTime,desc' },
  { label: '最新更新', value: 'updateTime,desc' },
  { label: '最多浏览', value: 'views,desc' },
  { label: '最多点赞', value: 'likes,desc' },
  { label: '最多收藏', value: 'collections,desc' }
]

// 当前状态和排序
const currentStatus = ref('')
const currentSort = ref(sortOptions[0].value)

// 分页参数 - 注意：后端getMyBlogs可能不支持分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 加载状态
const loading = ref(false)

// 博客操作状态
const actionStatus = reactive({
  deleting: null // 正在删除的博客id
})

onMounted(() => {
  loadMyBlogs()
})

// 加载我的博客
const loadMyBlogs = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    // 添加状态筛选
    if (currentStatus.value !== '') {
      params.status = currentStatus.value
    }
    
    // 添加排序参数
    if (currentSort.value) {
      const [field, order] = currentSort.value.split(',')
      params.sortField = field
      params.sortOrder = order
    }
    
    const result = await blogApi.getMyBlogs(params)
    
    if (result.code === 0 && result.data) {
      // 处理不同的返回格式
      if (result.data.records) {
        // 分页格式
        blogList.value = result.data.records || []
        pagination.total = result.data.total || 0
      } else if (Array.isArray(result.data)) {
        // 列表格式
        blogList.value = result.data
        pagination.total = result.data.length
      } else {
        blogList.value = []
        pagination.total = 0
      }
    } else {
      ElMessage.error('获取博客列表失败')
      blogList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取博客列表失败:', error)
    ElMessage.error('获取博客列表失败')
    blogList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 处理状态变化
const handleStatusChange = () => {
  pagination.currentPage = 1 // 重置到第一页
  loadMyBlogs()
}

// 处理排序变化
const handleSortChange = () => {
  pagination.currentPage = 1 // 重置到第一页
  loadMyBlogs()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.currentPage = page
  loadMyBlogs()
}

// 编辑博客
const handleEdit = (blogId) => {
  router.push(`/edit/${blogId}`)
}

// 删除博客
const handleDelete = async (blog) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除博客"${blog.title}"吗？此操作不可恢复！`, 
      '警告', 
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    actionStatus.deleting = blog.id
    
    const result = await blogApi.deleteBlogById(blog.id)
    
    if (result.code === 0) {
      ElMessage.success('删除成功')
      loadMyBlogs() // 重新加载列表
    } else {
      ElMessage.error(result.msg || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除博客失败:', error)
      ElMessage.error('删除博客失败')
    }
  } finally {
    actionStatus.deleting = null
  }
}

// 查看博客
const handleView = (blogId) => {
  router.push(`/blog/${blogId}`)
}

// 新建博客
const handleCreateBlog = () => {
  router.push('/write')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态显示文本
const getStatusText = (status) => {
  const option = statusOptions.find(item => item.value === status)
  return option ? option.label : '未知状态'
}

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 0: return 'warning'  // 审核中
    case 1: return 'success'  // 已发布
    case 2: return 'danger'   // 被拒绝
    case 3: return 'warning'  // 整改中（橙色警告）
    case 4: return 'danger'   // 已封禁（红色危险）
    case 5: return 'info'     // 草稿
    case 6: return 'warning'  // 处理中（橙色警告）
    default: return 'info'
  }
}

// 检查图片是否有效
const hasValidCover = (cover) => {
  return cover && cover.trim() && cover !== 'null' && cover !== 'undefined';
};

// 随机渐变背景数组
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8eb12 0%, #58c322 100%)',
  'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)',
  'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)',
  'linear-gradient(135deg, #08aeea 0%, #2af598 100%)',
  'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'
];

// 获取渐变背景
const getRandomGradient = (blogId) => {
  const index = blogId % gradients.length;
  return gradients[index];
};

// 图片加载错误处理
const handleImageError = (event) => {
  event.target.style.display = 'none';
  const container = event.target.parentElement;
  if (container) {
    // 可以添加逻辑显示替代内容，或者保持隐藏
  }
};
</script>

<template>
  <div class="page-with-sidebar">
    <!-- 左侧边栏 -->
    <UserCenterSidebar />
    
    <!-- 右侧主内容区 -->
    <div class="my-blogs-page">
    <div class="page-header">
      <h2 class="page-title">我的博客</h2>
      <el-button 
        type="primary" 
        @click="handleCreateBlog"
      >
        <Icon icon="mdi:plus" style="margin-right: 4px"/>
        写博客
      </el-button>
    </div>
    
    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <!-- 状态筛选 -->
      <el-radio-group 
        v-model="currentStatus"
        @change="handleStatusChange"
      >
        <el-radio-button 
          v-for="option in statusOptions" 
          :key="option.value" 
          :label="option.value"
        >{{ option.label }}</el-radio-button>
      </el-radio-group>
      
      <!-- 右侧排序选择 -->
      <div class="sort-selector">
        <span class="sort-label">排序:</span>
        <el-select 
          v-model="currentSort"
          size="small"
          @change="handleSortChange"
        >
          <el-option
            v-for="option in sortOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>
    
    <!-- 博客列表 -->
    <div class="blog-list-container">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <!-- 空列表 -->
      <div v-else-if="blogList.length === 0" class="empty-container">
        <el-empty description="暂无博客">
          <el-button type="primary" @click="handleCreateBlog">立即创作</el-button>
        </el-empty>
      </div>
      
      <!-- 博客列表表格 -->
      <el-table 
        v-else
        :data="blogList" 
        style="width: 100%" 
        row-key="id" 
        border
      >
        <el-table-column label="封面" width="100" align="center">
          <template #default="{ row }">
            <div class="cover-image-cell">
              <img 
                v-if="hasValidCover(row.cover)" 
                :src="row.cover" 
                alt="cover" 
                class="blog-cover-img"
                @error="handleImageError"
              />
              <div 
                v-else 
                class="blog-cover-placeholder"
                :style="{ background: getRandomGradient(row.id) }"
              >
                <span>#{{ row.category || '文章' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="标题" prop="title" min-width="220">
          <template #default="{ row }">
            <div class="blog-title-cell">
              <span 
                class="blog-title"
                :class="{ 'draft-title': row.status === 5 }"
                @click="handleView(row.id)"
              >{{ row.title }}</span>
              <el-tag 
                v-if="row.status !== 1" 
                size="small"
                :type="getStatusType(row.status)"
              >{{ getStatusText(row.status) }}</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            <span>{{ formatDate(row.createTime) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="最后更新" width="170">
          <template #default="{ row }">
            <span>{{ formatDate(row.updateTime) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="阅读量" width="100" sortable>
          <template #default="{ row }">
            <span>{{ row.views || row.viewCount || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="点赞量" width="100" sortable>
          <template #default="{ row }">
            <span>{{ row.likes || row.likeCount || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                circle
                @click="handleView(row.id)"
                title="查看"
              >
                <Icon icon="mdi:eye" />
              </el-button>
              <el-button 
                circle
                type="primary"
                @click="handleEdit(row.id)"
                title="编辑"
              >
                <Icon icon="mdi:pencil" />
              </el-button>
              <el-button 
                circle
                type="danger"
                :loading="actionStatus.deleting === row.id"
                @click="handleDelete(row)"
                title="删除"
              >
                <Icon icon="mdi:delete" />
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container" v-if="pagination.total > 0">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          :current-page="pagination.currentPage"
          @current-change="handlePageChange"
        />
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

.my-blogs-page {
  flex: 1;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  margin: 0;
  font-weight: 600;
}

.filter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background-color: var(--pixel-bg-card);
  padding: 15px;
  border-radius: 0;
  box-shadow: 3px 3px 0 #000;
  border: 2px solid #000;
}

.sort-selector {
  display: flex;
  align-items: center;
}

.sort-label {
  margin-right: 8px;
  color: var(--pixel-text-primary);
  font-size: 14px;
}

.blog-list-container {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 20px;
  box-shadow: 3px 3px 0 #000;
  border: 2px solid #000;
}

.loading-container,
.empty-container {
  padding: 40px 0;
  text-align: center;
}

.blog-title-cell {
  display: flex;
  align-items: center;
}

.blog-title {
  cursor: pointer;
  margin-right: 10px;
  color: var(--pixel-primary);
  transition: color 0.2s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blog-title:hover {
  color: var(--pixel-primary-light);
  text-decoration: underline;
}

.draft-title {
  color: var(--pixel-text-muted);
}

.draft-title:hover {
  color: var(--pixel-text-secondary);
}

.action-buttons {
  display: flex;
  gap: 5px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.cover-image-cell {
  width: 80px;
  height: 45px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.blog-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.blog-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
</style> 