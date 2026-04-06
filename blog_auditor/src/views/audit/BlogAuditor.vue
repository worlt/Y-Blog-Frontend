<script setup>
import {reactive, ref} from "vue";
import {blogAuditPageQuery, getBlogById, handleBlogAudit, markBlogAuditAsInProcess} from "@/api/blogAudit.js";
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
  title: '',
  username: ''
})

// 获取博客列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await blogAuditPageQuery(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
      console.log("博客列表数据：", tableData.value);
    } else {
      ElMessage.error(res.msg || '获取博客列表失败');
    }
  } catch (err) {
    console.log('获取博客列表数据出错：', err);
    ElMessage.error('获取博客列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

// 重置查询条件
const resetQueryParam = () => {
  queryParams.title = '';
  queryParams.username = '';
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

// 审核状态常量
const AUDIT_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  IN_REVIEW: 3,
  PERMANENTLY_BANNED: 4,
  IN_PROCESS: 6  // 修改：处理中状态值改为6，与后端BlogStatusConstant保持一致
}

// 审核状态文本映射
const statusTextMap = {
  [AUDIT_STATUS.PENDING]: '待审核',
  [AUDIT_STATUS.APPROVED]: '已通过',
  [AUDIT_STATUS.REJECTED]: '已拒绝',
  [AUDIT_STATUS.IN_REVIEW]: '需整改',
  [AUDIT_STATUS.PERMANENTLY_BANNED]: '永久封禁',
  [AUDIT_STATUS.IN_PROCESS]: '处理中'
}

// 审核状态类型映射
const statusTypeMap = {
  [AUDIT_STATUS.PENDING]: 'info',
  [AUDIT_STATUS.APPROVED]: 'success',
  [AUDIT_STATUS.REJECTED]: 'danger',
  [AUDIT_STATUS.IN_REVIEW]: 'warning',
  [AUDIT_STATUS.PERMANENTLY_BANNED]: 'danger',
  [AUDIT_STATUS.IN_PROCESS]: 'warning'
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
      editorContent.value = res.data.content || '';
      detailDialogVisible.value = true;
    } else {
      ElMessage.error(res.msg || '获取博客详情失败');
    }
  } catch (err) {
    console.log('获取博客详情出错：', err);
    ElMessage.error('获取博客详情失败，请稍后重试');
  }
}

// 审核对话框
const auditDialogVisible = ref(false);
const auditForm = reactive({
  blogId: null,
  blogTitle: '',
  reviewerId: null,  // 实际应用中应从用户会话中获取
  status: null,
  message: ''
});

// 审核表单验证规则
const auditRules = reactive({
  message: [
    { required: false, message: '请输入审核意见', trigger: 'blur' }
  ]
});

// 根据选择的状态动态修改验证规则
const updateValidationRules = (status) => {
  if (status === AUDIT_STATUS.APPROVED) {
    auditRules.message[0].required = false;
  } else {
    auditRules.message[0].required = true;
  }
};

const auditFormRef = ref(null);
const openAuditDialog = (blog, status) => {
  auditForm.blogId = blog.id;
  auditForm.blogTitle = blog.title;
  auditForm.status = status;
  auditForm.message = '';
  updateValidationRules(status);
  auditDialogVisible.value = true;
}

// 提交审核
const submitAudit = async () => {
  if (!auditFormRef.value) return;
  
  await auditFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await handleBlogAudit(auditForm);
        if (res.code === 0) {
          ElMessage.success('审核提交成功');
          auditDialogVisible.value = false;
          getList(); // 刷新列表
        } else {
          ElMessage.error(res.msg || '审核提交失败');
        }
      } catch (err) {
        console.log('审核提交出错：', err);
        ElMessage.error('审核提交失败，请稍后重试');
      }
    } else {
      return false;
    }
  });
}

