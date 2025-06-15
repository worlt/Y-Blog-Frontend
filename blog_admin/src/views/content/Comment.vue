<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getCommentPage, getCommentById, addComment, deleteComment } from '@/api/comment.js'

// 评论列表
const commentList = ref([])
const loading = ref(false)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  content: '',
  blogId: null,
  userId: null
})
const total = ref(0)

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增评论')
const detailDialogVisible = ref(false)
const currentComment = ref({})

// 表单数据和校验规则
const formData = reactive({
  content: '',
  blogId: null,
  userId: null,
  parentId: null
})

const formRules = {
  content: [
    { required: true, message: '请输入评论内容', trigger: 'blur' }
  ],
  blogId: [
    { required: true, message: '请输入文章ID', trigger: 'blur' }
  ],
  userId: [
    { required: true, message: '请输入用户ID', trigger: 'blur' }
  ]
}

const formRef = ref(null)

// 获取评论分页数据
const getList = async () => {
  loading.value = true
  try {
    const res = await getCommentPage(queryParams)
    if (res.code === 0) {
      commentList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.msg || '获取评论列表失败')
    }
  } catch (error) {
    console.error('获取评论列表失败', error)
    ElMessage.error('获取评论列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询表单
const resetQuery = () => {
  queryParams.content = ''
  queryParams.blogId = null
  queryParams.userId = null
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

// 打开新增对话框
const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增评论'
  dialogVisible.value = true
}

// 查看评论详情
const handleView = async (row) => {
  try {
    const res = await getCommentById(row.id)
    if (res.code === 0 && res.data) {
      currentComment.value = res.data
      detailDialogVisible.value = true
    } else {
      ElMessage.error(res.msg || '获取评论详情失败')
    }
  } catch (error) {
    console.error('获取评论详情失败', error)
    ElMessage.error('获取评论详情失败')
  }
}

// 删除评论
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该评论吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteComment(row.id)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        getList() // 重新获取列表
      } else {
        ElMessage.error(res.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除评论失败', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  formData.content = ''
  formData.blogId = null
  formData.userId = null
  formData.parentId = null
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await addComment(formData)
        
        if (res.code === 0) {
          ElMessage.success('添加成功')
          dialogVisible.value = false
          getList() // 重新获取列表
        } else {
          ElMessage.error(res.msg || '添加失败')
        }
      } catch (error) {
        console.error('添加评论失败', error)
        ElMessage.error('添加失败')
      }
    }
  })
}

// 页面加载时获取数据
onMounted(() => {
  getList()
})
</script>

<template>
  <div class="comment-container">
    <div class="card-header">
      <h2 class="page-title">评论管理</h2>
      <el-button type="primary" @click="handleAdd" :icon="Plus">新增评论</el-button>
    </div>
    
    <el-card shadow="hover" class="search-box">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="评论内容">
          <el-input v-model="queryParams.content" placeholder="请输入评论内容关键词" clearable />
        </el-form-item>
        <el-form-item label="文章ID">
          <el-input v-model.number="queryParams.blogId" placeholder="请输入文章ID" clearable />
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input v-model.number="queryParams.userId" placeholder="请输入用户ID" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover" class="comment-card">
      <el-table :data="commentList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="content" label="评论内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="blogId" label="文章ID" width="100" />
        <el-table-column prop="userId" label="用户ID" width="100" />
        <el-table-column prop="username" label="用户名" width="120" show-overflow-tooltip />
        <el-table-column prop="parentId" label="父评论ID" width="100">
          <template #default="scope">
            {{ scope.row.parentId || '无' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 0 ? 'success' : 'danger'">
              {{ scope.row.status === 0 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleView(scope.row)">查看</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
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
    
    <!-- 新增对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" append-to-body destroy-on-close>
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
        status-icon
      >
        <el-form-item label="评论内容" prop="content">
          <el-input 
            v-model="formData.content" 
            type="textarea" 
            placeholder="请输入评论内容" 
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="文章ID" prop="blogId">
          <el-input v-model.number="formData.blogId" placeholder="请输入文章ID" clearable />
        </el-form-item>
        <el-form-item label="用户ID" prop="userId">
          <el-input v-model.number="formData.userId" placeholder="请输入用户ID" clearable />
        </el-form-item>
        <el-form-item label="父评论ID" prop="parentId">
          <el-input v-model.number="formData.parentId" placeholder="请输入父评论ID（可选）" clearable />
          <div class="form-tip">回复评论时需填写，新评论可不填</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 评论详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="评论详情" width="600px" append-to-body destroy-on-close>
      <div class="comment-detail">
        <div class="comment-meta">
          <div class="meta-item">
            <span class="meta-label">评论ID：</span>
            <span>{{ currentComment.id }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">文章ID：</span>
            <span>{{ currentComment.blogId }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">用户ID：</span>
            <span>{{ currentComment.userId }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">用户名：</span>
            <span>{{ currentComment.username }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">父评论ID：</span>
            <span>{{ currentComment.parentId || '无' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">创建时间：</span>
            <span>{{ currentComment.createTime }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">点赞数：</span>
            <span>{{ currentComment.likes || 0 }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">踩数：</span>
            <span>{{ currentComment.dislikes || 0 }}</span>
          </div>
        </div>
        <div class="comment-content">
          <div class="content-label">评论内容：</div>
          <div class="content-text">{{ currentComment.comment || currentComment.content }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.comment-container {
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

.comment-card {
  margin-bottom: 20px;
}

.pagination-box {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 评论详情样式 */
.comment-detail {
  padding: 10px;
}

.comment-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
}

.meta-label {
  font-weight: bold;
  margin-right: 5px;
  color: #606266;
}

.comment-content {
  margin-top: 20px;
}

.content-label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #606266;
}

.content-text {
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  min-height: 80px;
  white-space: pre-wrap;
  line-height: 1.6;
}

/* 表格内容居中 */
:deep(.el-table .cell) {
  text-align: center;
}

/* 表头居中 */
:deep(.el-table th.el-table__cell) {
  text-align: center;
}
</style> 