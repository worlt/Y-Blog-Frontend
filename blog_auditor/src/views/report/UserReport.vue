<script setup>
import {onMounted, reactive, ref} from "vue";
import {userReportPageQuery, getUserReportById, getUserById, handleUserReport} from "@/api/userReport.js";
import {ElMessage} from "element-plus";

// 分页数据
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  username: '',
  reportedUsername: '',
  status: ''
})

// 举报状态选项
const reportStatus = [
  { value: 0, label: '待处理' },
  { value: 1, label: '处理中' },
  { value: 2, label: '已处理' }
]

// 状态标签类型映射
const statusTypeMap = {
  0: 'info',
  1: 'warning',
  2: 'success'
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
  queryParams.username = '';
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

const showUserDetail = async (userId, reportId) => {
  try {
    // 获取用户详情
    const userRes = await getUserReportById(userId);
    if (userRes.code === 0) {
      userDetail.value = userRes.data;
      
      // 获取举报详情
      const reportRes = await getUserReportById(reportId);
      if (reportRes.code === 0) {
        reportDetail.value = reportRes.data;
      }
      
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(userRes.msg || '获取用户详情失败');
    }
  } catch (err) {
    console.log('获取用户详情出错：', err);
    ElMessage.error('获取用户详情失败，请稍后重试');
  }
}

// 处理举报对话框
const handleDialogVisible = ref(false);
const handleForm = reactive({
  id: null,
  reportedUserId: null,
  reviewerId: 1, // 实际应用中应从用户会话中获取
  status: null,
  reportReason: '',
  reviewResult: 0 // 0: 正常, 1: 封禁
});

// 审核结果选项
const reviewResultOptions = [
  { value: 0, label: '正常' },
  { value: 1, label: '封禁用户' }
]

// 表单验证规则
const handleRules = reactive({
  reportReason: [
    { required: false, message: '请输入审核原因', trigger: 'blur' }
  ]
});

const handleFormRef = ref(null);

// 打开处理对话框
const openHandleDialog = (report, status) => {
  handleForm.id = report.id;
  handleForm.reportedUserId = report.reportedUserId;
  handleForm.status = status;
  handleForm.reportReason = '';
  handleForm.reviewResult = 0;
  handleDialogVisible.value = true;
}

// 提交处理结果
const submitHandle = async () => {
  if (!handleFormRef.value) return;
  
  // 如果是封禁用户操作，则审核原因必填
  if (handleForm.status === 1 && handleForm.reviewResult === 1) {
    handleRules.reportReason[0].required = true;
  } else {
    handleRules.reportReason[0].required = false;
  }
  
  await handleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
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
      }
    } else {
      return false;
    }
  });
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
          <el-input v-model="queryParams.username" placeholder="请输入举报用户名" clearable />
        </el-form-item>
        <el-form-item label="被举报用户">
          <el-input v-model="queryParams.reportedUsername" placeholder="请输入被举报用户名" clearable />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
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
        <el-table-column prop="username" label="举报用户" width="120" />
        <el-table-column prop="reportedUsername" label="被举报用户" width="120" />
        <el-table-column prop="reportReason" label="举报原因" show-overflow-tooltip />
        <el-table-column prop="reportTime" label="举报时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusTypeMap[scope.row.status]">
              {{ reportStatus.find(s => s.value === scope.row.status)?.label || '未知状态' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250">
          <template #default="scope">
            <el-button size="small" @click="showUserDetail(scope.row.id, scope.row.id)">查看详情</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="openHandleDialog(scope.row, 1)"
              :disabled="scope.row.status !== 0">处理</el-button>
            <el-button 
              size="small" 
              type="warning" 
              @click="openHandleDialog(scope.row, 2)"
              :disabled="scope.row.status !== 0">忽略</el-button>
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
      title="用户与举报详情"
      width="70%"
      destroy-on-close
    >
      <div class="user-detail" v-if="userDetail">
        <h3>被举报用户信息</h3>
        <el-descriptions border>
          <el-descriptions-item label="用户ID">{{ userDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ userDetail.username }}</el-descriptions-item>
<!--          <el-descriptions-item label="邮箱">{{ userDetail.email }}</el-descriptions-item>-->
<!--          <el-descriptions-item label="手机">{{ userDetail.phone }}</el-descriptions-item>-->
<!--          <el-descriptions-item label="注册时间">{{ userDetail.createTime }}</el-descriptions-item>-->
          <el-descriptions-item label="状态">
            <el-tag :type="userDetail.status === 0 ? 'success' : 'danger'">
              {{ userDetail.status === 0 ? '正常' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section" v-if="reportDetail.reportReason">
          <h3>举报详情</h3>
          <el-descriptions border>
            <el-descriptions-item label="举报用户">{{ reportDetail.username }}</el-descriptions-item>
            <el-descriptions-item label="举报时间">{{ reportDetail.reportTime }}</el-descriptions-item>
            <el-descriptions-item label="举报状态">
              <el-tag :type="statusTypeMap[reportDetail.status]">
                {{ reportStatus.find(s => s.value === reportDetail.status)?.label || '未知状态' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          
          <div class="report-reason">
            <h4>举报原因</h4>
            <div class="content-box">{{ reportDetail.reportReason }}</div>
          </div>
          
<!--          <div class="report-review" v-if="reportDetail.reportReason">-->
<!--            <h4>审核结果</h4>-->
<!--            <div class="content-box">-->
<!--              <p><strong>审核结果：</strong>{{ reportDetail.reviewResult === 0 ? '正常' : '封禁' }}</p>-->
<!--              <p><strong>审核原因：</strong>{{ reportDetail.reportReason }}</p>-->
<!--              <p><strong>审核时间：</strong>{{ reportDetail.reviewTime }}</p>-->
<!--            </div>-->
<!--          </div>-->
        </div>
        
        <div class="detail-section" v-if="userDetail.bio">
          <h3>个人简介</h3>
          <div class="content-box">{{ userDetail.bio }}</div>
        </div>
        
        <div class="user-stats" v-if="userDetail.stats">
          <h3>用户数据统计</h3>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ userDetail.stats?.blogCount || 0 }}</div>
                <div class="stat-label">发布博客</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ userDetail.stats?.commentCount || 0 }}</div>
                <div class="stat-label">发表评论</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ userDetail.stats?.followerCount || 0 }}</div>
                <div class="stat-label">粉丝数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-value">{{ userDetail.stats?.followingCount || 0 }}</div>
                <div class="stat-label">关注数</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
    
    <!-- 处理对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      :title="handleForm.status === 1 ? '处理举报' : '忽略举报'"
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
          <el-tag :type="handleForm.status === 1 ? 'success' : 'warning'">
            {{ handleForm.status === 1 ? '处理' : '忽略' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="审核结果" v-if="handleForm.status === 1">
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
          prop="reportReason"
          :rules="[
            { required: handleForm.status === 1 && handleForm.reviewResult === 1, 
              message: '封禁用户时，审核原因必填', 
              trigger: 'blur' 
            }
          ]"
        >
          <el-input
            v-model="handleForm.reportReason"
            type="textarea"
            rows="4"
            :placeholder="handleForm.status === 1 && handleForm.reviewResult === 1 ? '请输入审核原因（必填）' : '请输入审核原因（选填）'"
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
  padding: 20px;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h3, .user-stats h3 {
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
}

.report-reason, .report-review {
  margin-top: 15px;
}

.report-reason h4, .report-review h4 {
  margin-bottom: 10px;
  font-size: 14px;
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

.user-stats {
  margin-top: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  margin-top: 5px;
  color: #606266;
}
</style>