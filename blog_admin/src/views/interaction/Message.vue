<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getMessagePage, getMessageById, addMessage, deleteMessage } from '@/api/message.js'

// 消息列表
const messageList = ref([])
const loading = ref(false)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  content: ''
})
const total = ref(0)

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增消息')
const detailDialogVisible = ref(false)
const currentMessage = ref({})

// 表单数据和校验规则
const formData = reactive({
  content: '',
  senderId: null,
  receiverId: null,
  conversationId: null,
  messageType: 0 // 0-系统消息，1-用户消息
})

const formRules = {
  content: [
    { required: true, message: '请输入消息内容', trigger: 'blur' }
  ],
  messageType: [
    { required: true, message: '请选择消息类型', trigger: 'change' }
  ],
  senderId: [
    { required: true, message: '请输入发送者ID', trigger: 'blur' }
  ],
  receiverId: [
    { required: true, message: '请输入接收者ID', trigger: 'blur' }
  ]
}

const formRef = ref(null)

// 获取消息分页数据
const getList = async () => {
  loading.value = true
  try {
    const res = await getMessagePage(queryParams)
    if (res.code === 0) {
      messageList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.msg || '获取消息列表失败')
    }
  } catch (error) {
    console.error('获取消息列表失败', error)
    ElMessage.error('获取消息列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询表单
const resetQuery = () => {
  queryParams.content = ''
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
  dialogTitle.value = '新增消息'
  dialogVisible.value = true
}

// 查看消息详情
const handleView = async (row) => {
  try {
    const res = await getMessageById(row.id || row.id)
    if (res.code === 0 && res.data) {
      currentMessage.value = res.data
      detailDialogVisible.value = true
    } else {
      ElMessage.error(res.msg || '获取消息详情失败')
    }
  } catch (error) {
    console.error('获取消息详情失败', error)
    ElMessage.error('获取消息详情失败')
  }
}

// 删除消息
const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该消息吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteMessage(row.id || row.id)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        getList() // 重新获取列表
      } else {
        ElMessage.error(res.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除消息失败', error)
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
  formData.senderId = null
  formData.receiverId = null
  formData.conversationId = null
  formData.messageType = 0
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 系统消息时，发送者ID为0
        if (formData.messageType === 0) {
          formData.senderId = 0
        }
        
        const res = await addMessage(formData)
        
        if (res.code === 0) {
          ElMessage.success('添加成功')
          dialogVisible.value = false
          getList() // 重新获取列表
        } else {
          ElMessage.error(res.msg || '添加失败')
        }
      } catch (error) {
        console.error('添加消息失败', error)
        ElMessage.error('添加失败')
      }
    }
  })
}

// 消息类型格式化
const formatType = (row) => {
  const types = {
    0: '系统消息',
    1: '用户消息'
  }
  return types[row.messageType] || '未知类型'
}

// 已读状态格式化
const formatIsRead = (row) => {
  return row.isRead === 1 ? '已读' : '未读'
}

// 监听消息类型变化
const handleTypeChange = (val) => {
  // 当选择系统消息时，发送者ID为0
  if (val === 0) {
    formData.senderId = 0
  } else {
    formData.senderId = null
  }
}

// 页面加载时获取数据
onMounted(() => {
  getList()
})
</script>

<template>
  <div class="message-container">
    <div class="card-header">
      <h2 class="page-title">消息管理</h2>
      <el-button type="primary" @click="handleAdd" :icon="Plus">新增消息</el-button>
    </div>
    
    <el-card shadow="hover" class="search-box">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="内容">
          <el-input v-model="queryParams.content" placeholder="请输入内容关键词" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover" class="message-card">
      <el-table :data="messageList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="conversationId" label="会话ID" width="80" />
        <el-table-column prop="content" label="内容" min-width="250" show-overflow-tooltip />
        <el-table-column label="发送者" width="120">
          <template #default="scope">
            <span v-if="scope.row.messageType === 0">系统</span>
            <span v-else>{{ scope.row.senderName || scope.row.senderId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="接收者" width="120">
          <template #default="scope">
            <span>{{ scope.row.receiverId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.messageType === 0 ? 'danger' : 'primary'">
              {{ formatType(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.isRead === 1 ? 'success' : 'info'">
              {{ formatIsRead(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sendTime" label="发送时间" width="180" />
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
        <el-form-item label="类型" prop="messageType">
          <el-select v-model="formData.messageType" placeholder="请选择类型" style="width: 100%;" @change="handleTypeChange">
            <el-option label="系统消息" :value="0" />
            <el-option label="用户消息" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input 
            v-model="formData.content" 
            type="textarea" 
            placeholder="请输入内容" 
            :rows="5"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="发送者ID" prop="senderId" v-if="formData.messageType === 1">
          <el-input v-model.number="formData.senderId" placeholder="请输入发送者ID" clearable />
          <div class="form-tip">用户消息需要指定发送者ID</div>
        </el-form-item>
        <el-form-item label="接收者ID" prop="receiverId">
          <el-input v-model.number="formData.receiverId" placeholder="请输入接收者ID" clearable />
          <div class="form-tip">
            <template v-if="formData.messageType === 0">系统消息接收者ID为用户ID</template>
            <template v-else>用户消息接收者ID为目标用户ID</template>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 消息详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="消息详情" width="600px" append-to-body destroy-on-close>
      <div class="message-detail">
        <div class="message-meta">
          <div class="meta-item">
            <span class="meta-label">消息ID:</span>
            <span>{{ currentMessage.id || currentMessage.id }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">会话ID:</span>
            <span>{{ currentMessage.conversationId }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发送者:</span>
            <span>{{ currentMessage.messageType === 0 ? '系统' : (currentMessage.senderName || currentMessage.senderId) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">接收者:</span>
            <span>{{ currentMessage.receiverId }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">类型:</span>
            <span>{{ formatType(currentMessage) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">状态:</span>
            <span>{{ formatIsRead(currentMessage) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">时间:</span>
            <span>{{ currentMessage.sendTime }}</span>
          </div>
        </div>
        <div class="message-content">
          {{ currentMessage.content }}
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.message-container {
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

.message-card {
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

/* 消息详情样式 */
.message-detail {
  padding: 10px;
}

.message-meta {
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

.message-content {
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  min-height: 100px;
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