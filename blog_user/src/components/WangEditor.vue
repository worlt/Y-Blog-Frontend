<template>
  <div class="wang-editor-container">
    <div class="editor-toolbar-container" ref="toolbarDomRef"></div>
    <div class="editor-content-container" ref="editorDomRef"></div>
    
    <!-- AI 补全提示 Overlay -->
    <div 
      v-if="showCompletion && completionText" 
      class="ai-completion-overlay"
      :style="completionStyle"
    >
      {{ completionText }}
      <span class="completion-tip"> (按 Ctrl 键补全)</span>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { createEditor, createToolbar } from '@wangeditor/editor'
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
    MENU_CONF: {
      uploadImage: {
        customUpload
      }
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

  // 创建工具栏
  const toolbar = createToolbar({
    editor,
    selector: toolbarDomRef.value,
    mode: 'default',
    config: {} // 工具栏配置
  })

  // 设置编辑器高度
  editorDomRef.value.style.height = `${props.height}px`

  // 记录编辑器实例
  editorRef.value = editor
  toolbarRef.value = toolbar

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

  debounceTimer = setTimeout(() => {
    requestCompletion()
  }, COMPLETION_DELAY)
}

// 请求 AI 补全
const requestCompletion = async () => {
  if (!editorRef.value) return
  
  // 获取当前光标位置
  updateCursorPosition()
  
  try {
    isLoadingCompletion.value = true
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

// 更新光标位置用于显示 Overlay
const updateCursorPosition = () => {
  try {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      // 获取编辑器容器的位置，计算相对坐标
      const containerRect = editorDomRef.value.getBoundingClientRect()
      
      // 计算相对位置（在光标右侧或下方）
      // 这里简单处理：显示在光标后面
      completionPosition.value = {
        top: rect.top - containerRect.top + rect.height, // 显示在光标下方一行
        left: rect.left - containerRect.left
      }
      
      // 如果需要显示在行内（overlay效果），需要更精细的CSS处理
      // 现在的策略是显示在光标下方，避免遮挡输入
    }
  } catch (e) {
    console.error('获取光标位置失败', e)
  }
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
    editorContent.value = newValue
    try {
      // 使用setHtml方法设置内容
      editorRef.value.setHtml(newValue)
      console.log('编辑器内容更新成功')
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
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  position: relative; /* 为 absolute 定位的 overlay 提供参考 */
}

.editor-toolbar-container {
  border-bottom: 1px solid #dcdfe6;
}

.editor-content-container {
  height: v-bind('`${props.height}px`');
  overflow-y: auto;
}

/* AI 补全 Overlay 样式 */
.ai-completion-overlay {
  position: absolute;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  color: #606266;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  pointer-events: none; /* 允许点击穿透 */
  transition: opacity 0.2s;
  max-width: 300px;
  white-space: pre-wrap;
  word-break: break-all;
}

.completion-tip {
  color: #409eff;
  font-size: 12px;
  margin-left: 4px;
  font-weight: bold;
}

/* 调整 placeholder 位置 */
:deep(.w-e-text-placeholder) {
  top: 8px;
}
</style> 