<script setup>
import {onMounted, reactive, ref} from "vue";
import {userReportPageQuery, getUserReportById, getUserById, handleUserReport, markUserReportAsInProcess} from "@/api/userReport.js";
import {ElMessage} from "element-plus";

// 分页数据
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
// 提交中loading状态（防止重复点击）
const submitting = ref(false);
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  reporterName: '',
  reportedUsername: '',
  status: ''
})

// 举报状态选项
const reportStatus = [
  { value: 0, label: '待处理' },
  { value: 1, label: '处理中' },
  { value: 2, label: '已处理' },
  { value: 3, label: '已忽略' }
]

// 用户状态映射
const getUserStatusLabel = (status) => {
  return status === 0 ? '正常' : '已封禁'
}

// 获取用户状态对应的标签类型
const getUserStatusType = (status) => {
  return status === 0 ? 'success' : 'danger' // 0正常-绿，1封禁-红
}

// 状态标签类型映射
const statusTypeMap = {
  0: 'info',
  1: 'primary',
  2: 'success',
  3: 'info'
}

// 举报原因类型
const reportReasonTypes = [
  { value: 'ILLEGAL', label: '违法信息' },
  { value: 'PORNOGRAPHY', label: '色情内容' },
  { value: 'ADVERTISEMENT', label: '广告营销' },
  { value: 'HARASSMENT', label: '人身攻击' },
  { value: 'SPAM', label: '垃圾账号' },
  { value: 'FAKE', label: '虚假账号' },
  { value: 'OTHER', label: '其他' }
]

// 获取举报列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await userReportPageQuery(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
    } else {
      ElMessage.error(res.msg || '获取用户举报列表失败');
    }
  } catch (err) {
    console.log('获取用户举报列表出错：', err);
    ElMessage.error('获取用户举报列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 重置查询条件
const resetQueryParam = () => {
  queryParams.reporterName = '';
  queryParams.reportedUsername = '';
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

// 查看用户详情
const userDetail = ref({});
const reportDetail = ref({});
const detailDialogVisible = ref(false);

const showUserDetail = async (reportId) => {
  try {
    // 1. 获取举报详情
    const reportRes = await getUserReportById(reportId);
    if (reportRes.code !== 0) {
      ElMessage.error(reportRes.msg || '获取举报详情失败');
      return;
    }
    reportDetail.value = reportRes.data;
    
    // 2. 获取被举报用户详情
    const userId = reportRes.data.reportedUserId;
    if (userId) {
      const userRes = await getUserById(userId);
      if (userRes.code === 0) {
        userDetail.value = userRes.data;
        detailDialogVisible.value = true;
      } else {
        ElMessage.error(userRes.msg || '获取用户详情失败');
      }
    } else {
      ElMessage.error('无法获取被举报用户ID');
    }
  } catch (err) {
    console.log('获取详情出错：', err);
    ElMessage.error('获取详情失败，请稍后重试');
  }
}

// 跳转到用户主页
const openUserHomepage = (userId) => {
  // TODO: 这里即使是开发环境也写死 localhost:2002, 生产环境需改为实际域名
  // 建议提取到配置文件中
  const baseUrl = 'http://localhost:2002'; 
  window.open(`${baseUrl}/user/${userId}`, '_blank');
}

// 处理举报对话框
const handleDialogVisible = ref(false);
const handleForm = reactive({
  id: null,
  reportedUserId: null,
  reviewerId: 1, // 实际应用中应从用户会话中获取
  status: null,
  reviewReason: '',
  reviewResult: 0 // 0: 正常, 1: 封禁
});

// 审核结果选项
const reviewResultOptions = [
  { value: 0, label: '正常' },
  { value: 1, label: '封禁用户' }
]

// 获取审核结果标签
const getReviewResultLabel = (value) => {
  const option = reviewResultOptions.find(item => item.value === value)
  return option ? option.label : '未知'
}

// 表单验证规则
const handleRules = reactive({
  reviewReason: [
    { required: false, message: '请输入审核原因', trigger: 'blur' }
  ]
});

const handleFormRef = ref(null);

// 打开处理对话框
const openHandleDialog = (report, status) => {
  handleForm.id = report.id;
  // 注意：这里需要 ensure report 对象中有 reportedUserId
  // pageQuery 返回的 VO 应该包含 reportedUserId
  handleForm.reportedUserId = report.reportedUserId; 
  handleForm.status = status; // 1: 处理, 2: 忽略
  handleForm.reviewReason = '';
  handleForm.reviewResult = 0;
  handleDialogVisible.value = true;
}

// 提交处理结果
const submitHandle = async () => {
  if (!handleFormRef.value) return;
  // 防止重复提交
  if (submitting.value) return;
  
  // 如果是封禁用户操作，则审核原因必填
  if (handleForm.status === 2 && handleForm.reviewResult === 1) {
    handleRules.reviewReason[0].required = true;
  } else {
    handleRules.reviewReason[0].required = false;
  }
  
  await handleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        submitting.value = true;
        const res = await handleUserReport(handleForm);
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
      } finally {
        submitting.value = false;
      }
    } else {
      return false;
    }
  });
}

