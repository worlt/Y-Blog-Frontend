<template>
  <div class="wang-editor-container">
    <div class="editor-toolbar-container" ref="toolbarDomRef"></div>
    <div class="editor-content-container" ref="editorDomRef"></div>
    
    <div 
      v-if="showCompletion && (completionText || isLoadingCompletion)" 
      class="ai-completion-overlay"
      :style="completionStyle"
    >
      <!-- 拖拽手柄 -->
      <div class="drag-handle" @mousedown.prevent.stop="startDrag" title="按住拖动">
        <div class="drag-bar"></div>
      </div>
      
      <!-- Loading 状态 -->
      <div v-if="isLoadingCompletion" class="loading-content">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      
      <!-- 补全内容 -->
      <div v-else class="completion-content">
        {{ completionText }}
        <span class="completion-tip"> (按 Ctrl 键补全)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { createEditor, createToolbar, Boot } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { uploadImage } from '../api/common'
import { getCompletion } from '../api/aiCompletion'
import { ElMessage } from 'element-plus'

// 接收的属性
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: Number,
    default: 400
  },
  blogTitle: { // 新增：博客标题，用于AI上下文
    type: String,
    default: ''
  },
  // 新增：是否启用AI补全
  enableAiCompletion: {
    type: Boolean,
    default: true
  }
})

// 发射的事件
const emit = defineEmits(['update:modelValue', 'change'])

// DOM元素引用
const editorDomRef = ref()
const toolbarDomRef = ref()
// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef()
const toolbarRef = shallowRef()
// 内部维护的富文本内容
const editorContent = ref('')

// AI 补全相关状态
const completionText = ref('')
const showCompletion = ref(false)
const completionPosition = ref({ top: 0, left: 0 })
const isLoadingCompletion = ref(false)
let debounceTimer = null
const COMPLETION_DELAY = 1000 // 1秒延迟

// 计算 Overlay 样式
const completionStyle = computed(() => ({
  top: `${completionPosition.value.top}px`,
  left: `${completionPosition.value.left}px`
}))

// 自定义“一键分割线”菜单类
class QuickDividerMenu {
  constructor() {
    this.title = '分割线' 
    this.iconSvg = '<svg viewBox="0 0 1024 1024"><path d="M128 512h768v64H128z"></path></svg>'
    this.tag = 'button'
  }
  getValue(editor) { return '' }
  isActive(editor) { return false }
  isDisabled(editor) { return false }
  exec(editor, value) {
    // 直接插入分割线节点，不经过二次确认
    editor.insertNode({ type: 'divider', children: [{ text: '' }] })
  }
}

// 注册自定义菜单
const menuConf = {
  key: 'quick-divider',
  factory() {
    return new QuickDividerMenu()
  }
}
Boot.registerMenu(menuConf)

// 组件挂载时创建编辑器
onMounted(() => {
  // 自定义图片上传
  const customUpload = async (file, insertFn) => {
    try {
      // 调用上传接口
      const response = await uploadImage(file)
      if (response.code === 0 && response.data) {
        // 上传成功，插入图片
        insertFn(response.data, '', response.data)
        return
      }
      throw new Error(response.msg || '上传失败')
    } catch (error) {
      console.error('图片上传失败:', error)
      throw new Error('图片上传失败，请稍后重试')
    }
  }

  // 编辑器配置
  const editorConfig = {
    placeholder: '请输入内容...',
    autoFocus: true, // 自动聚焦
    MENU_CONF: {
      uploadImage: {
        customUpload
      }
    }
  }
  
  // 工具栏配置：失焦时不禁用
  const toolbarConfig = {
    // 工具栏配置
    excludeKeys: [
      'fullScreen',      
      'insertVideo',     
      'uploadVideo',     
      'insertImage',     
      'group-video',
      'divider'          // 排除原有的分割线（带弹窗）
    ],
    insertKeys: {
      index: 10,         // 插入到合适位置
      keys: ['quick-divider'] // 加入自定义的一键分割线
    }
  }

  // 创建编辑器
  const editor = createEditor({
    selector: editorDomRef.value,
    config: editorConfig,
    content: props.modelValue,
    mode: 'default', // 编辑模式
    html: props.modelValue, // 初始化内容
  })

  // 创建工具栏（使用上面定义的toolbarConfig）
  const toolbar = createToolbar({
    editor,
    selector: toolbarDomRef.value,
    mode: 'default',
    config: toolbarConfig
  })

  // 设置编辑器高度（移除固定高度，改为min-height）
  editorDomRef.value.style.minHeight = `${props.height}px`

  // 记录编辑器实例
  editorRef.value = editor
  toolbarRef.value = toolbar
  
  // 点击编辑器容器时自动聚焦（解决工具栏失焦变灰问题）
  editorDomRef.value.addEventListener('click', () => {
    if (editor && !editor.isDestroyed) {
      editor.focus()
    }
  })

  // 监听编辑器内容变化
  editor.on('change', () => {
    editorContent.value = editor.getHtml()
    emit('update:modelValue', editorContent.value)
    emit('change', editorContent.value)
    
    // 触发 AI 补全逻辑
    handleEditorChange()
  })
  
  // 监听键盘事件，处理 Ctrl 补全
  // 注意：WangEditor 内部会拦截部分按键，这里在容器上监听或通过 DOM 绑定
  if (editorDomRef.value) {
    editorDomRef.value.addEventListener('keydown', handleKeydown, true)
  }

  // 初始化内容
  if (props.modelValue) {
    editorContent.value = props.modelValue
    nextTick(() => {
      try {
        // 使用setHtml方法设置内容
        editor.setHtml(props.modelValue)
        console.log('编辑器初始内容设置成功')
      } catch (error) {
        console.error('设置初始内容失败', error)
      }
    })
  }
})

