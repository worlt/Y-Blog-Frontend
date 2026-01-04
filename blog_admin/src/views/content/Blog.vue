<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { blogPage, addBlog, updateBlog, getBlogById, deleteBlog, deleteBlogsBatch, setIsTop } from '@/api/blog.js';
import { uploadImage } from '@/api/common.js';
import { listAllCategories } from '@/api/category.js';
import { listAllTags } from '@/api/tag.js';
import { Delete, Upload, Plus } from '@element-plus/icons-vue';
import WangEditor from '@/components/WangEditor.vue';

// 分页数据
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  title: '',
  status: '',
  username: ''
});

// 分类和标签数据
const categoryOptions = ref([]);
const tagOptions = ref([]);

// 自定义标签输入相关
const customTagInputVisible = ref(false);
const customTagInputValue = ref('');
const customTagInputRef = ref(null);

// 编辑器引用
const contentEditor = ref(null);

// 批量选择
const selectedIds = ref([]);

// 获取博客列表
const getList = async () => {
  loading.value = true;
  try {
    const res = await blogPage(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
      console.log('博客列表数据:', tableData.value);
    } else {
      ElMessage.error(res.msg || '获取博客列表失败');
    }
  } catch (error) {
    console.error('获取博客列表出错：', error);
    ElMessage.error('获取博客列表失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 获取所有分类
const fetchCategories = async () => {
  try {
    const res = await listAllCategories();
    if (res.code === 0) {
      categoryOptions.value = res.data.map(item => ({
        value: item.id,
        label: item.name
      }));
    } else {
      ElMessage.warning('获取分类列表失败');
    }
  } catch (error) {
    console.error('获取分类列表出错：', error);
  }
};

// 获取所有标签
const fetchTags = async () => {
  try {
    const res = await listAllTags();
    if (res.code === 0) {
      tagOptions.value = res.data.map(item => ({
        value: item.id,
        label: item.name
      }));
    } else {
      ElMessage.warning('获取标签列表失败');
    }
  } catch (error) {
    console.error('获取标签列表出错：', error);
  }
};

// 处理自定义标签输入
const handleCustomTagInput = (value) => {
  if (!value) return;
  
  // 将输入的文本按逗号分隔，并过滤掉空字符串
  const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
  formData.customTagList = tags;
};

// 重置查询条件
const resetQuery = () => {
  queryParams.title = '';
  queryParams.status = '';
  queryParams.username = '';
  queryParams.page = 1;
  getList();
};

// 处理页码变化
const handleCurrentChange = (val) => {
  queryParams.page = val;
  getList();
};

// 处理每页条数变化
const handleSizeChange = (val) => {
  queryParams.pageSize = val;
  queryParams.page = 1;
  getList();
};

// 对话框相关
const dialogVisible = ref(false);
const dialogTitle = ref('新增博客');
const dialogLoading = ref(false);

// 博客表单
const formRef = ref(null);
const formData = reactive({
  id: null,
  title: '',
  content: '',
  cover: '',
  summary: '',
  categoryId: '',
  tagIdList: [], // 系统标签ID列表
  customTagList: [], // 自定义标签列表
  status: 5, // 默认为草稿状态
  statusMessage: '', // 状态变更原因
  isTop: 0 // 默认不置顶
});

// 保存编辑时的原始状态，用于检测状态变更
const originalStatus = ref(null);

// 需要填写原因的状态列表
const statusNeedReason = [2, 3, 4]; // 已拒绝、整改中、已封禁

// 状态变更原因对话框
const reasonDialogVisible = ref(false);
const reasonFormRef = ref(null);
const reasonForm = reactive({
  statusMessage: ''
});
const reasonRules = {
  statusMessage: [
    { required: true, message: '请输入状态变更原因', trigger: 'blur' }
  ]
};

// 临时保存提交数据，用于原因对话框确认后提交
let pendingSubmitData = null;

// 表单校验规则
const formRules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在1-100个字符之间', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入文章内容', trigger: 'blur' }
  ],
  // summary: [
  //   { max: 200, message: '摘要最多200个字符', trigger: 'blur' }
  // ],
  categoryId: [
    { required: true, message: '请选择文章分类', trigger: 'change' }
  ]
};

