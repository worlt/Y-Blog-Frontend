<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import thumbUpIcon from '@iconify/icons-mdi/thumb-up'
import thumbDownIcon from '@iconify/icons-mdi/thumb-down'
import plusIcon from '@iconify/icons-mdi/plus'
import { addSuggestion, getSuggestionList, voteSuggestion, getSuggestionDetail } from '@/api/suggestion'
import { useTokenStore } from '@/stores/token'

const tokenStore = useTokenStore()

// State
const loading = ref(false)
const suggestionList = ref([])
// Query Params
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  status: null, // null: all, 0: unimplemented, 1: implemented
  sort: 1 // 1: new, 2: hot
})
const total = ref(0)

// Dialogs
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const currentSuggestion = ref({})
const addForm = reactive({
  title: '',
  content: ''
})

// Authentication check
const isLoggedIn = () => {
  return tokenStore.token && tokenStore.token.trim() !== ''
}

const checkLogin = () => {
  if (!isLoggedIn()) {
    ElMessage.warning('请先登录')
    return false
  }
  return true
}

// Fetch Data
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSuggestionList(queryParams)
    if (res.code === 0) {
      suggestionList.value = res.data.records
      total.value = res.data.total
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// Actions
const handleSortChange = (sortType) => {
  queryParams.sort = sortType
  queryParams.page = 1
  fetchData()
}

const handleStatusChange = (status) => {
  queryParams.status = status
  queryParams.page = 1
  fetchData()
}

const openAddDialog = () => {
  if (!checkLogin()) return
  addForm.title = ''
  addForm.content = ''
  showAddDialog.value = true
}

const submitSuggestion = async () => {
  if (!addForm.title || !addForm.content) {
    ElMessage.warning('请填写完整')
    return
  }
  try {
    const res = await addSuggestion(addForm)
    if (res.code === 0) {
      ElMessage.success('提交成功')
      showAddDialog.value = false
      fetchData()
    }
  } catch (error) {
    console.error(error)
  }
}

const openDetail = async (id) => {
  try {
    const res = await getSuggestionDetail(id)
    if (res.code === 0) {
      currentSuggestion.value = res.data
      showDetailDialog.value = true
    }
  } catch (error) {
    console.error(error)
  }
}

const handleVote = async (item, type) => {
  if (!checkLogin()) return
  // If already voted, do not allow modification
  if (item.currentUserVoteType !== null && item.currentUserVoteType !== undefined) {
      return
  }
  
  try {
    const res = await voteSuggestion({ suggestionId: item.id, type })
    if (res.code === 0) {
      ElMessage.success('投票成功')
      // Update list or detail
      if (showDetailDialog.value && currentSuggestion.value.id === item.id) {
        openDetail(item.id) // Refresh detail
      }
      fetchData() // Refresh list
    }
  } catch (error) {
    console.error(error)
  }
}

// Helpers
const getStatusText = (status) => {
  const map = {
    0: '待处理',
    1: '已采纳',
    2: '已实现',
    3: '已拒绝'
  }
  return map[status] || '未知'
}

const getStatusType = (status) => {
  const map = {
    0: 'info',
    1: 'primary',
    2: 'success',
    3: 'danger'
  }
  return map[status] || 'info'
}

const calculatePercent = (count, otherCount) => {
  const total = count + otherCount
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

// Initial load
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="suggestion-sidebar card-container">
    <div class="header">
      <h3>建议模块</h3>
      <el-button type="primary" size="small" @click="openAddDialog">
        <Icon :icon="plusIcon" /> 提建议
      </el-button>
    </div>

    <!-- Filter & Sort -->
    <div class="filters">
      <div class="status-tabs">
        <span :class="{ active: queryParams.status === null }" @click="handleStatusChange(null)">全部</span>
        <span :class="{ active: queryParams.status === 0 }" @click="handleStatusChange(0)">待处理</span>
        <span :class="{ active: queryParams.status === 1 }" @click="handleStatusChange(1)">已采纳</span>
        <span :class="{ active: queryParams.status === 2 }" @click="handleStatusChange(2)">已实现</span>
      </div>
      <div class="sort-tabs">
        <span :class="{ active: queryParams.sort === 1 }" @click="handleSortChange(1)">最新</span>
        <span :class="{ active: queryParams.sort === 2 }" @click="handleSortChange(2)">最热</span>
      </div>
    </div>

    <!-- List -->
    <div class="list" v-loading="loading">
      <div v-if="suggestionList.length === 0" class="empty">暂无建议</div>
      <div 
        v-for="item in suggestionList" 
        :key="item.id" 
        class="item"
        @click="openDetail(item.id)"
      >
        <!-- Left Content (2/3) -->
        <div class="item-main">
            <div class="item-header">
                <span class="title">{{ item.title }}</span>
                <el-tag size="small" :type="getStatusType(item.status)">
                    {{ getStatusText(item.status) }}
                </el-tag>
            </div>
            <div class="item-content">{{ item.content }}</div>
            <div class="item-footer">
                <span class="time">{{ new Date(item.createTime).toLocaleDateString() }}</span>
            </div>
        </div>

        <!-- Right Actions (1/3) -->
        <div class="item-actions">
            <div 
                class="action-btn want-btn" 
                :class="{ 
                    active: item.currentUserVoteType === 1,
                    disabled: item.currentUserVoteType !== null && item.currentUserVoteType !== undefined
                }"
                @click.stop="handleVote(item, 1)"
            >
                <div class="btn-text">想要</div>
                <div class="btn-percent" v-if="item.currentUserVoteType !== null">
                    {{ calculatePercent(item.wantCount, item.notWantCount) }}%
                </div>
            </div>
            <div 
                class="action-btn not-want-btn" 
                :class="{ 
                    active: item.currentUserVoteType === 0,
                    disabled: item.currentUserVoteType !== null && item.currentUserVoteType !== undefined
                }"
                @click.stop="handleVote(item, 0)"
            >
                <div class="btn-text">不想要</div>
                <div class="btn-percent" v-if="item.currentUserVoteType !== null">
                    {{ calculatePercent(item.notWantCount, item.wantCount) }}%
                </div>
            </div>
        </div>
      </div>
    </div>

    <!-- Add Dialog -->
    <el-dialog v-model="showAddDialog" title="提出建议" width="500px">
      <el-form>
        <el-form-item label="标题">
          <el-input v-model="addForm.title" placeholder="简短描述您的建议" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input 
            v-model="addForm.content" 
            type="textarea" 
            :rows="4" 
            placeholder="详细说明建议内容..." 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="submitSuggestion">提交</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog v-model="showDetailDialog" title="建议详情" width="600px">
      <div class="detail-content" v-if="currentSuggestion.id">
        <h3>
            <span class="title-text">{{ currentSuggestion.title }}</span>
            <el-tag :type="getStatusType(currentSuggestion.status)" class="status-tag">
                {{ getStatusText(currentSuggestion.status) }}
            </el-tag>
        </h3>
        <div class="meta">
          <span>{{ new Date(currentSuggestion.createTime).toLocaleString() }}</span>
          <span v-if="currentSuggestion.username">By: {{ currentSuggestion.username }}</span>
        </div>
        <div class="content-body">
          {{ currentSuggestion.content }}
        </div>
        <!-- Detail Actions keeps original style or update? Keeping simple for now -->
        <div class="actions">
            <div 
                class="action-btn want-btn" 
                :class="{ 
                    active: currentSuggestion.currentUserVoteType === 1,
                    disabled: currentSuggestion.currentUserVoteType !== null && currentSuggestion.currentUserVoteType !== undefined
                }"
                @click="handleVote(currentSuggestion, 1)"
                style="min-width: 140px;"
            >
                <div class="btn-text">想要</div>
                <div class="btn-percent" v-if="currentSuggestion.currentUserVoteType !== null">
                    {{ calculatePercent(currentSuggestion.wantCount, currentSuggestion.notWantCount) }}%
                </div>
            </div>
            <div 
                class="action-btn not-want-btn" 
                :class="{ 
                    active: currentSuggestion.currentUserVoteType === 0,
                    disabled: currentSuggestion.currentUserVoteType !== null && currentSuggestion.currentUserVoteType !== undefined
                }"
                @click="handleVote(currentSuggestion, 0)"
                style="min-width: 140px;"
            >
                <div class="btn-text">不想要</div>
                <div class="btn-percent" v-if="currentSuggestion.currentUserVoteType !== null">
                   {{ calculatePercent(currentSuggestion.notWantCount, currentSuggestion.wantCount) }}%
                </div>
            </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>



