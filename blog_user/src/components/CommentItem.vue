<script setup>
import { defineProps, defineEmits } from 'vue'
import { ElButton } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  currentUserId: {
    type: Number,
    default: null
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['reply', 'delete', 'showLogin', 'report'])

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 回复评论
const handleReply = () => {
  if (props.isLoggedIn) {
    emit('reply', props.comment)
  } else {
    emit('showLogin')
  }
}

// 删除评论
const handleDelete = () => {
  emit('delete', props.comment.id)
}

// 查看用户资料
const viewUserProfile = (userId) => {
  if (userId) {
    router.push(`/user/${userId}`)
  }
}
</script>

<template>
  <div class="comment-item">
    <!-- 评论内容 -->
    <div class="comment-content-wrapper">
      <div class="comment-user">
        <el-avatar 
          :size="28" 
          :src="comment.userAvatar || ''" 
          @click="viewUserProfile(comment.userId)"
          class="clickable-avatar"
        >
          <span v-if="!comment.userAvatar" class="avatar-fallback-text">{{ (comment.username || 'U').charAt(0).toUpperCase() }}</span>
        </el-avatar>
        <div class="comment-user-info">
          <div class="comment-username">
            <span 
              @click="viewUserProfile(comment.userId)" 
              class="clickable-username"
            >{{ comment.username || '匿名用户' }}</span>
            <span v-if="comment.replyToUsername" class="reply-to">
              回复 <span 
                class="replied-user"
                @click="viewUserProfile(comment.replyToUserId)"
              >{{ comment.replyToUsername }}</span>
            </span>
          </div>
          <div class="comment-time">{{ formatDate(comment.createTime) }}</div>
        </div>
      </div>
      
      <div class="comment-content">{{ comment.content }}</div>
      
      <div class="comment-footer">
        <div class="comment-actions">
          <el-button 
            :type="isLoggedIn ? 'primary' : 'default'" 
            size="small" 
            text
            @click="handleReply"
          >{{ isLoggedIn ? '回复' : '登录后回复' }}</el-button>
          <el-button 
            v-if="isLoggedIn && currentUserId === comment.userId"
            type="danger" 
            size="small" 
            text
            @click="handleDelete"
          >删除</el-button>
          <el-button 
            v-if="isLoggedIn && currentUserId !== comment.userId"
            type="warning" 
            size="small" 
            text
            @click="$emit('report', comment.id)"
          >举报</el-button>
        </div>
      </div>
    </div>

    <!-- 递归渲染子评论 -->
    <div v-if="comment.children && comment.children.length > 0" class="child-comments">
      <CommentItem
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :current-user-id="currentUserId"
        :is-logged-in="isLoggedIn"
        @reply="$emit('reply', $event)"
        @delete="$emit('delete', $event)"
        @report="$emit('report', $event)"
        @show-login="$emit('showLogin')"
      />
    </div>
  </div>
</template>

<style scoped>
.comment-item {
  margin-bottom: 8px;
}

.comment-content-wrapper {
  padding: 10px;
  background-color: var(--pixel-bg-secondary);
  border-radius: 0;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
}

.comment-user {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.comment-user-info {
  margin-left: 8px;
}

.comment-username {
  font-size: 13px;
  font-weight: 600;
  color: var(--pixel-primary-light);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.comment-time {
  font-size: 11px;
  color: var(--pixel-text-muted);
  margin-top: 1px;
}

.comment-content {
  font-size: 13px;
  color: var(--pixel-text-primary);
  line-height: 1.5;
  margin-bottom: 6px;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 2px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.reply-to {
  color: var(--pixel-text-muted);
  font-size: 11px;
  margin-left: 4px;
}

.replied-user {
  color: var(--pixel-primary-light);
  font-weight: 600;
  font-size: 11px;
  cursor: pointer;
}

.replied-user:hover {
  text-decoration: underline;
}

.child-comments {
  margin-top: 8px;
  margin-left: 25px;
  padding-left: 10px;
  border-left: 2px solid var(--pixel-bg-secondary);
}

.clickable-avatar {
  cursor: pointer;
}

.clickable-username {
  cursor: pointer;
}

.clickable-username:hover {
  text-decoration: underline;
  color: #409eff;
}
</style> 