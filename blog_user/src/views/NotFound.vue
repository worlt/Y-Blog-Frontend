<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 根据query参数确定错误类型
const errorType = computed(() => route.query.type || 'page')

// 错误提示信息映射
const errorInfo = computed(() => {
  switch (errorType.value) {
    case 'blog':
      return {
        title: 'BLOG NOT FOUND',
        code: '404',
        message: '博客不存在或已被删除',
        hint: '该博客可能已被作者删除，或者链接地址有误'
      }
    case 'user':
      return {
        title: 'USER NOT FOUND',
        code: '404',
        message: '用户不存在',
        hint: '该用户可能不存在，或者链接地址有误'
      }
    default:
      return {
        title: 'PAGE NOT FOUND',
        code: '404',
        message: '页面不存在',
        hint: '你访问的页面好像走丢了...'
      }
  }
})

// 返回首页
const goHome = () => {
  router.push('/index')
}

// 返回上一页
const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-card">
      <!-- 像素风错误码 -->
      <div class="error-code">
        <span class="code-digit">4</span>
        <span class="code-digit ghost">0</span>
        <span class="code-digit">4</span>
      </div>

      <!-- 错误标题 -->
      <h1 class="error-title">{{ errorInfo.title }}</h1>

      <!-- 像素分割线 -->
      <div class="pixel-divider">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>

      <!-- 错误描述 -->
      <p class="error-message">{{ errorInfo.message }}</p>
      <p class="error-hint">{{ errorInfo.hint }}</p>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="pixel-btn pixel-btn-primary" @click="goHome">
          ← 返回首页
        </button>
        <button class="pixel-btn pixel-btn-secondary" @click="goBack">
          ↩ 返回上页
        </button>
      </div>

      <!-- 像素装饰 -->
      <div class="pixel-decoration">
        <div class="pixel-star star-1">✦</div>
        <div class="pixel-star star-2">✦</div>
        <div class="pixel-star star-3">✦</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.not-found-card {
  background-color: var(--pixel-bg-card);
  border: 4px solid #000;
  box-shadow: 6px 6px 0 #000;
  padding: 50px 40px;
  text-align: center;
  max-width: 560px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* 错误码 */
.error-code {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.code-digit {
  font-family: var(--pixel-font-display);
  font-size: 72px;
  color: var(--pixel-primary);
  text-shadow: 4px 4px 0 #000;
  line-height: 1;
}

.code-digit.ghost {
  animation: pixel-pulse 1.5s ease infinite;
  color: var(--pixel-accent);
}

/* 错误标题 */
.error-title {
  font-family: var(--pixel-font-display);
  font-size: 14px;
  color: var(--pixel-text-primary);
  letter-spacing: 3px;
  margin: 0 0 20px 0;
}

/* 像素分割线 */
.pixel-divider {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 20px 0;
}

.pixel-divider .dot {
  display: block;
  width: 6px;
  height: 6px;
  background: var(--pixel-primary-light);
  border: 1px solid #000;
}

/* 错误描述 */
.error-message {
  font-family: var(--pixel-font-chinese);
  font-size: 22px;
  color: var(--pixel-text-primary);
  margin: 16px 0 8px 0;
}

.error-hint {
  font-family: var(--pixel-font-body);
  font-size: 16px;
  color: var(--pixel-text-secondary);
  margin: 0 0 32px 0;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.action-buttons .pixel-btn {
  font-size: 18px;
  padding: 10px 24px;
}

/* 像素装饰星星 */
.pixel-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.pixel-star {
  position: absolute;
  font-size: 14px;
  color: var(--pixel-gold);
  animation: pixel-blink 2s step-end infinite;
}

.star-1 {
  top: 20px;
  right: 30px;
  animation-delay: 0s;
}

.star-2 {
  bottom: 30px;
  left: 25px;
  animation-delay: 0.6s;
}

.star-3 {
  top: 40px;
  left: 60px;
  animation-delay: 1.2s;
}

/* 响应式 */
@media (max-width: 768px) {
  .not-found-card {
    padding: 30px 20px;
  }

  .code-digit {
    font-size: 48px;
  }

  .error-title {
    font-size: 11px;
  }

  .error-message {
    font-size: 18px;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>
