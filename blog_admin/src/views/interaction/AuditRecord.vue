<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getReviewRecordPage, getReviewRecordById } from '@/api/reviewRecord.js'

// 审核记录列表
const recordList = ref([])
const loading = ref(false)
const detailDialogVisible = ref(false)
const currentRecord = ref({})

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  reviewType: null,
  reviewResult: null,
  reviewerId: null,
  beginTime: null,
  endTime: null
})
const total = ref(0)

// 获取审核记录分页数据
const getList = async () => {
  loading.value = true
  try {
    const res = await getReviewRecordPage(queryParams)
    if (res.code === 0) {
      recordList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.msg || '获取审核记录列表失败')
    }
  } catch (error) {
    console.error('获取审核记录列表失败', error)
    ElMessage.error('获取审核记录列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询表单
const resetQuery = () => {
  queryParams.reviewType = null
  queryParams.reviewResult = null
  queryParams.reviewerId = null
  queryParams.beginTime = null
  queryParams.endTime = null
  queryParams.page = 1
  getList()
}

// 处理页码变化
const handleCurrentChange = (val) => {
  queryParams.page = val
  getList()
}

// 处理每页条数变化
const handleSizeChange = (val) => {
  queryParams.pageSize = val
  queryParams.page = 1
  getList()
}

// 查看审核记录详情
const handleView = async (row) => {
  try {
    const res = await getReviewRecordById(row.id)
    if (res.code === 0 && res.data) {
      currentRecord.value = res.data
      detailDialogVisible.value = true
    } else {
      ElMessage.error(res.msg || '获取审核记录详情失败')
    }
  } catch (error) {
    console.error('获取审核记录详情失败', error)
    ElMessage.error('获取审核记录详情失败')
  }
}

// 审核类型格式化
const formatReviewType = (row) => {
  const types = {
    0: '用户审核',
    1: '博客审核',
    2: '评论审核',
    3: '申诉审核'
  }
  return types[row.reviewType] || '未知类型'
}

// 审核结果格式化
const formatReviewResult = (row) => {
  const results = {
    0: '已通过',
    1: '已拒绝',
    2: '需整改',
    3: '永久封禁'
  }
  return results[row.reviewResult] || '未知结果'
}

// 获取审核对象名称
const getTargetName = (row) => {
  if (row.reviewType === 0 && row.username) {
    return row.username
  } else if (row.reviewType === 1 && row.blogTitle) {
    return row.blogTitle
  } else if (row.reviewType === 2 && row.commentContent) {
    return row.commentContent?.substring(0, 20) + (row.commentContent?.length > 20 ? '...' : '')
  }
  return '未知对象'
}

// 页面加载时获取数据
onMounted(() => {
  getList()
})
</script>

<template>
  <div class="audit-record-container">
    <div class="card-header">
      <h2 class="page-title">审核记录管理</h2>
    </div>
    
    <el-card shadow="hover" class="search-box">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="审核类型">
          <el-select v-model="queryParams.reviewType" placeholder="请选择审核类型" clearable style="width: 180px">
            <el-option label="用户审核" :value="0" />
            <el-option label="博客审核" :value="1" />
            <el-option label="评论审核" :value="2" />
            <el-option label="申诉审核" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核结果">
          <el-select v-model="queryParams.reviewResult" placeholder="请选择审核结果" clearable style="width: 180px">
            <el-option label="已通过" :value="0" />
            <el-option label="已拒绝" :value="1" />
            <el-option label="需整改" :value="2" />
            <el-option label="永久封禁" :value="3" />
          </el-select>
        </el-form-item>
<!--        <el-form-item label="时间范围">-->
<!--          <el-date-picker-->
<!--            v-model="queryParams.beginTime"-->
<!--            type="datetime"-->
<!--            placeholder="开始时间"-->
<!--            value-format="YYYY-MM-DD HH:mm:ss"-->
<!--          />-->
<!--        </el-form-item>-->
<!--        <el-form-item label="-">-->
<!--          <el-date-picker-->
<!--            v-model="queryParams.endTime"-->
<!--            type="datetime"-->
<!--            placeholder="结束时间"-->
<!--            value-format="YYYY-MM-DD HH:mm:ss"-->
<!--          />-->
<!--        </el-form-item>-->
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover" class="record-card">
      <el-table :data="recordList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="审核类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.reviewType === 0 ? 'info' : scope.row.reviewType === 1 ? 'primary' : 'warning'">
              {{ formatReviewType(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核对象" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <div>
              <template v-if="scope.row.reviewType === 0">
                用户: {{ scope.row.username || '未知用户' }} (ID: {{ scope.row.userId }})
              </template>
              <template v-else-if="scope.row.reviewType === 1">
                博客: {{ scope.row.blogTitle || '未知博客' }} (ID: {{ scope.row.blogId }})
              </template>
              <template v-else-if="scope.row.reviewType === 2">
                评论: {{ scope.row.commentContent ? (scope.row.commentContent.substring(0, 15) + '...') : '未知评论' }} 
                (ID: {{ scope.row.commentId }})
              </template>
              <template v-else>
                未知对象
              </template>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="审核员" width="120">
          <template #default="scope">
            {{ scope.row.reviewerName || scope.row.reviewerId }}
          </template>
        </el-table-column>
        <el-table-column label="审核结果" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.reviewResult === 0 ? 'success' : scope.row.reviewResult === 1 ? 'danger' : 'warning'">
              {{ formatReviewResult(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewTime" label="审核时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleView(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-box">
        <el-pagination
          :current-page="queryParams.page"
          :page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 审核记录详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="审核记录详情" width="650px" append-to-body destroy-on-close>
      <div class="record-detail">
        <!-- 基本信息部分，所有类型都显示 -->
        <div class="record-meta">
          <div class="meta-item">
            <span class="meta-label">记录ID:</span>
            <span>{{ currentRecord.id }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">审核类型:</span>
            <span>{{ formatReviewType(currentRecord) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">审核员:</span>
            <span>{{ currentRecord.reviewerName || currentRecord.reviewerId }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">审核结果:</span>
            <span>{{ formatReviewResult(currentRecord) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">审核时间:</span>
            <span>{{ currentRecord.reviewTime }}</span>
          </div>
        </div>
        
        <!-- 用户审核信息 -->
        <div v-if="currentRecord.reviewType === 0" class="detail-section">
          <h4>用户信息</h4>
          <div class="record-meta">
            <div class="meta-item">
              <span class="meta-label">用户ID:</span>
              <span>{{ currentRecord.userId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">用户名:</span>
              <span>{{ currentRecord.username }}</span>
            </div>
          </div>
        </div>
        
        <!-- 博客审核信息 -->
        <div v-if="currentRecord.reviewType === 1" class="detail-section">
          <h4>博客信息</h4>
          <div class="record-meta">
            <div class="meta-item">
              <span class="meta-label">博客ID:</span>
              <span>{{ currentRecord.blogId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">博客标题:</span>
              <span>{{ currentRecord.blogTitle }}</span>
            </div>
            <!-- <div class="meta-item">
              <span class="meta-label">作者ID:</span>
              <span>{{ currentRecord.userId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">作者名:</span>
              <span>{{ currentRecord.username }}</span>
            </div> -->
          </div>
        </div>
        
        <!-- 评论审核信息 -->
        <div v-if="currentRecord.reviewType === 2" class="detail-section">
          <h4>评论信息</h4>
          <div class="record-meta">
            <div class="meta-item">
              <span class="meta-label">评论ID:</span>
              <span>{{ currentRecord.commentId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">评论者ID:</span>
              <span>{{ currentRecord.userId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">评论者名:</span>
              <span>{{ currentRecord.username }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">博客ID:</span>
              <span>{{ currentRecord.blogId }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">博客标题:</span>
              <span>{{ currentRecord.blogTitle }}</span>
            </div>
          </div>
          <div v-if="currentRecord.commentContent" class="comment-content-section">
            <h4>评论内容</h4>
            <div class="detail-content">{{ currentRecord.commentContent }}</div>
          </div>
        </div>
        
        <!-- 审核原因和给作者的消息 -->
        <div v-if="currentRecord.reviewReason" class="detail-section">
          <h4>审核原因</h4>
          <div class="detail-content">{{ currentRecord.reviewReason }}</div>
        </div>
        
        <div v-if="currentRecord.messageToAuthor" class="detail-section">
          <h4>给作者的消息</h4>
          <div class="detail-content">{{ currentRecord.messageToAuthor }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.audit-record-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  margin-bottom: 20px;
}

.record-card {
  margin-bottom: 20px;
}

.pagination-box {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 表格内容居中 */
:deep(.el-table .cell) {
  text-align: center;
}

/* 表头居中 */
:deep(.el-table th.el-table__cell) {
  text-align: center;
}

/* 详情样式 */
.record-detail {
  padding: 10px;
}

.record-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  font-size: 14px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-label {
  color: #909399;
  margin-right: 8px;
  font-weight: 500;
}

.detail-section {
  margin-top: 15px;
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.detail-content {
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  min-height: 60px;
  white-space: pre-wrap;
  line-height: 1.6;
}

.comment-content-section {
  margin-top: 10px;
}
</style> 