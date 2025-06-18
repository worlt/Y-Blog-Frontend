<script setup>
import {reactive, ref} from "vue";
import {appealPageQuery, getAppealById, handleAppeal, inProcess} from "@/api/appeal.js";
import {ElMessage} from "element-plus";

// 分页数据
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  username: '',
  type: '',
  status: ''
})

// 申诉类型选项
const appealTypes = [
  { value: 'BLOG', label: '博客申诉' },
  { value: 'COMMENT', label: '评论申诉' },
  { value: 'USER', label: '用户申诉' }
]

// 申诉状态选项
const appealStatus = [
  { value: 0, label: '待处理' },
  { value: 1, label: '处理中' },
  { value: 2, label: '已通过' },
  { value: 3, label: '已拒绝' }
]

// 状态标签类型映射
const statusTypeMap = {
  0: 'info',
  1: 'warning',
  2: 'success',
  3: 'danger'
}

// 获取申诉列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await appealPageQuery(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
    } else {
      ElMessage.error(res.msg || '获取申诉列表失败');
    }
  } catch (err) {
    console.log('获取申诉列表出错：', err);
    ElMessage.error('获取申诉列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 重置查询条件
const resetQueryParam = () => {
  queryParams.username = '';
  queryParams.type = '';
  queryParams.status = '';
  queryParams.page = 1;
  getList();
}

// 处理页码变化
const pageChange = (page) => {
  queryParams.page = page;
  getList();
}

// 处理每页条数变化
const pageSizeChange = (pageSize) => {
  queryParams.page = 1;
  queryParams.pageSize = pageSize;
  getList();
}

// 查看申诉详情
const appealDetail = ref({});
const detailDialogVisible = ref(false);

const showAppealDetail = async (id) => {
  try {
    const res = await getAppealById(id);
    if (res.code === 0) {
      appealDetail.value = res.data;
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(res.msg || '获取申诉详情失败');
    }
  } catch (err) {
    console.log('获取申诉详情出错：', err);
    ElMessage.error('获取申诉详情失败，请稍后重试');
  }
}

// 处理申诉对话框
const handleDialogVisible = ref(false);
const handleForm = reactive({
  id: null,
  reviewerId: 1, // 实际应用中应从用户会话中获取
  status: null,
  reviewResult: null,
  reviewReason: '',
  email: ''
});

// 表单验证规则
const handleRules = reactive({
  reviewReason: [
    { required: false, message: '请输入处理意见', trigger: 'blur' }
  ]
});

const handleFormRef = ref(null);

// 打开处理对话框
const openHandleDialog = (appeal, status) => {
  handleForm.id = appeal.id;
  handleForm.status = status;
  handleForm.reviewResult = status === 2 ? 0 : 1; // 2-已通过对应reviewResult=0，3-已拒绝对应reviewResult=1
  handleForm.reviewReason = '';
  handleForm.email = appeal.email || '';
  handleDialogVisible.value = true;
}

// 设置为处理中
const setInProcess = async (id) => {
  try {
    const res = await inProcess(id);
    if (res.code === 0) {
      ElMessage.success('已设置为处理中');
      getList(); // 刷新列表
    } else {
      ElMessage.error(res.msg || '操作失败');
    }
  } catch (err) {
    console.log('设置为处理中出错：', err);
    ElMessage.error('操作失败，请稍后重试');
  }
}

// 提交处理结果
const submitHandle = async () => {
  if (!handleFormRef.value) return;
  
  // 如果是拒绝申诉，则处理意见必填
  if (handleForm.reviewResult === 1) {
    handleRules.reviewReason[0].required = true;
  } else {
    handleRules.reviewReason[0].required = false;
  }
  
  await handleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await handleAppeal(handleForm);
        if (res.code === 0) {
          ElMessage.success('处理提交成功');
          handleDialogVisible.value = false;
          getList(); // 刷新列表
        } else {
          ElMessage.error(res.msg || '处理提交失败');
        }
      } catch (err) {
        console.log('处理提交出错：', err);
        ElMessage.error('处理提交失败，请稍后重试');
      }
    } else {
      return false;
    }
  });
}

// 初始加载数据
getList();
</script>

<template>
  <div class="appeal-container">
    <h2 style="margin-bottom: 20px">申诉处理</h2>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="用户名">
          <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="申诉类型">
          <el-select v-model="queryParams.type" placeholder="请选择类型" clearable>
            <el-option 
              v-for="item in appealTypes" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申诉状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
            <el-option 
              v-for="item in appealStatus" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQueryParam">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="table-card">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="申诉用户" width="120" />
        <el-table-column prop="appealReason" label="申诉内容" show-overflow-tooltip />