// 处理编辑器内容变化（防抖触发补全）
const handleEditorChange = () => {
  // 清除旧的补全和定时器
  hideCompletion()
  clearTimeout(debounceTimer)
  
  // 如果内容为空，不触发
  if (!editorRef.value || editorRef.value.getText().trim().length === 0) {
    return
  }

  // 如果未开启AI补全，仅清除状态后返回
  if (!props.enableAiCompletion) {
    return
  }

  debounceTimer = setTimeout(() => {
    requestCompletion()
  }, COMPLETION_DELAY)
}

// 请求 AI 补全
const requestCompletion = async () => {
  if (!editorRef.value) return
  
  // 如果未开启AI补全，直接返回
  if (!props.enableAiCompletion) return
  
  // 获取当前光标位置
  updateCursorPosition()
  
  try {
    isLoadingCompletion.value = true
    showCompletion.value = true // 显示 loading 状态的弹窗
    const text = editorRef.value.getText() // 获取纯文本更适合补全上下文
    // 也可以使用 getHtml()，但要注意标签干扰
    
    const res = await getCompletion({
      content: text,
      title: props.blogTitle
    })
    
    if (res.code === 0 && res.data && res.data.completion) {
      completionText.value = res.data.completion
      showCompletion.value = true
    }
  } catch (error) {
    console.error('AI补全请求失败', error)
  } finally {
    isLoadingCompletion.value = false
  }
}

// 拖拽相关状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const initialPosition = ref({ top: 0, left: 0 })

// 更新光标位置用于显示 Overlay（使用 Fixed 定位）
const updateCursorPosition = () => {
  try {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // 视口尺寸
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // 预估弹窗尺寸（或默认尺寸）
      const popupWidth = 300 // max-width
      const popupHeight = 100 // 预估高度
      
      // 初步位置：光标下方
      let top = rect.bottom + 5
      let left = rect.left
      
      // 纵向防遮挡：如果下方空间不足，显示在上方
      if (top + popupHeight > viewportHeight) {
        top = rect.top - popupHeight - 5
      }
      
      // 横向防遮挡：如果右侧空间不足，向左偏移
      if (left + popupWidth > viewportWidth) {
        left = viewportWidth - popupWidth - 20
      }
      
      // 确保不超出左边界
      if (left < 10) left = 10
      
      completionPosition.value = {
        top: top,
        left: left
      }
    }
  } catch (e) {
    console.error('获取光标位置失败', e)
  }
}

// 开始拖拽
const startDrag = (e) => {
  e.preventDefault() // 防止失焦
  e.stopPropagation() // 防止冒泡
  
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  initialPosition.value = { ...completionPosition.value }
  
  // 添加全局事件监听
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
}

// 拖拽中
const onDrag = (e) => {
  if (!isDragging.value) return
  
  e.preventDefault() // 防止选中文本
  
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  
  completionPosition.value = {
    top: initialPosition.value.top + dy,
    left: initialPosition.value.left + dx
  }
}

// 结束拖拽
const endDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
}

// 隐藏补全
const hideCompletion = () => {
  showCompletion.value = false
  completionText.value = ''
}

// 处理键盘事件
const handleKeydown = (e) => {
  // 如果补全正在显示
  if (showCompletion.value && completionText.value) {
    // 按下 Ctrl 键
    if (e.key === 'Control') {
      e.preventDefault() // 阻止默认行为
      applyCompletion()
    } else {
      // 按其他键，隐藏补全
      // 为了不影响正常输入，这里不阻止默认行为，只是隐藏提示
      // 稍微延迟隐藏，以免在此次按键处理前就消失导致逻辑混乱（可选）
      hideCompletion()
    }
  }
}

