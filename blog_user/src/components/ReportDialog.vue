<template>
  <Teleport to="body">
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
        
        <div class="report-description">
          <label>举报原因:</label>
          <textarea 
            v-model="reportReason" 
            placeholder="请详细说明举报原因..."
            maxlength="500"
            rows="4"
          ></textarea>
          <div class="char-count">{{ reportReason.length }}/500</div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="closeDialog">取消</button>
        <button class="submit-btn" @click="submitReport" :disabled="!canSubmit">提交举报</button>
      </div>
      </div>
    </div>
  </Teleport>
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
    const reportReason = ref('')

    const reportTypeText = computed(() => {
      const typeMap = {
        blog: '博客',
        comment: '评论',  
        user: '用户'
      }
      return typeMap[props.reportType] || ''
    })

    const canSubmit = computed(() => {
      return reportReason.value.trim().length > 0
    })

    const closeDialog = () => {
      emit('update:visible', false)
      reportReason.value = ''
    }

    const submitReport = async () => {
      if (!canSubmit.value) {
        ElMessage.warning('请填写举报原因')
        return
      }

      try {
        const data = {
          reportReason: reportReason.value
        }

        if (props.reportType === 'blog') {
          data.blogId = props.targetId
          await reportBlog(data)
        } else if (props.reportType === 'comment') {
          data.commentId = props.targetId
          await reportComment(data)
        } else if (props.reportType === 'user') {
          // 修正：用户举报需要传 reportedUserId
          data.reportedUserId = props.targetId
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

    watch(() => props.visible, (newVal) => {
      if (newVal) {
        reportReason.value = ''
      }
    })

    return {
      reportReason,
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
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.report-dialog {
  background: var(--pixel-bg-card);
  border: 2px solid #000;
  border-radius: 0;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 6px 6px 0 #000;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 2px solid #000;
  background-color: var(--pixel-primary);
}

.dialog-header h3 {
  margin: 0;
  color: #fff;
  font-family: 'Pixel', 'Zpix', 'Minecraft', sans-serif;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #fff;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--pixel-red);
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
  color: var(--pixel-text-primary);
}

.report-type span {
  color: var(--pixel-text-primary);
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
  padding: 12px;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  border-radius: 0;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  background-color: var(--pixel-bg-primary);
  color: var(--pixel-text-primary);
  font-family: inherit;
  box-sizing: border-box;
}

.report-description textarea:focus {
  border-color: var(--pixel-primary);
  outline: none;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--pixel-text-muted);
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 2px solid #000;
  background-color: var(--pixel-bg-primary);
}

.cancel-btn,
.submit-btn {
  padding: 8px 16px;
  border-radius: 0;
  border: 2px solid #000;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 2px 2px 0 #000;
  font-family: 'Pixel', 'Zpix', 'Minecraft', sans-serif;
  transition: all 0.2s;
}

.cancel-btn {
  background: var(--pixel-bg-secondary);
  color: var(--pixel-text-primary);
}

.cancel-btn:hover {
  background: var(--pixel-bg-card);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

.submit-btn {
  background: var(--pixel-red);
  color: #fff;
}

.submit-btn:hover:not(:disabled) {
  background: var(--pixel-red);
  filter: brightness(1.1);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #000;
}

.submit-btn:disabled {
  background: var(--pixel-bg-secondary);
  color: var(--pixel-text-muted);
  border-color: var(--pixel-text-muted);
  box-shadow: none;
  cursor: not-allowed;
}
</style> 