// 标记为处理中
const markAsInProcess = async (blog) => {
  try {
    const res = await markBlogAuditAsInProcess(blog.id);
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

// 检查是否可以审核
const canAudit = (blog) => {
  if (blog.status === AUDIT_STATUS.IN_PROCESS) {
    return blog.reviewerId && auditorStore.info && blog.reviewerId === auditorStore.info.id;
  }
  return false;
}

import { useAuditorInfoStore } from '@/stores/auditorInfo'

const auditorStore = useAuditorInfoStore()

// 行样式
const tableRowClassName = ({ row }) => {
  // 审核状态：6为处理中
  if (row.status === 6) {
    // 如果有审核人且不是自己，显示蒙版
    if (row.reviewerId && row.reviewerId !== auditorStore.info.id) {
      return 'processing-mask-row'
    }
  }
  return ''
}

// 初始加载数据
getList();
</script>

<template>
  <div class="blog-auditor">
    <h2>博客审核管理</h2>
    
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="博客标题">
          <el-input v-model="queryParams.title" placeholder="请输入标题关键词" clearable />
        </el-form-item>
        <el-form-item label="作者名称">
          <el-input v-model="queryParams.username" placeholder="请输入作者名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQueryParam">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 表格区域 -->
    <el-card class="table-card">
      <el-table :data="tableData" border stripe v-loading="loading" :row-class-name="tableRowClassName">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="博客标题" show-overflow-tooltip />
        <el-table-column prop="username" label="作者" width="120" />
        <el-table-column label="封面" width="100">
          <template #default="scope">
            <el-image 
              v-if="scope.row.cover"
              :src="scope.row.cover" 
              :preview-src-list="[scope.row.cover]"
              preview-teleported
              fit="cover" 
              style="width: 80px; height: 45px; border-radius: 4px; display: block;"
            />
            <div v-else style="color: #909399; font-size: 12px; line-height: 45px; text-align: center; background: #f5f7fa; border-radius: 4px;">无封面</div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusTypeMap[scope.row.status]">
              {{ statusTextMap[scope.row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="450">
          <template #default="scope">
            <el-button size="small" @click="showBlogDetail(scope.row.id)">查看</el-button>
            <el-button 
              size="small"
              v-if="scope.row.status === AUDIT_STATUS.PENDING"
              @click="markAsInProcess(scope.row)">标记处理中</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="openAuditDialog(scope.row, AUDIT_STATUS.APPROVED)"
              :disabled="!canAudit(scope.row)">通过</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="openAuditDialog(scope.row, AUDIT_STATUS.REJECTED)"
              :disabled="!canAudit(scope.row)">拒绝</el-button>
            <el-button 
              size="small" 
              type="warning" 
              @click="openAuditDialog(scope.row, AUDIT_STATUS.IN_REVIEW)"
              :disabled="!canAudit(scope.row)">整改</el-button>
            <el-button 
              size="small" 
              type="danger" 
              plain
              @click="openAuditDialog(scope.row, AUDIT_STATUS.PERMANENTLY_BANNED)"
              :disabled="!canAudit(scope.row)">永久封禁</el-button>
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
          <span>创建时间：{{ blogDetail.createTime }}</span>
          <span>状态：
            <el-tag :type="statusTypeMap[blogDetail.status]">
              {{ statusTextMap[blogDetail.status] }}
            </el-tag>
          </span>
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
    
    <!-- 审核对话框 -->
    <el-dialog
      v-model="auditDialogVisible"
      :title="statusTextMap[auditForm.status] + '审核'"
      width="500px"
      destroy-on-close
    >
      <el-form 
        :model="auditForm" 
        label-width="100px"
        ref="auditFormRef"
        :rules="auditRules"
      >
        <el-form-item label="博客标题">
          <span>{{ auditForm.blogTitle }}</span>
        </el-form-item>
        <el-form-item label="审核结果">
          <el-tag :type="statusTypeMap[auditForm.status]">
            {{ statusTextMap[auditForm.status] }}
          </el-tag>
        </el-form-item>
        <el-form-item label="审核意见" prop="message">
          <el-input
            v-model="auditForm.message"
            type="textarea"
            rows="4"
            :placeholder="auditForm.status === AUDIT_STATUS.APPROVED ? '请输入审核意见（选填）' : '请输入审核意见（必填）'"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="auditDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAudit">提交审核</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style>
.el-table .processing-mask-row .el-button {
  filter: grayscale(100%);
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}
</style>

<style scoped>
.blog-auditor {
  padding: 20px;
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