// 状态选项
const statusOptions = [
  { value: 0, label: '待审核' },
  { value: 1, label: '已通过' },
  { value: 2, label: '已拒绝' },
  { value: 3, label: '整改中' },
  { value: 4, label: '已封禁' },
  { value: 5, label: '草稿' }
];

// 重置表单
const resetForm = () => {
  formData.id = null;
  formData.title = '';
  formData.content = '';
  formData.cover = '';
  formData.summary = '';
  formData.categoryId = '';
  formData.tagIdList = [];
  formData.customTagList = [];
  formData.status = 5; // 默认为草稿状态
  formData.statusMessage = '';
  formData.isTop = 0;
  originalStatus.value = null;
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 打开新增对话框
const handleAdd = () => {
  resetForm();
  dialogTitle.value = '新增博客';
  dialogVisible.value = true;
};

// 打开编辑对话框
const handleEdit = async (row) => {
  resetForm();
  dialogTitle.value = '编辑博客';
  dialogLoading.value = true;
  
  try {
    const res = await getBlogById(row.id);
    if (res.code === 0 && res.data) {
      // 将后端返回的数据填充到表单中
      const blogData = res.data;
      formData.id = blogData.id;
      formData.title = blogData.title;
      formData.content = blogData.content;
      formData.cover = blogData.cover;
      formData.summary = blogData.summary || '';
      formData.categoryId = blogData.categoryId;
      formData.status = blogData.status;
      formData.isTop = blogData.isTop;
      
      // 保存原始状态，用于检测状态变更
      originalStatus.value = blogData.status;
      
      // 处理标签数据
      if (blogData.tagList && blogData.tagList.length > 0) {
        // 查找标签ID
        const tagIds = [];
        blogData.tagList.forEach(tagName => {
          const tag = tagOptions.value.find(t => t.label === tagName);
          if (tag) {
            tagIds.push(tag.value);
          }
        });
        formData.tagIdList = tagIds;
      }
      
      // 处理自定义标签
      if (blogData.customTagList && blogData.customTagList.length > 0) {
        formData.customTagList = blogData.customTagList;
      }
      
      dialogVisible.value = true;
    } else {
      ElMessage.error(res.msg || '获取博客详情失败');
    }
  } catch (error) {
    console.error('获取博客详情出错：', error);
    ElMessage.error('获取博客详情失败，请稍后重试');
  } finally {
    dialogLoading.value = false;
  }
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      // 确保从编辑器获取最新内容
      if (contentEditor.value) {
        formData.content = contentEditor.value.getContent();
      }

      // 准备提交数据
      const submitData = {
        ...formData,
        // 确保isTop是数字类型
        isTop: Number(formData.isTop)
      };
      
      // 处理自定义标签数据
      if (typeof formData.customTagList === 'string') {
        submitData.customTagList = formData.customTagList
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag);
      } else if (Array.isArray(formData.customTagList)) {
        submitData.customTagList = formData.customTagList
          .map(tag => tag.trim())
          .filter(tag => tag);
      } else {
        submitData.customTagList = [];
      }
      
      // 检测是否需要填写状态变更原因（编辑时状态变为拒绝、整改、封禁）
      if (submitData.id && 
          originalStatus.value !== submitData.status && 
          statusNeedReason.includes(submitData.status)) {
        // 需要填写原因，打开原因对话框
        pendingSubmitData = submitData;
        reasonForm.statusMessage = '';
        reasonDialogVisible.value = true;
        return;
      }
      
      // 直接提交
      await doSubmit(submitData);
    }
  });
};