// 标记为处理中
const markAsInProcess = async (row) => {
  try {
    const res = await markUserReportAsInProcess(row.id);
    if (res.code === 0) {
      ElMessage.success('已标记为处理中');
      getList();
    } else {
      ElMessage.error(res.msg || '标记失败');
    }
  } catch (err) {
    console.log('标记为处理中出错：', err);
    ElMessage.error('标记失败，请稍后重试');
  }
}

// 检查是否可以处理
const canHandle = (row) => {
  // 允许待处理(0)和处理中(1)状态进行操作
  // TODO: 后续需要添加处理人权限检查
  return row.status === 0 || row.status === 1;
}

// 初始加载数据
onMounted(() => {
  getList();
})
</script>

<template>
  <div class="user-report-container">
    <h2 style="margin-bottom: 20px">用户举报处理</h2>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="举报用户">
          <el-input v-model="queryParams.reporterName" placeholder="请输入举报用户名" clearable />
        </el-form-item>
        <el-form-item label="被举报用户">
          <el-input v-model="queryParams.reportedUsername" placeholder="请输入被举报用户名" clearable />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 150px">
            <el-option 
              v-for="item in reportStatus" 
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
        <el-table-column prop="reporterName" label="举报用户" width="120" />
        <el-table-column prop="reportedUsername" label="被举报用户" width="120" />
        <el-table-column prop="reportReason" label="举报原因" show-overflow-tooltip />
        <el-table-column prop="reportTime" label="举报时间" width="180" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="(scope.row.status === 0 || scope.row.status === 1) ? statusTypeMap[scope.row.status] : getUserStatusType(scope.row.reportedUserStatus)">
              <!-- 如果举报状态是待处理(0)或处理中(1)，显示举报状态 -->
              <template v-if="scope.row.status === 0 || scope.row.status === 1">
                {{ reportStatus.find(s => s.value === scope.row.status)?.label || '未知状态' }}
              </template>
              <!-- 否则显示用户的实际状态 -->
              <template v-else>
                {{ getUserStatusLabel(scope.row.reportedUserStatus) }}
              </template>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320">
          <template #default="scope">
            <el-button size="small" @click="showUserDetail(scope.row.id)">查看详情</el-button>
            <el-button 
              size="small"
              v-if="scope.row.status === 0"
              @click="markAsInProcess(scope.row)">标记处理中</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="openHandleDialog(scope.row, 2)"
              :disabled="!canHandle(scope.row)">处理</el-button>
            <el-button 
              size="small" 
              type="warning" 
              @click="openHandleDialog(scope.row, 3)"
              :disabled="!canHandle(scope.row)">忽略</el-button>
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
    
    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="用户详情"
      width="600px"
      destroy-on-close
    >
      <div class="user-detail" v-if="userDetail">
        <div class="user-info-header" style="display: flex; align-items: center; margin-bottom: 20px;">
          <el-avatar :size="60" :src="userDetail.avatar"></el-avatar>
          <div style="margin-left: 20px;">
            <div style="font-size: 18px; font-weight: bold;">{{ userDetail.username }}</div>
            <div style="color: #999; margin-top: 5px;">ID: {{ userDetail.id }}</div>
          </div>
          <el-button style="margin-left: auto;" @click="openUserHomepage(userDetail.id)">访问主页</el-button>
        </div>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="邮箱">{{ userDetail.email || '未绑定' }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ userDetail.createTime }}</el-descriptions-item>
          <el-descriptions-item label="简介">{{ userDetail.summary || '暂无简介' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="userDetail.status === 0 ? 'success' : 'danger'">
              {{ userDetail.status === 0 ? '正常' : '封禁中' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="report-info-section" style="margin-top: 20px;">
          <el-alert
            :title="'举报原因：' + reportDetail.reportReason"
            type="error"
            :closable="false"
            show-icon
          >
            <template #default>
              <div>举报时间：{{ reportDetail.reportTime }}</div>
              <div>举报人：{{ reportDetail.reporterName }}</div>
            </template>
          </el-alert>
        </div>
        
        <!-- 审核信息显示（如果已被审核） -->
        <div v-if="reportDetail.reviewReason || (reportDetail.status !== null && reportDetail.status !== 0)" 
             style="margin-top: 20px; padding: 15px; background-color: #e6f7ff; border-radius: 4px; border-left: 4px solid #1890ff;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #1890ff;">审核信息：</div>
          <div v-if="reportDetail.reviewReason">
            <div style="margin-bottom: 5px;">审核结果：{{ getReviewResultLabel(reportDetail.reviewResult) }}</div>
            <div style="margin-bottom: 5px;">审核原因：{{ reportDetail.reviewReason }}</div>
            <div v-if="reportDetail.reviewerName" style="margin-bottom: 5px;">审核员：{{ reportDetail.reviewerName }}</div>
            <div v-if="reportDetail.reviewTime">审核时间：{{ reportDetail.reviewTime }}</div>
          </div>
          <div v-else style="color: #999;">暂无审核原因记录</div>
        </div>
      </div>
    </el-dialog>

    <!-- 处理对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      :title="handleForm.status === 2 ? '处理举报' : '忽略举报'"
      width="500px"
      destroy-on-close
    >
      <el-form 
        :model="handleForm" 
        label-width="100px"
        ref="handleFormRef"
        :rules="handleRules"
      >
        <el-form-item label="被举报用户ID">
          <span>{{ handleForm.reportedUserId }}</span>
        </el-form-item>
        <el-form-item label="处理结果">
          <el-tag :type="handleForm.status === 2 ? 'success' : 'warning'">
            {{ handleForm.status === 2 ? '处理' : '忽略' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="审核结果" v-if="handleForm.status === 2">
          <el-select v-model="handleForm.reviewResult">
            <el-option 
              v-for="item in reviewResultOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item 
          label="审核原因" 
          prop="reviewReason"
          :rules="[
            { required: handleForm.status === 2 && handleForm.reviewResult === 1, 
              message: '封禁用户时，审核原因必填', 
              trigger: 'blur' 
            }
          ]"
        >
          <el-input
            v-model="handleForm.reviewReason"
            type="textarea"
            rows="4"
            :placeholder="handleForm.status === 2 && handleForm.reviewResult === 1 ? '请输入审核原因（必填）' : '请输入审核原因（选填）'"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDialogVisible = false" :disabled="submitting">取消</el-button>
          <el-button type="primary" @click="submitHandle" :loading="submitting" :disabled="submitting">提交</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-report-container {
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

.user-detail {
  padding: 10px;
}
</style>