<style scoped>
.card-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-height: 500px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #f9f9f9;
  padding: 10px 15px;
  border-radius: 6px;
}

.status-tabs, .sort-tabs {
  display: flex;
  gap: 20px;
  color: #666;
}

.status-tabs span, .sort-tabs span {
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  transition: all 0.3s;
}

.status-tabs span:hover, .sort-tabs span:hover,
.status-tabs span.active, .sort-tabs span.active {
  color: #409eff;
  background: white;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.list {
  /* Remove fixed height */
}

.item {
  display: flex; /* Flex layout */
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 8px;
  margin-bottom: 15px;
  background: #fff;
  border: 1px solid #e4e7ed;
}

.item:hover {
  background: #fcfcfc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #dcdfe6;
}

/* Details ... */

/* Left Content */
.item-main {
    flex: 3; /* 3/4 width */
    padding-right: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0; /* Critical for text overflow in flex */
}

.item-main .item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px; /* Slightly reduced */
}

.title {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px; /* Space between title and tag */
}

.item-content {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
  /* Multi-line ellipsis */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; /* Changed to 2 lines as requested */
  line-clamp: 2;
  overflow: hidden;
  word-break: break-all; /* More aggressive breaking for long strings */
}

.item-footer {
  font-size: 12px;
  color: #909399;
}