// 状态变更原因确认提交
const confirmReasonSubmit = async () => {
  if (!reasonFormRef.value) return;
  
  await reasonFormRef.value.validate(async (valid) => {
    if (valid && pendingSubmitData) {
      pendingSubmitData.statusMessage = reasonForm.statusMessage;
      reasonDialogVisible.value = false;
      await doSubmit(pendingSubmitData);
      pendingSubmitData = null;
    }
  });
};

// 执行提交操作
const doSubmit = async (submitData) => {
  dialogLoading.value = true;
  try {
    let res;
    if (submitData.id) {
      res = await updateBlog(submitData);
    } else {
      res = await addBlog(submitData);
    }
    
    if (res.code === 0) {
      ElMessage.success(`${submitData.id ? '更新' : '新增'}博客成功`);
      dialogVisible.value = false;
      getList();
    } else {
      ElMessage.error(res.msg || `${submitData.id ? '更新' : '新增'}博客失败`);
    }
  } catch (error) {
    console.error(`${submitData.id ? '更新' : '新增'}博客出错：`, error);
    ElMessage.error(`${submitData.id ? '更新' : '新增'}博客失败，请稍后重试`);
  } finally {
    dialogLoading.value = false;
  }
};

// 删除博客
// 处理表格选择变化
const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item.id);
};

// 批量删除
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请至少选择一项进行删除');
    return;
  }
  
  ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 篇博客吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteBlogsBatch(selectedIds.value);
      if (res.code === 0) {
        ElMessage.success('批量删除成功');
        getList();
        selectedIds.value = []; // 清空选项
      } else {
        ElMessage.error(res.msg || '批量删除失败');
      }
    } catch (error) {
      console.error('批量删除博客出错：', error);
      ElMessage.error('批量删除失败，请稍后重试');
    }
  }).catch(() => {});
};

// 删除博客
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除博客 "${row.title}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteBlog(row.id);
      if (res.code === 0) {
        ElMessage.success('删除博客成功');
        getList();
      } else {
        ElMessage.error(res.msg || '删除博客失败');
      }
    } catch (error) {
      console.error('删除博客出错：', error);
      ElMessage.error('删除博客失败，请稍后重试');
    }
  }).catch(() => {});
};

// 上传封面图
const uploadCover = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 校验文件类型
  if (!file.type.includes('image')) {
    ElMessage.warning('请选择图片文件');
    return;
  }
  
  // 校验文件大小，限制为2MB
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过2MB');
    return;
  }
  
  // 显示加载中状态
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '封面上传中...',
    background: 'rgba(0, 0, 0, 0.7)'
  });
  
  try {
    const response = await uploadImage(file);
    
    if (response.code === 0 && response.data) {
      ElMessage.success('封面上传成功');
      formData.cover = response.data; // 使用返回的图片URL更新cover字段
      console.log('封面上传成功，URL:', formData.cover); // 添加日志
    } else {
      ElMessage.error(response.msg || '封面上传失败');
    }
  } catch (error) {
    console.error('封面上传出错：', error);
    ElMessage.error('封面上传失败，请稍后重试');
  } finally {
    // 关闭加载提示
    loadingInstance.close();
    // 清空文件输入框，以便重复上传同一文件
    event.target.value = '';
  }
};

// 格式化发布状态
const formatStatus = (row) => {
  const statusMap = {
    0: '待审核',
    1: '已通过',
    2: '已拒绝',
    3: '整改中',
    4: '已封禁',
    5: '草稿'
  };
  return statusMap[row.status] || '未知';
};

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    0: 'warning',  // 待审核：黄色警告
    1: 'success',  // 已通过：绿色成功
    2: 'danger',   // 已拒绝：红色危险
    3: 'info',     // 整改中：蓝色信息
    4: 'danger',   // 已封禁：红色危险
    5: '',         // 草稿：灰色默认
  };
  return typeMap[status] || '';
};

// 格式化标签显示
const formatTags = (tags) => {
  if (!tags || tags.length === 0) return '-';
  return tags.join(', ');
};

