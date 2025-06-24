<template>
  <div class="appeal-page">
    <div class="page-header">
      <h2>申诉中心</h2>
      <p>如果您认为我们的处理有误，可以在此提交申诉</p>
    </div>

    <div class="appeal-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'submit' }"
        @click="activeTab = 'submit'"
      >
        提交申诉
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'status' }"
        @click="activeTab = 'status'"
      >
        申诉状态
      </button>
    </div>

    <!-- 提交申诉 -->
    <div v-if="activeTab === 'submit'" class="appeal-form">
      <div class="form-section">
        <h3>申诉信息</h3>
        <form @submit.prevent="submitAppeal">
          <div class="form-group">
            <label>申诉类型:</label>
            <select v-model="appealForm.type" required>
              <option value="">请选择申诉类型</option>
              <option value="content_removal">内容被删除</option>
              <option value="account_ban">账号被封</option>
              <option value="comment_removal">评论被删除</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div class="form-group">
            <label>相关内容ID (可选):</label>
            <input 
              type="text" 
              v-model="appealForm.contentId"
              placeholder="如博客ID、评论ID等"
            >
          </div>

          <div class="form-group">
            <label>申诉理由:</label>
            <textarea 
              v-model="appealForm.reason"
              placeholder="请详细说明申诉原因..."
              maxlength="1000"
              rows="6"
              required
            ></textarea>
            <div class="char-count">{{ appealForm.reason.length }}/1000</div>
          </div>

          <div class="form-group">
            <label>补充说明 (可选):</label>
            <textarea 
              v-model="appealForm.supplement"
              placeholder="可提供更多相关信息..."
              maxlength="500"
              rows="4"
            ></textarea>
            <div class="char-count">{{ appealForm.supplement.length }}/500</div>
          </div>

          <div class="form-actions">
            <button type="submit" class="submit-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交申诉' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 申诉状态查询 -->
    <div v-if="activeTab === 'status'" class="appeal-status">
      <div class="status-search">
        <h3>查询申诉状态</h3>
        <div class="search-form">
          <input 
            type="text" 
            v-model="appealId"
            placeholder="请输入申诉ID"
          >
          <button @click="queryAppealStatus" :disabled="!appealId">查询</button>
        </div>
      </div>

      <div v-if="appealInfo" class="appeal-info">
        <h4>申诉详情</h4>
        <div class="info-card">
          <div class="info-row">
            <label>申诉ID:</label>
            <span>{{ appealInfo.id }}</span>
          </div>
          <div class="info-row">
            <label>申诉类型:</label>
            <span>{{ getAppealTypeText(appealInfo.type) }}</span>
          </div>
          <div class="info-row">
            <label>申诉时间:</label>
            <span>{{ formatDate(appealInfo.createTime) }}</span>
          </div>
          <div class="info-row">
            <label>处理状态:</label>
            <span class="status" :class="appealInfo.status">{{ getStatusText(appealInfo.status) }}</span>
          </div>
          <div class="info-row">
            <label>申诉理由:</label>
            <div class="reason-text">{{ appealInfo.reason }}</div>
          </div>
          <div v-if="appealInfo.reply" class="info-row">
            <label>处理回复:</label>
            <div class="reply-text">{{ appealInfo.reply }}</div>
          </div>
          <div v-if="appealInfo.handleTime" class="info-row">
            <label>处理时间:</label>
            <span>{{ formatDate(appealInfo.handleTime) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { appealSubmit, getAppealById } from '@/api/appeal.js'
import { ElMessage } from 'element-plus'

export default {
  name: 'Appeal',
  setup() {
    const activeTab = ref('submit')
    const submitting = ref(false)
    const appealId = ref('')
    const appealInfo = ref(null)

    const appealForm = reactive({
      type: '',
      contentId: '',
      reason: '',
      supplement: ''
    })

    const submitAppeal = async () => {
      if (!appealForm.type || !appealForm.reason.trim()) {
        ElMessage.warning('请填写必要的申诉信息')
        return
      }

      submitting.value = true
      try {
        const data = {
          type: appealForm.type,
          contentId: appealForm.contentId || null,
          reason: appealForm.reason.trim(),
          supplement: appealForm.supplement.trim() || null
        }

        await appealSubmit(data)
        ElMessage.success('申诉已提交，我们会在3个工作日内处理')
        
        // 重置表单
        appealForm.type = ''
        appealForm.contentId = ''
        appealForm.reason = ''
        appealForm.supplement = ''
        
        // 切换到状态查询页
        activeTab.value = 'status'
      } catch (error) {
        console.error('提交申诉失败:', error)
        ElMessage.error('提交申诉失败，请稍后重试')
      } finally {
        submitting.value = false
      }
    }

    const queryAppealStatus = async () => {
      if (!appealId.value.trim()) {
        ElMessage.warning('请输入申诉ID')
        return
      }

      try {
        const response = await getAppealById(appealId.value)
        appealInfo.value = response.data
      } catch (error) {
        console.error('查询申诉状态失败:', error)
        ElMessage.error('查询失败，请检查申诉ID是否正确')
        appealInfo.value = null
      }
    }

    const getAppealTypeText = (type) => {
      const typeMap = {
        content_removal: '内容被删除',
        account_ban: '账号被封',
        comment_removal: '评论被删除',
        other: '其他'
      }
      return typeMap[type] || type
    }

    const getStatusText = (status) => {
      const statusMap = {
        pending: '待处理',
        processing: '处理中',
        approved: '申诉成功',
        rejected: '申诉被驳回'
      }
      return statusMap[status] || status
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleString('zh-CN')
    }

    return {
      activeTab,
      submitting,
      appealId,
      appealInfo,
      appealForm,
      submitAppeal,
      queryAppealStatus,
      getAppealTypeText,
      getStatusText,
      formatDate
    }
  }
}
</script>

<style scoped>
.appeal-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.page-header p {
  color: #666;
  font-size: 14px;
}

.appeal-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 30px;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.tab-btn:hover {
  color: #409eff;
}

.form-section h3,
.status-search h3 {
  color: #333;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-actions {
  margin-top: 30px;
}

.submit-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #66b1ff;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.search-form {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
}

.search-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-form button {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.search-form button:hover:not(:disabled) {
  background: #66b1ff;
}

.search-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.appeal-info h4 {
  color: #333;
  margin-bottom: 16px;
}

.info-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.info-row {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.info-row label {
  min-width: 100px;
  font-weight: 500;
  color: #333;
  margin-right: 12px;
}

.info-row span {
  color: #666;
}

.status.pending {
  color: #e6a23c;
}

.status.processing {
  color: #409eff;
}

.status.approved {
  color: #67c23a;
}

.status.rejected {
  color: #f56c6c;
}

.reason-text,
.reply-text {
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.reply-text {
  background: white;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
}
</style> 