// 应用补全内容
const applyCompletion = () => {
  if (!editorRef.value || !completionText.value) return
  
  try {
    const editor = editorRef.value
    // 插入文本
    editor.insertText(completionText.value)
    
    // 提示成功
    ElMessage.success('已自动补全')
    
    // 隐藏提示
    hideCompletion()
  } catch (error) {
    console.error('应用补全失败', error)
  }
}

// 监听外部传入的内容变化
watch(() => props.modelValue, (newValue) => {
  // 判断编辑器实例是否存在
  if (!editorRef.value || newValue === undefined || newValue === null) return
  // 判断内容是否变化
    if (newValue !== editorContent.value) {
      // 进一步检查：如果只是 HTML 标签闭合等非实质性差异，则不强制更新
      // 这可以防止在使用颜色选择器等工具时，因为内容同步导致的 UI 状态丢失
      const div1 = document.createElement('div')
      div1.innerHTML = newValue
      const div2 = document.createElement('div')
      div2.innerHTML = editorContent.value
      
      if (div1.innerHTML === div2.innerHTML) return

      editorContent.value = newValue
      try {
        editorRef.value.setHtml(newValue)
        console.log('编辑器内容同步成功')
      } catch (error) {
        console.error('设置编辑器内容失败', error)
      }
    }
})

// 销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) {
    editor.destroy()
  }
  if (editorDomRef.value) {
    editorDomRef.value.removeEventListener('keydown', handleKeydown, true)
  }
  clearTimeout(debounceTimer)
})

// 向外部暴露获取内容的方法
const getContent = () => {
  if (editorRef.value) {
    try {
      // 从编辑器实例获取最新内容
      const currentContent = editorRef.value.getHtml()
      editorContent.value = currentContent
      return currentContent
    } catch (error) {
      console.error('获取编辑器内容失败', error)
    }
  }
  return editorContent.value
}

// 向外部暴露设置内容的方法
const setContent = (html) => {
  if (editorRef.value) {
    try {
      // 使用setHtml方法设置内容
      editorRef.value.setHtml(html)
      // 同步更新内部状态
      editorContent.value = html
      console.log('编辑器内容设置成功')
    } catch (error) {
      console.error('设置编辑器内容失败', error)
    }
  }
}

// 向外部暴露获取文本内容的方法
const getText = () => {
  if (editorRef.value) {
    try {
      return editorRef.value.getText()
    } catch (error) {
      console.error('获取编辑器文本失败', error)
      return ''
    }
  }
  return ''
}

// 向父组件暴露的方法
defineExpose({
  getContent,
  setContent,
  getText
})

</script>

<style scoped>
.wang-editor-container {
  border: 2px solid #000;
  border-radius: 0;
  overflow: visible; /* 改为visible，让内容撑开页面 */
  position: relative;
  
  /* ============================================
     WangEditor 官方主题变量覆盖 (暗色模式)
     ============================================ */
  --w-e-textarea-bg-color: var(--pixel-bg-primary);
  --w-e-textarea-color: var(--pixel-text-primary);
  --w-e-toolbar-bg-color: var(--pixel-bg-card);
  --w-e-toolbar-color: var(--pixel-text-primary);
  --w-e-toolbar-active-bg-color: var(--pixel-bg-secondary);
  --w-e-toolbar-active-color: var(--pixel-primary-light);
  --w-e-toolbar-border-color: #000;
  --w-e-menu-drop-bg-color: var(--pixel-bg-card);
  --w-e-menu-drop-border-color: #000;
  --w-e-menu-drop-shadow: 4px 4px 0 #000;
  --w-e-modal-button-bg-color: var(--pixel-primary);
  --w-e-modal-button-border-color: #000;
}

.editor-toolbar-container {
  border-bottom: 2px solid #000;
  background-color: var(--pixel-bg-card); /* 确保背景不透明 */
  position: sticky; /* 滚动时固定在顶部 */
  top: 0; /* 固定在视口顶部 */
  z-index: 100; /* 确保在内容之上 */
}

.editor-content-container {
  /* 高度自适应内容，不设固定高度 */
  min-height: v-bind('`${props.height}px`');
  overflow: visible; /* 不产生自己的滚动条 */
}

/* AI 补全 Overlay 样式 */
.ai-completion-overlay {
  position: fixed; /* 改为 fixed 定位 */
  z-index: 9999; /* 确保层级最高 */
  background-color: var(--pixel-bg-card);
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 4px 4px 0 #000;
  pointer-events: auto; /* 允许交互（拖拽、调整大小） */
  transition: opacity 0.2s;
  min-width: 200px;
  max-width: 500px;
  min-height: 40px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  
  /* 支持缩放 */
  resize: both;
  overflow: hidden;
}