<!--        <el-table-column prop="type" label="申诉类型" width="100">-->
<!--          <template #default="scope">-->
<!--            {{ appealTypes.find(t => t.value === scope.row.type)?.label || scope.row.type }}-->
<!--          </template>-->
<!--        </el-table-column>-->
        <el-table-column prop="appealTime" label="申诉时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusTypeMap[scope.row.status]">
              {{ appealStatus.find(s => s.value === scope.row.status)?.label || '未知状态' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template #default="scope">
            <el-button size="small" @click="showAppealDetail(scope.row.id)">查看</el-button>
            <el-button 
              size="small" 
              type="warning" 
              @click="setInProcess(scope.row.id)"
              :disabled="scope.row.status !== 0">标记处理中</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="openHandleDialog(scope.row, 2)"
              :disabled="scope.row.status === 2 || scope.row.status === 3">通过</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="openHandleDialog(scope.row, 3)"
              :disabled="scope.row.status === 2 || scope.row.status === 3">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <el-pagination
        v-if="total > 0"
        class="pagination"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :page-size="queryParams.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :current-page="queryParams.page"
        @size-change="pageSizeChange"
        @current-change="pageChange"
      />
    </el-card>
    
    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="申诉详情"
      width="70%"
      destroy-on-close
    >
      <div class="appeal-detail" v-if="appealDetail">
        <el-descriptions border>
          <el-descriptions-item label="申诉用户">{{ appealDetail.username }}</el-descriptions-item>
<!--          <el-descriptions-item label="申诉类型">-->
<!--            {{ appealTypes.find(t => t.value === appealDetail.type)?.label || appealDetail.type }}-->
<!--          </el-descriptions-item>-->
          <el-descriptions-item label="申诉时间">{{ appealDetail.appealTime }}</el-descriptions-item>
          <el-descriptions-item label="申诉状态">
            <el-tag :type="statusTypeMap[appealDetail.status]">
              {{ appealStatus.find(s => s.value === appealDetail.status)?.label || '未知状态' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系邮箱" v-if="appealDetail.email">
            {{ appealDetail.email }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h3>申诉内容</h3>
          <div class="content-box">{{ appealDetail.appealReason }}</div>
        </div>
        
<!--        <div class="detail-section" v-if="appealDetail.evidence">-->
<!--          <h3>申诉证据</h3>-->
<!--          <div class="content-box">{{ appealDetail.evidence }}</div>-->
<!--        </div>-->
        
        <div class="detail-section" v-if="appealDetail.reviewReason">
          <h3>处理结果</h3>
          <div class="content-box">
            <p><strong>处理结果：</strong>{{ appealDetail.reviewResult === 0 ? '通过' : '拒绝' }}</p>
            <p><strong>处理意见：</strong>{{ appealDetail.reviewReason }}</p>
            <p v-if="appealDetail.reviewTime"><strong>处理时间：</strong>{{ appealDetail.reviewTime }}</p>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 处理对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      :title="(handleForm.reviewResult === 0 ? '通过' : '拒绝') + '申诉'"
      width="500px"
      destroy-on-close
    >
      <el-form 
        :model="handleForm" 
        label-width="100px"
        ref="handleFormRef"
        :rules="handleRules"
      >
        <el-form-item label="申诉ID">
          <span>{{ handleForm.id }}</span>
        </el-form-item>
        <el-form-item label="处理结果">
          <el-tag :type="handleForm.reviewResult === 0 ? 'success' : 'danger'">
            {{ handleForm.reviewResult === 0 ? '通过' : '拒绝' }}
          </el-tag>
        </el-form-item>
        <el-form-item 
          label="处理意见" 
          prop="reviewReason"
          :rules="[
            { required: handleForm.reviewResult === 1, 
              message: '拒绝申诉时，处理意见必填', 
              trigger: 'blur' 
            }
          ]"
        >
          <el-input
            v-model="handleForm.reviewReason"
            type="textarea"
            rows="4"
            :placeholder="handleForm.reviewResult === 1 ? '请输入处理意见（必填）' : '请输入处理意见（选填）'"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitHandle">提交</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.appeal-container {
  padding: 10px;
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.appeal-detail {
  padding: 20px;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
}

.content-box {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #f9f9f9;
  min-height: 60px;
  white-space: pre-wrap;
}
</style>