<script setup>
import {reactive, ref} from "vue";
import {blogReportPageQuery, getBlogById, handleBlogReport} from "@/api/blogReport.js";
import {ElMessage} from "element-plus";
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

// 分页数据
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  username: '',
  blogTitle: '',
  status: ''
})

// 举报状态选项
const reportStatus = [
  { value: 0, label: '待处理' },
  { value: 1, label: '已处理' },
  { value: 2, label: '已忽略' }
]

// 状态标签类型映射
const statusTypeMap = {
  0: 'info',
  1: 'success',
  2: 'warning'
}

// 举报原因类型
const reportReasonTypes = [
  { value: 'ILLEGAL', label: '违法信息' },
  { value: 'PORNOGRAPHY', label: '色情内容' },
  { value: 'ADVERTISEMENT', label: '广告营销' },
  { value: 'PLAGIARISM', label: '抄袭侵权' },
  { value: 'HARASSMENT', label: '人身攻击' },
  { value: 'OTHER', label: '其他' }
]

// 获取举报列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await blogReportPageQuery(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
      console.log(res.data.records)
    } else {
      ElMessage.error(res.msg || '获取举报列表失败');
    }
  } catch (err) {
    console.log('获取举报列表出错：', err);
    ElMessage.error('获取举报列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 重置查询条件
const resetQueryParam = () => {
  queryParams.username = '';
  queryParams.blogTitle = '';
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

// 查看博客详情
const blogDetail = ref({});
const detailDialogVisible = ref(false);
const editorContent = ref('');
const editorConfig = { readOnly: true };
const editorRef = ref(null);

// 编辑器工具栏配置 - 只保留全屏按钮
const toolbarConfig = {
  toolbarKeys: ['fullScreen']
}

// 创建富文本编辑器实例
const handleCreated = (editor) => {
  editorRef.value = editor
}

// 关闭详情对话框
const closeDetailDialog = () => {
  // 先销毁编辑器实例
  if (editorRef.value) {
    editorRef.value.destroy();
    editorRef.value = null;
  }
  // 关闭对话框
  detailDialogVisible.value = false;
}

const showBlogDetail = async (id) => {
  try {
    const res = await getBlogById(id);
    if (res.code === 0) {
      blogDetail.value = res.data;
      editorContent.value = res.data.blogContent || '';
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(res.msg || '获取博客详情失败');
    }
  } catch (err) {
    console.log('获取博客详情出错：', err);
    ElMessage.error('获取博客详情失败，请稍后重试');
  }
}

// 处理举报对话框
const handleDialogVisible = ref(false);
const handleForm = reactive({
  id: null,
  blogId: null, // 用于前端记录，不会提交到后端
  blogTitle: '', // 用于前端显示，不会提交到后端
  reviewerId: null, // 实际应用中应从用户会话中获取
  status: null,
  reviewResult: 0, // 0-正常、1-整改、2-永久封禁
  reviewReason: '' // 审核原因
});

// 审核结果选项
const reviewResultOptions = [
  { value: 0, label: '正常' },
  { value: 1, label: '整改' },
  { value: 2, label: '永久封禁' }
]

// 表单验证规则
const handleRules = reactive({
  reviewReason: [
    { required: true, message: '请输入审核原因', trigger: 'blur' }
  ]
});

const handleFormRef = ref(null);

// 打开处理对话框
const openHandleDialog = (report, status) => {
  handleForm.id = report.id;
  handleForm.blogId = report.blogId;
  handleForm.blogTitle = report.blogTitle;
  handleForm.status = status;
  handleForm.reviewResult = 0;
  handleForm.reviewReason = '';
  handleDialogVisible.value = true;
}

// 提交处理结果
const submitHandle = async () => {
  if (!handleFormRef.value) return;

  await handleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 创建提交数据对象，只包含DTO需要的字段
        const submitData = {
          id: handleForm.id,
          reviewerId: handleForm.reviewerId,
          status: handleForm.status,
          reviewResult: handleForm.reviewResult,
          reviewReason: handleForm.reviewReason
        };

        const res = await handleBlogReport(submitData);
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
  <div class="blog-report-container">
    <h2 style="margin-bottom: 20px">博客举报处理</h2>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
<!--        <el-form-item label="举报用户">-->
<!--          <el-input v-model="queryParams.username" placeholder="请输入举报用户名" clearable />-->
<!--        </el-form-item>-->
<!--        <el-form-item label="博客标题">-->
<!--          <el-input v-model="queryParams.blogTitle" placeholder="请输入博客标题" clearable />-->
<!--        </el-form-item>-->
        <el-form-item label="处理状态" style="width: 250px">
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
        <el-table-column prop="blogId" label="博客ID" show-overflow-tooltip width="100"/>
        <el-table-column prop="blogTitle" label="博客标题" show-overflow-tooltip width="300"/>
        <el-table-column prop="reportReason" label="举报原因"  show-overflow-tooltip>
<!--          <template #default="scope">-->
<!--            {{ reportReasonTypes.find(t => t.value === scope.row.reason)?.label || scope.row.reason }}-->
<!--          </template>-->
        </el-table-column>
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
            <el-button size="small" @click="showBlogDetail(scope.row.id)">查看博客</el-button>
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

    <!-- 博客详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="博客详情"
      width="70%"
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="closeDetailDialog"
    >
      <div class="blog-detail" v-if="blogDetail">
        <h3 class="detail-title">{{ blogDetail.title }}</h3>
        <div class="detail-info">
          <span>作者：{{ blogDetail.username }}</span>
          <span>创建时间：{{ blogDetail.reportTime }}</span>
<!--          <span>阅读：{{ blogDetail.viewCount || 0 }}</span>-->
        </div>
        <div class="editor-container">
          <div style="border: 1px solid #ccc; z-index: 100">
            <Toolbar
              style="border-bottom: 1px solid #ccc"
              :editor="editorRef"
              :defaultConfig="toolbarConfig"
              mode="simple"
            />
            <Editor
              v-model="editorContent"
              style="height: 400px; overflow-y: hidden;"
              :defaultConfig="editorConfig"
              mode="simple"
              @onCreated="handleCreated"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDetailDialog">关闭</el-button>
        </span>
      </template>
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
        <el-form-item label="博客标题">
          <span>{{ handleForm.blogTitle }}</span>
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
        <el-form-item label="审核原因" prop="reviewReason">
          <el-input
            v-model="handleForm.reviewReason"
            type="textarea"
            rows="4"
            placeholder="请输入审核原因"
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
.blog-report-container {
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

.blog-detail {
  padding: 0 20px;
}

.detail-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 15px;
}

.detail-info {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}

.editor-container {
  margin-top: 20px;
}
</style>