.drag-handle {
  height: 12px;
  background-color: var(--pixel-bg-secondary);
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid #000;
  flex-shrink: 0;
}

.drag-bar {
  width: 30px;
  height: 4px;
  background-color: var(--pixel-primary);
  border-radius: 0;
}

.completion-content {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--pixel-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
  flex-grow: 1;
}

.completion-tip {
  color: var(--pixel-primary-light);
  font-size: 12px;
  margin-left: 4px;
  font-weight: bold;
  user-select: none;
}

/* 调整 placeholder 位置 */
:deep(.w-e-text-placeholder) {
  top: 8px;
}


.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
  flex-grow: 1;
}

.dot {
  width: 6px;
  height: 6px;
  background-color: var(--pixel-primary-light);
  border-radius: 0;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% { 
    transform: scale(0);
  }
  40% { 
    transform: scale(1);
  }
}

/* ============================================
   WangEditor 内部样式深度穿透覆盖
   ============================================ */

/* 1. 工具栏基础 */
:deep(.w-e-toolbar) {
  background-color: var(--pixel-bg-card) !important;
  color: var(--pixel-text-primary) !important;
  border-bottom: 2px solid #000 !important;
}

/* 2. 所有图标和按钮 */
:deep(.w-e-menu-icon svg) {
  fill: var(--pixel-text-primary) !important;
  pointer-events: none; /* 防止图标拦截点击，确保按钮点击逻辑（如 Toggle）生效 */
}

:deep(.w-e-bar-item button) {
  color: var(--pixel-text-primary) !important;
  cursor: pointer !important;
}

:deep(.w-e-bar-item button:hover) {
  background-color: var(--pixel-bg-secondary) !important;
}

/* 激活状态样式 */
:deep(.w-e-active) {
  background-color: var(--pixel-bg-secondary) !important;
  color: var(--pixel-primary-light) !important;
}

/* 3. 核心：浮动工具栏 (Hover Bar) - 解决选中文字后的白色长条 */
:deep(.w-e-hover-bar) {
  background-color: var(--pixel-bg-card) !important;
  border: 2px solid #000 !important;
  box-shadow: 4px 4px 0 #000 !important;
  color: var(--pixel-text-primary) !important;
}

/* 4. 核心：下拉列表和下拉容器 - 解决截图中的白色区域 */
:deep(.w-e-select-list),
:deep(.w-e-bar-item-menus-container),
:deep(.w-e-drop-panel) {
  background-color: var(--pixel-bg-card) !important;
  border: 2px solid #000 !important;
  box-shadow: 4px 4px 0 #000 !important;
  color: var(--pixel-text-primary) !important;
}

/* 下拉项 Hover */
:deep(.w-e-select-list ul li:hover),
:deep(.w-e-panel-content-color ul li:hover) {
  background-color: var(--pixel-primary) !important;
  color: #fff !important;
}

/* 5. 编辑区域 */
:deep(.w-e-text-container) {
  background-color: var(--pixel-bg-primary) !important;
  color: var(--pixel-text-primary) !important;
}

:deep(.w-e-text-container [data-slate-editor]) {
  color: var(--pixel-text-primary); /* 移除 !important，允许内联样式（如字体颜色）生效 */
  background-color: transparent !important;
}

/* 6. 模态框与输入框 */
:deep(.w-e-modal) {
  background-color: var(--pixel-bg-card) !important;
  border: 4px solid #000 !important;
  box-shadow: 8px 8px 0 #000 !important;
  color: var(--pixel-text-primary) !important;
}

:deep(.w-e-modal input) {
  background-color: var(--pixel-bg-secondary) !important;
  border: 2px solid #000 !important;
  color: var(--pixel-text-primary) !important;
  border-radius: 0 !important;
}

/* 7. 针对图片和表格的特定修复 */
:deep(.w-e-panel-content-table),
:deep(.w-e-panel-content-image) {
  background-color: var(--pixel-bg-card) !important;
  color: var(--pixel-text-primary) !important;
}

/* 8. 修复代码块背景色 */
:deep(.w-e-text-container pre) {
  background-color: var(--pixel-bg-secondary) !important;
  border: 2px solid #000 !important;
  padding: 12px !important;
  color: var(--pixel-text-primary) !important;
  border-radius: 0 !important;
  margin: 10px 0 !important;
}

:deep(.w-e-text-container code) {
  background-color: transparent !important;
  color: inherit !important;
  font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace !important;
}


</style>

 