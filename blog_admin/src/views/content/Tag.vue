<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { listAllTags, getTagPage, getTagById, addTag, updateTag, deleteTag } from '@/api/tag.js'

// 标签列表
const tagList = ref([])
const loading = ref(false)

// 分页参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  name: ''
})
const total = ref(0)

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增标签')
const dialogType = ref('add') // add 或 edit

// 表单数据和校验规则
const formData = reactive({
  id: null,
  name: ''
})

const formRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ]
}

const formRef = ref(null)

// 获取标签分页数据
const getList = async () => {
  loading.value = true
  try {
    const res = await getTagPage(queryParams)
    if (res.code === 0) {
      tagList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.msg || '获取标签列表失败')
    }
  } catch (error) {
    console.error('获取标签列表失败', error)
    ElMessage.error('获取标签列表失败')
  } finally {
    loading.value = false
  }
}

// 重置查询表单
const resetQuery = () => {
  queryParams.name = ''
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
  dialogTitle.value = '新增标签'
  dialogType.value = 'add'
  dialogVisible.value = true
}

// 打开编辑对话框
const handleEdit = async (row) => {
  resetForm()
  dialogTitle.value = '编辑标签'
  dialogType.value = 'edit'
  
  try {
    // 获取最新的标签详情
    const res = await getTagById(row.id)
    if (res.code === 0 && res.data) {
      formData.id = res.data.id
      formData.name = res.data.name
      
      dialogVisible.value = true
    } else {
      ElMessage.error(res.msg || '获取标签详情失败')
    }
  } catch (error) {
    console.error('获取标签详情失败', error)
    ElMessage.error('获取标签详情失败')
  }
}

// 删除标签
const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除标签 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteTag(row.id)
      if (res.code === 0) {
        ElMessage.success('删除成功')
        getList() // 重新获取列表
      } else {
        ElMessage.error(res.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除标签失败', error)
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
  formData.name = ''
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let res
        if (dialogType.value === 'add') {
          res = await addTag(formData)
        } else {
          res = await updateTag(formData)
        }
        
        if (res.code === 0) {
          ElMessage.success(dialogType.value === 'add' ? '添加成功' : '修改成功')
          dialogVisible.value = false
          getList() // 重新获取列表
        } else {
          ElMessage.error(res.msg || (dialogType.value === 'add' ? '添加失败' : '修改失败'))
        }
      } catch (error) {
        console.error(dialogType.value === 'add' ? '添加标签失败' : '修改标签失败', error)
        ElMessage.error(dialogType.value === 'add' ? '添加失败' : '修改失败')
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
  <div class="tag-container">
    <div class="card-header">
      <h2 class="page-title">标签管理</h2>
      <el-button type="primary" @click="handleAdd" :icon="Plus">新增标签</el-button>
    </div>
    
    <el-card shadow="hover" class="search-box">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="标签名称">
          <el-input v-model="queryParams.name" placeholder="请输入标签名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card shadow="hover" class="tag-card">
      <el-table :data="tagList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标签名称" />
        <el-table-column prop="createTime" label="创建时间" width="250" />
        <el-table-column prop="updateTime" label="更新时间" width="250" />
        <el-table-column label="操作" width="180" fixed="right">
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
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入标签名称" clearable />
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
.tag-container {
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

.tag-card {
  margin-bottom: 20px;
}

.pagination-box {
  margin-top: 20px;
  display: flex;
  justify-content: center;
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