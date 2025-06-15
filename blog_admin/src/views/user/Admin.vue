<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminPage, addAdmin, updateAdmin, setAdminStatus, deleteAdmin } from '@/api/admin.js'
import { Plus } from '@element-plus/icons-vue'

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  username: '',
  status: null
})

// 表格数据
const tableData = ref([])
const total = ref(0)
const loading = ref(false)

// 表单数据
const formData = reactive({
  id: null,
  username: '',
  name: '',
  password: '',
  email: '',
  role: 0,
  status: 1
})

// 表单规则
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
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 对话框显示控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增管理员')
const dialogType = ref('add') // add or edit

// 表单引用
const formRef = ref(null)

// 获取管理员列表
const getList = async () => {
  loading.value = true
  try {
    const res = await getAdminPage(queryParams)
    if (res.code === 0) {
      tableData.value = res.data.records
      total.value = res.data.total
    } else {
      ElMessage.error(res.msg || '查询失败')
    }
  } catch (error) {
    console.error('获取管理员列表失败', error)
    ElMessage.error('获取管理员列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询表单
const resetQuery = () => {
  queryParams.name = ''
  queryParams.username = ''
  queryParams.status = null
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
  dialogTitle.value = '新增管理员'
  dialogType.value = 'add'
  dialogVisible.value = true
  // 新增时密码为必填
  formRules.password[0].required = true
}

// 打开编辑对话框
const handleEdit = (row) => {
  resetForm()
  dialogTitle.value = '编辑管理员'
  dialogType.value = 'edit'
  
  // 编辑时密码为非必填
  formRules.password[0].required = false
  
  // 填充表单数据
  formData.id = row.id
  formData.username = row.username
  formData.name = row.name
  formData.email = row.email
  formData.role = row.role
  formData.status = row.status
  formData.password = '' // 编辑时不回显密码
  
  dialogVisible.value = true
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
  formData.role = 0
  formData.status = 0 // 默认状态为启用(0)
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let res
        if (dialogType.value === 'add') {
          res = await addAdmin(formData)
        } else {
          // 编辑时，如果密码为空，则不提交密码字段
          const submitData = { ...formData }
          if (!submitData.password) {
            delete submitData.password
          }
          res = await updateAdmin(submitData)
        }
        
        if (res.code === 0) {
          ElMessage.success(dialogType.value === 'add' ? '添加成功' : '修改成功')
          dialogVisible.value = false
          getList()
        } else {
          ElMessage.error(res.msg || (dialogType.value === 'add' ? '添加失败' : '修改失败'))
        }
      } catch (error) {
        console.error(dialogType.value === 'add' ? '添加管理员失败' : '修改管理员失败', error)
        ElMessage.error(dialogType.value === 'add' ? '添加失败' : '修改失败')
      }
    }
  })
}

// 删除管理员
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除管理员 ${row.name} 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteAdmin(row.id)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        getList()
      } else {
        ElMessage.error(res.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除管理员失败', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 启用/禁用管理员
const handleStatusChange = async (row) => {
  // 计算目标状态
  const targetStatus = row.status === 0 ? 1 : 0
  const statusText = targetStatus === 0 ? '启用' : '禁用'
  const originalStatus = row.status // 保存原始状态
  
  try {
    // 发送请求前不改变UI状态
    const res = await setAdminStatus(row.id, targetStatus)
    if (res.code === 0) {
      // 请求成功才改变状态
      ElMessage.success(`${statusText}成功`)
      row.status = targetStatus
    } else {
      // 请求失败，提示错误
      ElMessage.error(res.msg || `${statusText}失败`)
    }
  } catch (error) {
    console.error(`${statusText}管理员失败`, error)
    ElMessage.error(`${statusText}失败`)
  }
}

// 角色格式化
const formatRole = (row) => {
  const roles = {
    0: '管理员',
    1: '审核员',
    2: '普通用户'
  }
  return roles[row.role] || '未知角色'
}

// 状态格式化
const formatStatus = (row) => {
  return row.status === 0 ? '启用' : '禁用'
}

// 获取角色标签类型
const getRoleTagType = (role) => {
  const types = {
    0: 'primary',  // 管理员
    1: 'warning', // 审核员
    2: ''         // 普通用户
  }
  return types[role] || ''
}

// 页面加载时获取数据
onMounted(() => {
  getList()
})
</script>

<template>
  <div class="admin-container">
    <div class="card-header">
      <h2 class="page-title">管理员管理</h2>
      <el-button type="primary" @click="handleAdd" :icon="Plus">新增管理员</el-button>
    </div>
    <div class="search-box">
      <el-card shadow="hover">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="用户名">
            <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="queryParams.name" placeholder="请输入姓名" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 150px;">
              <el-option label="启用" :value="0" />
              <el-option label="禁用" :value="1" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="getList">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div class="table-box">
      <el-card shadow="hover">
        <el-table :data="tableData" style="width: 100%;" v-loading="loading">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="email" label="邮箱" min-width="180" max-width="200"/>
          <el-table-column label="角色" width="100">
            <template #default="scope">
              <el-tag :type="getRoleTagType(scope.row.role)">
                {{ formatRole(scope.row) }}
              </el-tag>
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
    </div>

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
          <el-input v-model="formData.email" :disabled="dialogType === 'edit'" placeholder="请输入邮箱" clearable />
          <div class="form-tip" v-if="dialogType === 'edit'">邮箱不可修改</div>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%;">
            <el-option label="管理员" :value="0" />
            <el-option label="审核员" :value="1" />
            <el-option label="普通用户" :value="2" />
          </el-select>
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
.admin-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: #303133;
}

.search-box {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-box {
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