// 处理置顶状态变化
const handleTopChange = async (row) => {
  try {
    const res = await setIsTop(row.id, row.isTop);
    if (res.code === 0) {
      ElMessage.success(`博客${row.isTop === 1 ? '已置顶' : '已取消置顶'}`);
    } else {
      // 恢复原来的状态
      row.isTop = row.isTop === 1 ? 0 : 1;
      ElMessage.error(res.msg || '操作失败');
    }
  } catch (error) {
    // 恢复原来的状态
    row.isTop = row.isTop === 1 ? 0 : 1;
    console.error('更新置顶状态出错：', error);
    ElMessage.error('操作失败，请稍后重试');
  }
};

// 检查是否可以更改置顶状态
const canChangeTop = (row) => {
  // 只有已通过的博客才能设置置顶
  return row.status === 1;
};

// 显示自定义标签输入框
const showCustomTagInput = () => {
  customTagInputVisible.value = true;
  nextTick(() => {
    customTagInputRef.value.focus();
  });
};

// 处理自定义标签确认添加
const handleCustomTagConfirm = () => {
  const inputValue = customTagInputValue.value.trim();
  if (inputValue) {
    // 确保customTagList是一个数组
    if (!Array.isArray(formData.customTagList)) {
      formData.customTagList = [];
    }
    // 添加标签
    formData.customTagList.push(inputValue);
  }
  customTagInputVisible.value = false;
  customTagInputValue.value = '';
};

// 删除自定义标签
const handleCustomTagClose = (index) => {
  formData.customTagList.splice(index, 1);
};

// 初始化
onMounted(() => {
  getList();
  fetchCategories();
  fetchTags();
});
</script>

