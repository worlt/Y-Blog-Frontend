<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { showLoginDialog } from '@/utils/request'
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
    showLoginDialog()
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
  
  // Only allow voting if status is Pending (0)
  if (item.status !== 0) {
      ElMessage.warning('该建议已结束投票')
      return
  }

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
    } else {
      // 400 errors are resolved with data by errorHandler, so we handle them here
      const msg = res.msg || '投票失败'
      if (msg.includes('结束投票')) {
          ElMessage.warning('该建议已结束投票')
          fetchData() // Auto refresh to update status
      } else if (msg.includes('已投票')) { // Handle 'already voted' clearly
          ElMessage.warning('您已投票，不可修改')
      } else {
          ElMessage.error(msg)
      }
    }
  } catch (error) {
    console.error(error)
    // Handle other errors (like 500, network error) that are rejected
    const msg = error.response?.data?.msg || error.message || '投票失败'
    
    // Fallback logic in case error strategy changes or other status codes used
    if (msg.includes('结束投票')) {
        ElMessage.warning('该建议已结束投票')
        fetchData() 
    } else {
        ElMessage.error(msg)
    }
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
                    disabled: (item.currentUserVoteType !== null && item.currentUserVoteType !== undefined) || item.status !== 0
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
                    disabled: (item.currentUserVoteType !== null && item.currentUserVoteType !== undefined) || item.status !== 0
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

    <!-- ... Dialog ... -->
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
                    disabled: (currentSuggestion.currentUserVoteType !== null && currentSuggestion.currentUserVoteType !== undefined) || currentSuggestion.status !== 0
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
                    disabled: (currentSuggestion.currentUserVoteType !== null && currentSuggestion.currentUserVoteType !== undefined) || currentSuggestion.status !== 0
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
  background: var(--pixel-bg-card);
  border: var(--pixel-border);
  box-shadow: var(--pixel-shadow);
  padding: 20px;
  min-height: 500px;
  color: var(--pixel-text-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: var(--pixel-border-light);
  padding-bottom: 15px;
}

.header h3 {
  margin: 0;
  font-family: var(--pixel-font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--pixel-text-primary);
  text-shadow: 2px 2px 0 #000;
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: var(--pixel-bg-secondary);
  padding: 10px 15px;
  border: var(--pixel-border-light);
}

.status-tabs, .sort-tabs {
  display: flex;
  gap: 20px;
  color: var(--pixel-text-secondary);
  font-family: var(--pixel-font-body);
}

.status-tabs span, .sort-tabs span {
  cursor: pointer;
  padding: 4px 12px;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.status-tabs span:hover, .sort-tabs span:hover,
.status-tabs span.active, .sort-tabs span.active {
  color: var(--pixel-primary-light);
  background: var(--pixel-bg-card);
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
}

.list {
  /* Remove fixed height */
}

.item {
  display: flex; /* Flex layout */
  padding: 20px;
  border: var(--pixel-border-light);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 15px;
  background: var(--pixel-bg-card);
  box-shadow: var(--pixel-shadow-sm);
}

.item:hover {
  background: var(--pixel-bg-secondary);
  box-shadow: var(--pixel-shadow);
  transform: translate(-2px, -2px);
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
  font-size: 18px;
  color: var(--pixel-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px; /* Space between title and tag */
}

.item-content {
  font-size: 16px;
  color: var(--pixel-text-secondary);
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
  font-size: 14px;
  color: var(--pixel-text-muted);
}

/* Right Actions */
.item-actions {
    flex: 1; /* 1/3 width */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    border-left: var(--pixel-border-light);
    padding-left: 20px;
    min-width: 140px; 
}

.action-btn {
    display: flex;
    justify-content: center; 
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border: var(--pixel-border-light);
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    background: var(--pixel-bg-secondary);
    position: relative;
    user-select: none;
    font-family: var(--pixel-font-body);
}

.action-btn.disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.action-btn:not(.disabled):hover {
    transform: translate(-1px, -1px);
    box-shadow: var(--pixel-shadow-sm);
    border-color: var(--pixel-primary-light);
}

.want-btn {
    border-color: var(--pixel-blue);
    color: var(--pixel-blue);
}

.want-btn:not(.disabled):hover {
    border-color: var(--pixel-blue);
    background-color: var(--pixel-bg-card);
}

.want-btn.active {
    background-color: var(--pixel-blue);
    border-color: #000;
    color: #000;
    box-shadow: var(--pixel-shadow-sm);
}

.not-want-btn {
    border-color: var(--pixel-accent);
    color: var(--pixel-accent);
}

.not-want-btn:not(.disabled):hover {
    border-color: var(--pixel-accent);
    background-color: var(--pixel-bg-card);
}

.not-want-btn.active {
    background-color: var(--pixel-accent);
    border-color: #000;
    color: #000;
    box-shadow: var(--pixel-shadow-sm);
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
    font-size: 22px;
    font-family: var(--pixel-font-display);
    font-weight: 700;
    color: var(--pixel-text-primary);
    display: flex;
    align-items: flex-start; /* Align top for multi-line */
    justify-content: space-between; 
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: var(--pixel-border-light);
}

.detail-content h3 .title-text {
    flex: 1;
    word-break: break-all;
    line-height: 1.4;
    text-shadow: 2px 2px 0 #000;
}

.detail-content h3 .status-tag {
    flex-shrink: 0; /* Prevent tag from shrinking */
    margin-top: 4px; /* Align with text */
}

.meta {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: var(--pixel-text-muted);
    margin-bottom: 20px;
}

.content-body {
    font-size: 16px;
    line-height: 1.8;
    color: var(--pixel-text-primary);
    background: var(--pixel-bg-secondary); 
    border: var(--pixel-border-light);
    padding: 20px;
    border-radius: 0;
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
