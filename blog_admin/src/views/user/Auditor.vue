<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAuditorPage, getAuditorById, addAuditor, updateAuditor, deleteAuditor, setAuditorStatus } from '@/api/auditor.js'

// 审核员列表
const auditorList = ref([])
const loading = ref(false)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  username: ''
})
const total = ref(0)

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增审核员')
const dialogType = ref('add') // add 或 edit

// 表单数据和校验规则
const formData = reactive({
  id: null,
  username: '',
  name: '',
  password: '',
  email: '',
  phone: '',
  gender: 2,  // 默认为未知
  avatar: '',
  status: 0,
  role: 1  // 默认为审核员
})

const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

const formRef = ref(null)

// 获取审核员分页数据
const getList = async () => {
  loading.value = true
  try {
    const res = await getAuditorPage(queryParams)
    if (res.code === 0) {
      auditorList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.msg || '获取审核员列表失败')
    }
  } catch (error) {
    console.error('获取审核员列表失败', error)
    ElMessage.error('获取审核员列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询表单
const resetQuery = () => {
  queryParams.name = ''
  queryParams.username = ''
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
  dialogTitle.value = '新增审核员'
  dialogType.value = 'add'
  dialogVisible.value = true
  // 新增时密码为必填
  formRules.password[0].required = true
}

// 打开编辑对话框
const handleEdit = async (row) => {
  resetForm()
  dialogTitle.value = '编辑审核员'
  dialogType.value = 'edit'
  
  // 编辑时密码为非必填
  formRules.password[0].required = false
  
  try {
    // 获取最新的审核员详情
    const res = await getAuditorById(row.id)
    if (res.code === 0 && res.data) {
      formData.id = res.data.id
      formData.username = res.data.username
      formData.name = res.data.name
      formData.email = res.data.email || ''
      formData.gender = res.data.gender || 0
      formData.avatar = res.data.avatar || ''
      formData.status = res.data.status
      formData.role = res.data.role || 1
      formData.password = '' // 编辑时不回显密码
      
      dialogVisible.value = true
    } else {
      ElMessage.error(res.msg || '获取审核员详情失败')
    }
  } catch (error) {
    console.error('获取审核员详情失败', error)
    ElMessage.error('获取审核员详情失败')
  }
}

// 删除审核员
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除审核员 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteAuditor(row.id)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        getList() // 重新获取列表
      } else {
        ElMessage.error(res.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除审核员失败', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  formData.id = null
  formData.username = ''
  formData.name = ''
  formData.password = ''
  formData.email = ''
  formData.gender = 2
  formData.avatar = ''
  formData.status = 0
  formData.role = 1
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let res
        if (dialogType.value === 'add') {
          res = await addAuditor(formData)
        } else {
          // 编辑时，如果密码为空，则不提交密码字段
          const submitData = { ...formData }
          if (!submitData.password) {
            submitData.password = '' 
          }
          res = await updateAuditor(submitData)
        }
        
        if (res.code === 0) {
          ElMessage.success(dialogType.value === 'add' ? '添加成功' : '修改成功')
          dialogVisible.value = false
          getList() // 重新获取列表
        } else {
          ElMessage.error(res.msg || (dialogType.value === 'add' ? '添加失败' : '修改失败'))
        }
      } catch (error) {
        console.error(dialogType.value === 'add' ? '添加审核员失败' : '修改审核员失败', error)
        ElMessage.error(dialogType.value === 'add' ? '添加失败' : '修改失败')
      }
    }
  })
}

// 状态格式化
const formatStatus = (row) => {
  return row.status === 0 ? '启用' : '禁用'
}

// 角色格式化
const formatRole = (row) => {
  const roles = {
    // 0: '管理员',
    1: '审核员'
  }
  return roles[row.role] || '审核员'
}

// 性别格式化
const formatGender = (row) => {
  const genders = {
    0: '男',
    1: '女'
  }
  return genders[row.gender] !== undefined ? genders[row.gender] : '未知'
}

// 启用/禁用审核员
const handleStatusChange = async (row) => {
  // 计算目标状态
  const targetStatus = row.status === 0 ? 1 : 0
  const statusText = targetStatus === 0 ? '启用' : '禁用'
  const originalStatus = row.status // 保存原始状态
  
  try {
    // 发送请求前不改变UI状态
    const res = await setAuditorStatus(row.id, targetStatus)
    if (res.code === 0) {
      // 请求成功才改变状态
      ElMessage.success(`${statusText}成功`)
      row.status = targetStatus
    } else {
      // 请求失败，提示错误
      ElMessage.error(res.msg || `${statusText}失败`)
    }
  } catch (error) {
    console.error(`${statusText}审核员失败`, error)
    ElMessage.error(`${statusText}失败`)
  }
}

// 页面加载时获取数据
onMounted(() => {
  getList()
})
</script>

<template>
  <div class="auditor-container">
    <div class="card-header">
      <h2 class="page-title">审核员管理</h2>
      <el-button type="primary" @click="handleAdd" :icon="Plus">新增审核员</el-button>
    </div>
    
    <el-card shadow="hover" class="search-box">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="用户名">
          <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="queryParams.name" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover" class="auditor-card">
      <el-table :data="auditorList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="性别" width="80">
          <template #default="scope">
            {{ formatGender(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.role === 0 ? 'danger' : 'warning'">
              {{ formatRole(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="头像" width="80">
          <template #default="scope">
            <el-avatar :size="40" :src="scope.row.avatar" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="scope">
            <el-switch
              :model-value="scope.row.status === 0"
              @change="(val) => handleStatusChange(scope.row)"
              active-color="#13ce66"
              inactive-color="#ff4949"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="updateTime" label="更新时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)">编辑</el-button>
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
    
    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" append-to-body destroy-on-close>
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
        status-icon
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" :disabled="dialogType === 'edit'" placeholder="请输入用户名" clearable />
          <div class="form-tip" v-if="dialogType === 'edit'">用户名不可修改</div>
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" type="password" placeholder="请输入密码" show-password />
          <div class="form-tip" v-if="dialogType === 'edit'">不修改密码请留空</div>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" clearable />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="formData.gender">
            <el-radio :label="0">男</el-radio>
            <el-radio :label="1">女</el-radio>
            <el-radio :label="2">未知</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <el-input v-model="formData.avatar" placeholder="请输入头像URL" clearable />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="formData.role">
            <el-radio :label="1">审核员</el-radio>
<!--            <el-radio :label="0">管理员</el-radio>-->
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :label="0">启用</el-radio>
            <el-radio :label="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.auditor-container {
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

.auditor-card {
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

/* 表格内容居中 */
:deep(.el-table .cell) {
  text-align: center;
}

/* 表头居中 */
:deep(.el-table th.el-table__cell) {
  text-align: center;
}
</style>