<template>
  <div class="blog-container">
    <div class="page-header">
      <h2>博客管理</h2>
      <div class="actions">
        <el-button type="primary" @click="handleAdd">新增博客</el-button>
        <el-button type="danger" @click="handleBatchDelete" :disabled="selectedIds.length === 0">批量删除</el-button>
      </div>
    </div>

    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :model="queryParams" :inline="true" ref="queryFormRef">
        <el-form-item label="标题">
          <el-input v-model="queryParams.title" placeholder="请输入博客标题" clearable />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="queryParams.username" placeholder="请输入作者" clearable />
        </el-form-item>
        <el-form-item label="状态" style="width: 160px">
          <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table 
        :data="tableData" 
        style="width: 100%" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
        :header-cell-style="{ textAlign: 'center' }"
        :cell-style="{ textAlign: 'center' }"
        class="full-width-table"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="100" align="center" />
        <el-table-column prop="title" label="标题" width="200" :show-overflow-tooltip="true" align="center" />
        <el-table-column prop="userId" label="作者ID" width="100" align="center" />
        <el-table-column prop="username" label="作者" width="100" align="center" />
        <el-table-column prop="category" label="分类" width="80" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.category" type="info" effect="light" class="category-tag">
              {{ scope.row.category }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="150" :show-overflow-tooltip="true" align="center">
          <template #default="scope">
            <div v-if="scope.row.tagList && scope.row.tagList.length > 0" class="tag-container">
              <el-popover
                v-if="scope.row.tagList.length > 1"
                :width="200"
                trigger="hover"
                placement="top"
              >
                <template #default>
                  <div class="tag-popover">
                    <el-tag 
                      v-for="tag in scope.row.tagList" 
                      :key="tag" 
                      size="small" 
                      style="margin-right: 4px; margin-bottom: 4px;"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </template>
                <template #reference>
                  <div>
                    <el-tag size="small" style="margin-right: 4px;">
                      {{ scope.row.tagList[0] }}
                    </el-tag>
                    <el-tag size="small" type="info">+{{ scope.row.tagList.length - 1 }}</el-tag>
                  </div>
                </template>
              </el-popover>
              <template v-else>
                <el-tag 
                  v-for="tag in scope.row.tagList" 
                  :key="tag" 
                  size="small" 
                  style="margin-right: 4px; margin-bottom: 4px;"
                >
                  {{ tag }}
                </el-tag>
              </template>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="自定义标签" width="150" :show-overflow-tooltip="true" align="center">
          <template #default="scope">
            <div v-if="scope.row.customTagList && scope.row.customTagList.length > 0" class="tag-container">
              <el-popover
                v-if="scope.row.customTagList.length > 1"
                :width="200"
                trigger="hover"
                placement="top"
              >
                <template #default>
                  <div class="tag-popover">
                    <el-tag 
                      v-for="tag in scope.row.customTagList" 
                      :key="tag" 
                      size="small" 
                      type="success" 
                      style="margin-right: 4px; margin-bottom: 4px;"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </template>
                <template #reference>
                  <div>
                    <el-tag size="small" type="success" style="margin-right: 4px;">
                      {{ scope.row.customTagList[0] }}
                    </el-tag>
                    <el-tag size="small" type="info">+{{ scope.row.customTagList.length - 1 }}</el-tag>
                  </div>
                </template>
              </el-popover>
              <template v-else>
                <el-tag 
                  v-for="tag in scope.row.customTagList" 
                  :key="tag" 
                  size="small" 
                  type="success" 
                  style="margin-right: 4px; margin-bottom: 4px;"
                >
                  {{ tag }}
                </el-tag>
              </template>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ formatStatus(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="置顶" width="80" align="center">
          <template #default="scope">
            <el-switch
              v-model="scope.row.isTop"
              :active-value="1"
              :inactive-value="0"
              @change="() => handleTopChange(scope.row)"
              :disabled="!canChangeTop(scope.row)"
              active-color="#ff4949"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="200" align="center" />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="queryParams.page"
          :page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="90%"
      top="5vh"
      :close-on-click-modal="false"
      :destroy-on-close="true"
      class="blog-edit-dialog"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        v-loading="dialogLoading"
      >
        <el-row :gutter="20">
          <!-- 左侧主要内容 -->
          <el-col :span="16">
            <el-form-item label="标题" prop="title" class="form-item-title">
              <el-input v-model="formData.title" placeholder="请输入博客标题" class="title-input" />
            </el-form-item>

            <el-form-item label="内容" prop="content" class="form-item-content">
              <WangEditor 
                v-model="formData.content" 
                :height="500"
                ref="contentEditor"
              />
            </el-form-item>
          </el-col>

          <!-- 右侧侧边栏设置 -->
          <el-col :span="8">
            <el-card class="blog-settings-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <span class="header-title">博客设置</span>
                </div>
              </template>
              
              <div class="settings-section">
                <h4 class="section-title">基础信息</h4>
                
                <el-form-item label="分类" prop="categoryId">
                  <el-select v-model="formData.categoryId" placeholder="请选择分类" style="width: 100%;">
                    <el-option
                      v-for="item in categoryOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="封面">
                  <div class="cover-upload">
                    <el-image
                      v-if="formData.cover"
                      :src="formData.cover"
                      style="width: 100%; height: 120px; margin-bottom: 10px"
                      fit="cover"
                      :preview-src-list="[formData.cover]"
                    />
                    <div class="cover-actions">
                      <input
                        type="file"
                        accept="image/*"
                        style="display: none"
                        ref="fileInput"
                        @change="uploadCover"
                      />
                      <el-button type="primary" @click="$refs.fileInput.click()" size="small">
                        <el-icon><Upload /></el-icon>
                        {{ formData.cover ? '更换封面' : '上传封面' }}
                      </el-button>
                      <el-button v-if="formData.cover" @click="formData.cover = ''" size="small">
                        <el-icon><Delete /></el-icon>
                        移除封面
                      </el-button>
                    </div>
                  </div>
                </el-form-item>
              </div>
              
              <div class="settings-section">
                <h4 class="section-title">标签设置</h4>
                
                <el-form-item label="系统标签">
                  <el-select
                    v-model="formData.tagIdList"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="请选择标签"
                    style="width: 100%;"
                  >
                    <el-option
                      v-for="item in tagOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="自定义标签">
                  <div class="custom-tag-container">
                    <div class="tag-list">
                      <el-tag
                        v-for="(tag, index) in formData.customTagList"
                        :key="index"
                        closable
                        :disable-transitions="false"
                        @close="handleCustomTagClose(index)"
                        size="small"
                        class="custom-tag"
                        type="success"
                      >
                        {{ tag }}
                      </el-tag>
                    </div>
                    
                    <div class="tag-input-container">
                      <el-input
                        v-if="customTagInputVisible"
                        ref="customTagInputRef"
                        v-model="customTagInputValue"
                        class="custom-tag-input"
                        size="small"
                        @keyup.enter="handleCustomTagConfirm"
                        @blur="handleCustomTagConfirm"
                      />
                      
                      <el-button
                        v-else
                        size="small"
                        @click="showCustomTagInput"
                        type="primary"
                        plain
                      >
                        <el-icon><Plus /></el-icon> 添加标签
                      </el-button>
                    </div>
                  </div>
                  <div class="tips">添加完一个标签后按Enter或点击空白处提交</div>
                </el-form-item>
              </div>
              
              <div class="settings-section">
                <h4 class="section-title">发布设置</h4>
                
                <el-form-item label="状态" prop="status">
                  <el-radio-group v-model="formData.status">
                    <el-radio :label="0" style="width: 100px">待审核</el-radio>
                    <el-radio :label="1" style="width: 100px">已通过</el-radio>
                    <el-radio :label="2" style="width: 100px">已拒绝</el-radio>
                    <el-radio :label="3" style="width: 100px">整改中</el-radio>
                    <el-radio :label="4" style="width: 100px">已封禁</el-radio>
                    <el-radio :label="5" style="width: 100px">草稿</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="是否置顶">
                  <el-switch v-model="formData.isTop" :active-value="1" :inactive-value="0" />
                </el-form-item>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="dialogLoading">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 状态变更原因对话框 -->
    <el-dialog
      v-model="reasonDialogVisible"
      title="请填写原因"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="reasonFormRef"
        :model="reasonForm"
        :rules="reasonRules"
        label-width="100px"
      >
        <el-form-item label="变更原因" prop="statusMessage">
          <el-input
            v-model="reasonForm.statusMessage"
            type="textarea"
            :rows="4"
            placeholder="请输入状态变更的原因，将发送给博客作者"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="reasonDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmReasonSubmit">确认提交</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.blog-container {
  padding: 5px;
  height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.page-header .actions {
  display: flex;
  gap: 10px;
}

.search-card {
  margin-bottom: 10px;
}

.table-card {
  margin-bottom: 10px;
  width: 100%;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.cover-upload {
  display: flex;
  flex-direction: column;
}

.dialog-footer {
  text-align: right;
}

.custom-tag-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-input-container {
  margin-top: 8px;
}

.custom-tag {
  margin-bottom: 0;
}

.custom-tag-input {
  width: 100%;
}

.tips {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.category-tag {
  background-color: #f0f2ff;
  color: #6366f1;
  border-color: #e0e1ff;
}

.el-card {
  --el-card-padding: 10px;
}

.tag-popover {
  display: flex;
  flex-wrap: wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* 新增样式 */
.form-item-title .title-input {
  font-size: 18px;
  font-weight: 500;
}

.form-item-content {
  margin-bottom: 20px;
}

:deep(.el-dialog__body) {
  padding: 15px;
  overflow-y: auto;
}

/* 编辑对话框样式 */
.blog-edit-dialog {
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.blog-settings-card {
  margin-bottom: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.settings-section {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.settings-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.section-title {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #606266;
}

.cover-actions {
  display: flex;
  gap: 10px;
}

:deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 8px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

/* 调整表单项间距 */
:deep(.el-form-item) {
  margin-bottom: 15px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style>