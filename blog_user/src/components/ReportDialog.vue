<template>
  <div class="report-dialog-overlay" v-if="visible" @click="closeDialog">
    <div class="report-dialog" @click.stop>
      <div class="dialog-header">
        <h3>举报内容</h3>
        <button class="close-btn" @click="closeDialog">×</button>
      </div>
      
      <div class="dialog-body">
        <div class="report-type">
          <label>举报类型:</label>
          <span>{{ reportTypeText }}</span>
        </div>
        
        <div class="report-reason">
          <label>举报原因:</label>
          <select v-model="reportData.reason" required>
            <option value="">请选择举报原因</option>
            <option value="spam">垃圾信息</option>
            <option value="inappropriate">不当内容</option>
            <option value="harassment">骚扰行为</option>
            <option value="copyright">版权侵犯</option>
            <option value="fraud">欺诈行为</option>
            <option value="other">其他</option>
          </select>
        </div>
        
        <div class="report-description">
          <label>详细描述:</label>
          <textarea 
            v-model="reportData.description" 
            placeholder="请详细说明举报原因..."
            maxlength="500"
            rows="4"
          ></textarea>
          <div class="char-count">{{ reportData.description.length }}/500</div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="closeDialog">取消</button>
        <button class="submit-btn" @click="submitReport" :disabled="!canSubmit">提交举报</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { reportBlog, reportComment, reportUser } from '@/api/report.js'
import { ElMessage } from 'element-plus'

export default {
  name: 'ReportDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    reportType: {
      type: String, // 'blog', 'comment', 'user'
      required: true
    },
    targetId: {
      type: Number,
      required: true
    }
  },
  emits: ['update:visible', 'reported'],
  setup(props, { emit }) {
    const reportData = ref({
      reason: '',
      description: ''
    })

    const reportTypeText = computed(() => {
      const typeMap = {
        blog: '博客',
        comment: '评论',  
        user: '用户'
      }
      return typeMap[props.reportType] || ''
    })

    const canSubmit = computed(() => {
      return reportData.value.reason && reportData.value.description.trim()
    })

    const closeDialog = () => {
      emit('update:visible', false)
      // 重置表单数据
      reportData.value = {
        reason: '',
        description: ''
      }
    }

    const submitReport = async () => {
      if (!canSubmit.value) {
        ElMessage.warning('请填写完整的举报信息')
        return
      }

      try {
        const data = {
          reason: reportData.value.reason,
          description: reportData.value.description
        }

        // 根据类型设置不同的ID字段
        if (props.reportType === 'blog') {
          data.blogId = props.targetId
          await reportBlog(data)
        } else if (props.reportType === 'comment') {
          data.commentId = props.targetId
          await reportComment(data)
        } else if (props.reportType === 'user') {
          data.userId = props.targetId
          await reportUser(data)
        }

        ElMessage.success('举报已提交，感谢您的反馈')
        emit('reported')
        closeDialog()
      } catch (error) {
        console.error('提交举报失败:', error)
        ElMessage.error('提交举报失败，请稍后重试')
      }
    }

    // 监听visible变化，重置表单
    watch(() => props.visible, (newVal) => {
      if (newVal) {
        reportData.value = {
          reason: '',
          description: ''
        }
      }
    })

    return {
      reportData,
      reportTypeText,
      canSubmit,
      closeDialog,
      submitReport
    }
  }
}
</script>

<style scoped>
.report-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.report-dialog {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #666;
}

.dialog-body {
  padding: 20px;
}

.report-type,
.report-reason,
.report-description {
  margin-bottom: 16px;
}

.report-type label,
.report-reason label,
.report-description label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.report-type span {
  color: #666;
  font-size: 14px;
}

.report-reason select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.report-description textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.cancel-btn,
.submit-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: white;
  border-color: #ddd;
  color: #666;
}

.cancel-btn:hover {
  background: #f5f5f5;
}

.submit-btn {
  background: #ff4757;
  border-color: #ff4757;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #ff3742;
}

.submit-btn:disabled {
  background: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}
</style> 