/* Right Actions */
.item-actions {
    flex: 1; /* 1/3 width */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    border-left: 1px solid #f0f0f0;
    padding-left: 20px;
    min-width: 130px; 
}

.action-btn {
    display: flex;
    justify-content: center; 
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 8px; /* Slightly rounder */
    border: 1px solid #dcdfe6;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    font-weight: 500;
    background: #fff;
    position: relative;
    user-select: none;
}

.action-btn.disabled {
    cursor: default;
}

.action-btn:not(.disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.want-btn {
    border-color: #a0cfff;
    color: #409eff;
}

.want-btn:not(.disabled):hover {
    border-color: #409eff;
    background-color: #ecf5ff;
}

.want-btn.active {
    background-color: #409eff;
    border-color: #409eff;
    color: white;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.not-want-btn {
    border-color: #fab6b6;
    color: #f56c6c;
}

.not-want-btn:not(.disabled):hover {
    border-color: #f56c6c;
    background-color: #fef0f0;
}

.not-want-btn.active {
    background-color: #f56c6c;
    border-color: #f56c6c;
    color: white;
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

.btn-text {
    font-size: 15px;
    font-weight: 600;
}

.btn-percent {
    font-size: 14px;
    font-weight: bold;
}

/* Detail styles */
.detail-content h3 {
    margin-top: 0;
    font-size: 20px;
    font-weight: 700;
    color: #303133;
    display: flex;
    align-items: flex-start; /* Align top for multi-line */
    justify-content: space-between; 
    gap: 10px;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
}

.detail-content h3 .title-text {
    flex: 1;
    word-break: break-all;
    line-height: 1.4;
}

.detail-content h3 .status-tag {
    flex-shrink: 0; /* Prevent tag from shrinking */
    margin-top: 4px; /* Align with text */
}

.meta {
    display: flex;
    gap: 20px;
    font-size: 13px;
    color: #909399;
    margin-bottom: 20px;
}

.content-body {
    font-size: 15px;
    line-height: 1.8;
    color: #606266;
    background: #fdfdfd; 
    border: 1px solid #f2f2f2;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 25px;
    white-space: pre-wrap; /* Preserve line breaks */
    word-break: break-word;
}

.actions {
    display: flex;
    gap: 30px;
    justify-content: center;
    margin-top: 20px;
}

.actions .el-button {
    padding: 12px 25px;
    height: auto;
    font-size: 15px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 5px;
}
</style>
