<script setup>
import {onMounted, reactive, ref} from "vue";
import {commentReportPageQuery, getCommentReportById, getCommentById, handleCommentReport} from "@/api/commentReport.js";
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
  commentContent: '',
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
  { value: 'SPAM', label: '垃圾信息' },
  { value: 'OTHER', label: '其他' }
]

// 获取举报列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await commentReportPageQuery(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
    } else {
      ElMessage.error(res.msg || '获取评论举报列表失败');
    }
  } catch (err) {
    console.log('获取评论举报列表出错：', err);
    ElMessage.error('获取评论举报列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 重置查询条件
const resetQueryParam = () => {
  queryParams.reporterName = '';
  queryParams.commentContent = '';
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

// 查看评论详情
const commentDetail = ref({});
const currentReport = ref({}); // 新增：保存当前举报信息
const detailDialogVisible = ref(false);

const showCommentDetail = async (row) => {
  try {
    const res = await getCommentById(row.commentId);
    if (res.code === 0) {
      commentDetail.value = res.data;
      currentReport.value = row; // 保存举报信息
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(res.msg || '获取评论详情失败');
    }
  } catch (err) {
    console.log('获取评论详情出错：', err);
    ElMessage.error('获取评论详情失败，请稍后重试');
  }
}

// 处理举报对话框
const handleDialogVisible = ref(false);
const handleForm = reactive({
  id: null,
  commentId: null,
  reviewerId: 1, // 实际应用中应从用户会话中获取
  status: null,
  reviewReason: '', // 与后端DTO一致
  reviewResult: 0 // 与后端DTO一致：0-正常、1-删除
});

// 审核结果选项
const reviewResultOptions = [
  { value: 0, label: '正常' },
  { value: 1, label: '删除评论' }
]

// 表单验证规则
const handleRules = reactive({
  reviewReason: [
    { required: false, message: '请输入审核原因', trigger: 'blur' }
  ]
});

// 动态设置表单验证规则
const validateReviewReason = (rule, value, callback) => {
  // 如果是删除评论操作，则审核原因必填
  if (handleForm.reviewResult === 1 && (!value || value.trim() === '')) {
    callback(new Error('删除评论时，审核原因必填'));
  } else {
    callback();
  }
};

const handleFormRef = ref(null);

// 打开处理对话框
const openHandleDialog = (report, status) => {
  handleForm.id = report.id;
  handleForm.commentId = report.commentId;
  handleForm.status = status;
  handleForm.reviewReason = '';
  handleForm.reviewResult = 0;
  handleDialogVisible.value = true;
}

// 提交处理结果
const submitHandle = async () => {
  if (!handleFormRef.value) return;
  // 防止重复提交
  if (submitting.value) return;
  
  // 如果是删除评论操作，则审核原因必填
  if (handleForm.status === 1 && handleForm.reviewResult === 1) {
    handleRules.reviewReason[0].required = true;
  } else {
    handleRules.reviewReason[0].required = false;
  }
  
  await handleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        submitting.value = true;
        const res = await handleCommentReport(handleForm);
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

// 初始加载数据
onMounted(() => {
  getList();
})
</script>

<template>
  <div class="comment-report-container">
    <h2 style="margin-bottom: 20px">评论举报处理</h2>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="举报用户">
          <el-input v-model="queryParams.reporterName" placeholder="请输入举报用户名" clearable />
        </el-form-item>
        <el-form-item label="评论内容">
          <el-input v-model="queryParams.commentContent" placeholder="请输入评论内容关键词" clearable />
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
        <el-table-column prop="reporterName" label="举报用户" width="120" />
        <el-table-column prop="commentContent" label="评论内容" show-overflow-tooltip />
        <el-table-column prop="commentUsername" label="评论作者" width="120" />
        <el-table-column prop="reportReason" label="举报原因" width="120" show-overflow-tooltip />
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
            <el-button size="small" @click="showCommentDetail(scope.row)">查看评论</el-button>
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
    
    <!-- 评论详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="评论详情"
      width="60%"
      destroy-on-close
    >
      <div class="comment-detail" v-if="commentDetail">
        <el-descriptions border>
          <el-descriptions-item label="评论ID">{{ commentDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="评论作者">{{ commentDetail.username }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ commentDetail.createTime }}</el-descriptions-item>
          <el-descriptions-item label="所属博客ID">{{ commentDetail.blogId }}</el-descriptions-item>
<!--          <el-descriptions-item label="点赞数">{{ commentDetail.likeCount || 0 }}</el-descriptions-item>-->
        </el-descriptions>
        
        <div class="report-info-section" style="margin-top: 20px;">
          <el-alert
            :title="'举报原因：' + currentReport.reportReason"
            type="error"
            :closable="false"
            show-icon
          >
            <template #default>
              <div>举报时间：{{ currentReport.reportTime }}</div>
              <div>举报人：{{ currentReport.reporterName }}</div>
            </template>
          </el-alert>
        </div>
        
        <div class="detail-section">
          <h3>评论内容</h3>
          <div class="content-box">{{ commentDetail.content }}</div>
        </div>
        
        <div class="detail-section" v-if="commentDetail.replyContent">
          <h3>回复内容</h3>
          <div class="content-box">{{ commentDetail.replyContent }}</div>
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
        <el-form-item label="评论ID">
          <span>{{ handleForm.commentId }}</span>
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
          prop="reviewReason"
          :rules="[
            { required: handleForm.status === 1 && handleForm.reviewResult === 1, 
              message: '删除评论时，审核原因必填', 
              trigger: 'blur' 
            }
          ]"
        >
          <el-input
            v-model="handleForm.reviewReason"
            type="textarea"
            rows="4"
            :placeholder="handleForm.status === 1 && handleForm.reviewResult === 1 ? '请输入审核原因（必填）' : '请输入审核原因（选填）'"
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
.comment-report-container {
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

.comment-detail {
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