<template>
  <div class="wang-editor-container">
    <div class="editor-toolbar-container" ref="toolbarDomRef"></div>
    <div class="editor-content-container" ref="editorDomRef"></div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { uploadImage } from '../api/common'

// 接收的属性
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: Number,
    default: 400
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
  })

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

// 引入编辑器相关方法
import { createEditor, createToolbar } from '@wangeditor/editor'
</script>

<style scoped>
.wang-editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.editor-toolbar-container {
  border-bottom: 1px solid #dcdfe6;
}

.editor-content-container {
  height: v-bind('`${props.height}px`');
  overflow-y: auto;
}
</style> 