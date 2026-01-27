<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getSuggestionList, updateSuggestionStatus, deleteSuggestion } from '@/api/suggestion.js';


// Data
const tableData = ref([]);
const total = ref(0);
const loading = ref(false);
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: null, // null for all
  sort: 1 // default sort
});

const dialogVisible = ref(false);
const currentSuggestion = ref({});

// Fetch List
const getList = async () => {
  loading.value = true;
  try {
    const res = await getSuggestionList(queryParams);
    if (res.code === 0) {
      tableData.value = res.data.records || [];
      total.value = res.data.total || 0;
    } else {
      ElMessage.error(res.msg || '获取建议列表失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('获取建议列表失败');
  } finally {
    loading.value = false;
  }
};

// Handle Page Change
const handleCurrentChange = (val) => {
  queryParams.page = val;
  getList();
};

const handleSizeChange = (val) => {
  queryParams.pageSize = val;
  queryParams.page = 1;
  getList();
};

const handleView = (row) => {
    currentSuggestion.value = { ...row };
    dialogVisible.value = true;
};

const handleDelete = (row) => {
    ElMessageBox.confirm(`确定要删除建议 "${row.title}" 吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(async () => {
        try {
            const res = await deleteSuggestion(row.id);
            if (res.code === 0) {
                ElMessage.success('删除成功');
                getList();
            } else {
                ElMessage.error(res.msg || '删除失败');
            }
        } catch (error) {
            console.error(error);
            ElMessage.error('删除失败');
        }
    }).catch(() => {});
}

// Handle Status Change from Dialog
const handleStatusUpdateFromDialog = (status, statusText) => {
  ElMessageBox.confirm(`确定要将当前建议标记为 ${statusText} 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await updateSuggestionStatus(currentSuggestion.value.id, status);
      if (res.code === 0) {
        ElMessage.success('状态更新成功');
        currentSuggestion.value.status = status; // Update local state for immediate feedback
        getList(); // Refresh list background
        // dialogVisible.value = false; // Optional: close dialog or keep open
      } else {
        ElMessage.error(res.msg || '操作失败');
      }
    } catch (error) {
      console.error(error);
      ElMessage.error('操作失败');
    }
  }).catch(() => {});
};


// Format Status
const formatStatus = (status) => {
  const map = {
    0: '待处理',
    1: '已采纳',
    2: '已实现',
    3: '已拒绝'
  };
  return map[status] || '未知';
};

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'primary',
    2: 'success',
    3: 'danger'
  };
  return map[status] || 'info';
};

// Init
onMounted(() => {
  getList();
});
</script>

<template>
  <div class="suggestion-container">
    <div class="page-header">
        <h2>建议与反馈管理</h2>
    </div>

    <!-- 搜索/筛选 -->
    <el-card class="search-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable @change="getList" style="width: 120px">
            <el-option label="待处理" :value="0" />
            <el-option label="已采纳" :value="1" />
            <el-option label="已实现" :value="2" />
            <el-option label="已拒绝" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card class="table-card">
      <el-table :data="tableData" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="username" label="用户" width="120" align="center" />
        <el-table-column prop="title" label="标题" width="200" show-overflow-tooltip align="center" />
        <el-table-column prop="content" label="内容" show-overflow-tooltip align="center" />
        <el-table-column label="投票情况" width="150" align="center">
          <template #default="scope">
            <el-tag type="success" size="small">想要: {{ scope.row.wantCount }}</el-tag>
            <el-tag type="danger" size="small" style="margin-left:5px">不想要: {{ scope.row.notWantCount }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ formatStatus(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="提交时间" width="180" align="center">
            <template #default="scope">
                {{ new Date(scope.row.createTime).toLocaleString() }}
            </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="handleView(scope.row)">查看</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container" style="margin-top: 20px; text-align: right;">
        <el-pagination
          :current-page="queryParams.page"
          :page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="dialogVisible" title="建议详情" width="600px">
        <div v-if="currentSuggestion.id" class="detail-container">
            <div class="detail-item">
                <span class="label">标题：</span>
                <span class="value title">{{ currentSuggestion.title }}</span>
            </div>
             <div class="detail-item">
                <span class="label">用户：</span>
                <span class="value">{{ currentSuggestion.username }}</span>
            </div>
             <div class="detail-item">
                <span class="label">状态：</span>
                <el-tag :type="getStatusType(currentSuggestion.status)">
                    {{ formatStatus(currentSuggestion.status) }}
                </el-tag>
            </div>
            <div class="detail-item">
                <span class="label">投票：</span>
                <span class="value">
                    <span style="color: #67C23A; margin-right: 10px;">想要 {{ currentSuggestion.wantCount }}</span>
                    <span style="color: #F56C6C;">不想要 {{ currentSuggestion.notWantCount }}</span>
                </span>
            </div>
             <div class="detail-item content-box">
                <div class="label" style="margin-bottom: 5px;">内容：</div>
                <div class="content">{{ currentSuggestion.content }}</div>
            </div>

            <div class="dialog-actions" style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                 <el-button 
                    v-if="currentSuggestion.status === 0" 
                    type="primary" 
                    @click="handleStatusUpdateFromDialog(1, '已采纳')"
                >
                  采纳
                </el-button>
                <el-button 
                    v-if="currentSuggestion.status === 0" 
                    type="danger" 
                    @click="handleStatusUpdateFromDialog(3, '已拒绝')"
                >
                  拒绝
                </el-button>
                <el-button 
                    v-if="currentSuggestion.status === 1" 
                    type="success" 
                    @click="handleStatusUpdateFromDialog(2, '已实现')"
                >
                  标记已实现
                </el-button>
                 <el-button 
                    v-if="currentSuggestion.status === 3 || currentSuggestion.status === 2" 
                    type="info" 
                    @click="handleStatusUpdateFromDialog(0, '待处理')"
                >
                  重置状态
                </el-button>
            </div>
        </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.suggestion-container {
  padding: 20px;
}
.page-header {
  margin-bottom: 20px;
}
.search-card {
  margin-bottom: 20px;
}
.detail-item {
    margin-bottom: 15px;
    display: flex;
    align-items: flex-start; /* Better for multi-line */
}
.detail-item.content-box {
    display: block;
}
.label {
    font-weight: bold;
    width: 60px;
    color: #606266;
    flex-shrink: 0; /* Prevent label from shrinking */
    padding-top: 3px; /* Align with text top */
}
.value {
    color: #303133;
    word-break: break-all; /* Prevent overflow */
}
.value.title {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
}
.content {
    background: #f5f7fa;
    padding: 15px;
    border-radius: 4px;
    line-height: 1.6;
    color: #333;
    white-space: pre-wrap;
    max-height: 300px;
    overflow-y: auto;
    word-break: break-all; /* Prevent overflow code/text */
}
</style>
