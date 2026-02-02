<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import { Boot, createEditor, createToolbar } from '@wangeditor/editor';
import { uploadImage } from '@/api/common.js';

import { ElMessage } from 'element-plus';

// 引入编辑器样式
import '@wangeditor/editor/dist/css/style.css';

// props定义
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: [Number, String],
    default: 400
  },
  mode: {
    type: String,
    default: 'default'
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  toolbarConfig: {
    type: Object,
    default: () => ({})
  },
  editorConfig: {
    type: Object,
    default: () => ({})
  },
  maxLength: {
    type: Number,
    default: 100000
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showWordCount: {
    type: Boolean,
    default: false
  }
});

// 自定义事件
const emit = defineEmits(['update:modelValue', 'change', 'created', 'destroyed', 'focus', 'blur', 'maximized', 'minimized']);

// 本地状态
const editorRef = shallowRef();
const editorDomRef = ref(null);
const toolbarDomRef = ref(null);
const editorLoading = ref(true);
const html = ref(props.modelValue || '');
const isFullScreen = ref(false);
const editorContainer = ref(null);


const editorHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`;
  }
  return props.height;
});

// 图片上传处理函数
const uploadImageHandler = (file, insertFn) => {
  editorLoading.value = true;
  
  // 调用上传接口
  uploadImage(file)
    .then(res => {
      editorLoading.value = false;
      
      if (res.code === 0 && res.data) {
        // 插入图片到编辑器
        insertFn(res.data, file.name, res.data);
        ElMessage.success('图片上传成功');
      } else {
        ElMessage.error(res.msg || '图片上传失败');
      }
    })
    .catch(error => {
      editorLoading.value = false;
      console.error('图片上传出错:', error);
      ElMessage.error('图片上传失败，请稍后重试');
    });
};

// 准备工具栏配置
const defaultToolbarConfig = {
  excludeKeys: [], // 排除哪些菜单
  showTooltip: false, // 关闭默认工具提示
  toolbarKeys: [
    // 默认工具栏
    'headerSelect',
    'bold',
    'italic',
    'underline',
    'through',
    'color',
    'bgColor',
    '|',
    'fontSize',
    'fontFamily',
    'lineHeight',
    '|',
    'bulletedList',
    'numberedList',
    'todo',
    '|',
    'justifyLeft',
    'justifyRight',
    'justifyCenter',
    'justifyJustify',
    'indent',
    'delIndent',
    '|',
    'insertLink',
    // 'insertImage',  // 移除：不需要插入网络图片
    'uploadImage',     // 保留：上传本地图片
    'insertTable',
    // 'insertVideo', // 移除：不需要视频功能
    'codeBlock',
    'blockquote',
    '|',
    'undo',
    'redo'
    // 'fullScreen' // 移除：不需要全屏功能
  ]
};

// 合并工具栏配置
const finalToolbarConfig = computed(() => {
  return {
    ...defaultToolbarConfig,
    ...props.toolbarConfig
  };
});

// 准备编辑器配置
const defaultEditorConfig = {
  placeholder: props.placeholder,
  readOnly: props.readOnly || props.disabled,
  autoFocus: false,
  scroll: true,
  maxLength: props.maxLength,
  showWordLimit: props.showWordCount, // 根据属性控制字数统计显示
  MENU_CONF: {
    // 上传图片配置
    uploadImage: {
      // 自定义上传
      customUpload: uploadImageHandler
    }
  }
};

// 合并编辑器配置
const finalEditorConfig = computed(() => {
  return {
    ...defaultEditorConfig,
    ...props.editorConfig,
    readOnly: props.readOnly || props.disabled
  };
});

// 处理全屏
const toggleFullScreen = () => {
  isFullScreen.value = !isFullScreen.value;
  
  if (isFullScreen.value) {
    // 进入全屏模式
    document.body.classList.add('wang-editor-body-fullscreen');
    if (editorContainer.value) {
      editorContainer.value.classList.add('wang-editor-fullscreen');
    }
    emit('maximized');
  } else {
    // 退出全屏模式
    document.body.classList.remove('wang-editor-body-fullscreen');
    if (editorContainer.value) {
      editorContainer.value.classList.remove('wang-editor-fullscreen');
    }
    emit('minimized');
  }
};





// 初始化编辑器和工具栏
const initEditor = () => {
  try {
    // 创建编辑器实例
    const editor = createEditor({
      selector: editorDomRef.value,
      config: finalEditorConfig.value,
      html: html.value,
      mode: props.mode
    });

    // 创建工具栏实例
    const toolbar = createToolbar({
      editor,
      selector: toolbarDomRef.value,
      config: finalToolbarConfig.value,
      mode: props.mode
    });

    // 保存编辑器实例
    editorRef.value = editor;

    // 设置编辑器内容
    editor.setHtml(html.value);
    


    // 监听编辑器内容变化
    editor.on('change', () => {

    
      const newHtml = editor.getHtml();
      if (html.value !== newHtml) {
        html.value = newHtml;
        emit('update:modelValue', newHtml);
        emit('change', {
          html: newHtml,
          text: editor.getText()
        });
      }
      

    });
// ...


    // 监听编辑器焦点状态
    editor.on('focus', () => {
      emit('focus');
    });

    editor.on('blur', () => {
      emit('blur');
    });

    // 自定义全屏按钮处理
    customizeFullScreenButton();
    
    // 控制字数统计显示
    updateWordCountDisplay();

    // 触发创建完成事件
    emit('created', editor);
  } catch (error) {
    console.error('初始化编辑器失败:', error);
    ElMessage.error('初始化编辑器失败，请刷新页面重试');
  } finally {
    // 加载完成
    editorLoading.value = false;
  }
};

// 控制字数统计显示
const updateWordCountDisplay = () => {
  nextTick(() => {
    const wordCountElement = document.querySelector('.w-e-max-length-info');
    if (wordCountElement) {
      wordCountElement.style.display = props.showWordCount ? 'block' : 'none';
    }
  });
};

// 自定义全屏按钮和工具提示
const customizeFullScreenButton = () => {
  nextTick(() => {
    // 查找全屏按钮
    const fullScreenBtn = document.querySelector('.wang-editor-toolbar button[data-title="全屏"]');
    if (fullScreenBtn) {
      // 移除原有的点击事件
      const newBtn = fullScreenBtn.cloneNode(true);
      fullScreenBtn.parentNode.replaceChild(newBtn, fullScreenBtn);
      
      // 添加自定义的全屏事件
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFullScreen();
      });
    }
    
    // 清除所有已有的工具提示
    document.querySelectorAll('.wang-editor-tooltip').forEach(el => el.remove());
    
    // 为所有按钮添加工具提示
    const buttons = document.querySelectorAll('.wang-editor-toolbar button');
    buttons.forEach(button => {
      const title = button.getAttribute('data-title');
      if (title) {
        // 创建工具提示元素
        const tooltip = document.createElement('span');
        tooltip.className = 'wang-editor-tooltip';
        tooltip.textContent = title;
        button.appendChild(tooltip);
        
        // 添加触摸事件
        button.addEventListener('touchstart', function() {
          // 先隐藏所有其他提示
          document.querySelectorAll('.wang-editor-tooltip').forEach(tip => {
            tip.classList.remove('show-tooltip');
          });
          // 显示当前提示
          tooltip.classList.add('show-tooltip');
        });
        
        button.addEventListener('touchend', function() {
          tooltip.classList.remove('show-tooltip');
        });
      }
    });
  });
};

// 销毁编辑器
const destroyEditor = () => {
  if (editorRef.value) {
    editorRef.value.destroy();
    emit('destroyed');
  }
  
  // 确保退出全屏状态
  if (isFullScreen.value) {
    document.body.classList.remove('wang-editor-body-fullscreen');
    isFullScreen.value = false;
  }
};

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (html.value !== newValue) {
      html.value = newValue || '';
      if (editorRef.value) {
        editorRef.value.setHtml(html.value);
      }
    }
  }
);

// 监听只读状态变化
watch(
  () => props.readOnly || props.disabled,
  (newValue) => {
    if (editorRef.value) {
      editorRef.value.enable(!newValue);
    }
  }
);

// 监听字数统计显示属性变化
watch(
  () => props.showWordCount,
  () => {
    updateWordCountDisplay();
  }
);

// 组件挂载时初始化
onMounted(() => {
  nextTick(() => {
    initEditor();
  });
});

// 组件销毁前清理
onBeforeUnmount(() => {
  destroyEditor();

});

// 暴露方法
const getEditor = () => editorRef.value;

const getContent = () => {
  if (editorRef.value) {
    return editorRef.value.getHtml();
  }
  return html.value;
};

const getText = () => {
  if (editorRef.value) {
    return editorRef.value.getText();
  }
  return '';
};

const setContent = (content) => {
  html.value = content || '';
  if (editorRef.value) {
    editorRef.value.setHtml(html.value);
  }
};

defineExpose({
  getEditor,
  getContent,
  getText,
  setContent,
  focus: () => editorRef.value?.focus(),
  blur: () => editorRef.value?.blur(),
  destroy: destroyEditor,
  toggleFullScreen
});
</script>

<template>
  <div 
    ref="editorContainer" 
    class="wang-editor-container" 
    :class="{ 'wang-editor-fullscreen': isFullScreen }"
  >
    <div ref="toolbarDomRef" class="wang-editor-toolbar"></div>
    <div 
      ref="editorDomRef" 
      class="wang-editor-content" 
      :style="{ height: editorHeight }"
    ></div>
    <div v-if="editorLoading" class="editor-loading">
      <div class="loading-spinner"></div>
      <span>编辑器加载中...</span>
    </div>
  </div>
</template>

<style>
/* 全局样式 */
.wang-editor-body-fullscreen {
  overflow: hidden !important;
}

.wang-editor-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 9999 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  background-color: white !important;
}

/* 工具提示样式 */
.wang-editor-tooltip {
  display: none;
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10002;
  pointer-events: none;
}

.wang-editor-tooltip.show-tooltip {
  display: block;
}
</style>

<style scoped>
.wang-editor-container {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  line-height: normal;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.wang-editor-toolbar {
  border-bottom: 1px solid #e9e9e9;
  background-color: #f8f8f8;
  padding: 0;
  flex-shrink: 0;
}

.wang-editor-content {
  background-color: #fff;
  flex-grow: 1;
  overflow: auto;
  padding: 0;
}

.editor-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #1677ff;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 解决工具栏样式问题 */
:deep(.w-e-bar-item) {
  display: flex;
}

:deep(.w-e-bar-item button) {
  position: relative;
  padding: 0 8px;
  overflow: visible;
  font-size: 14px;
  color: #595959;
  border-radius: 2px;
  border: none !important;
  transition: all 0.2s;
}

:deep(.w-e-bar-item button.active) {
  background-color: #ecf5ff !important;
  color: #409eff !important;
}

:deep(.w-e-bar-item button:hover:not(.disabled)) {
  background-color: #ecf5ff !important;
  color: #409eff !important;
}

:deep(.w-e-bar-item button.disabled) {
  opacity: 0.5;
  cursor: not-allowed !important;
  background-color: transparent !important;
}

:deep(.w-e-bar-divider) {
  margin: 0 5px;
}

/* 修复内部滚动问题 */
:deep(.w-e-text-container) {
  padding: 10px 15px;
  height: 100% !important;
  overflow: visible !important;
}

:deep(.w-e-text-container [data-slate-editor]) {
  padding: 0;
  min-height: 80px;
  height: auto !important;
  overflow: visible !important;
}

:deep(.w-e-scroll) {
  overflow: visible !important;
  height: auto !important;
}

/* 字数统计样式 */
:deep(.w-e-max-length-info) {
  position: absolute;
  bottom: 5px;
  right: 10px;
  color: #999;
  font-size: 12px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 5px;
  border-radius: 3px;
}

/* 图片显示样式 */
:deep(img) {
  max-width: 100%;
}

/* 修复下拉菜单层叠问题 */
:deep(.w-e-drop-panel) {
  z-index: 10001 !important;
  position: absolute !important;
}

:deep(.w-e-drop-list) {
  z-index: 10001 !important;
  position: absolute !important;
}

:deep(.w-e-modal) {
  z-index: 10001 !important;
  position: fixed !important;
}

/* 修复工具栏图标间距 */
:deep(.w-e-toolbar) {
  display: flex;
  flex-wrap: wrap;
  padding: 0 5px;
}

/* 修复工具栏被禁用按钮的样式 */
:deep(.w-e-menu .disabled) {
  color: rgba(0, 0, 0, 0.25) !important;
}

/* 全屏模式下的特殊样式 */
.wang-editor-fullscreen .wang-editor-toolbar {
  flex-shrink: 0;
}

.wang-editor-fullscreen .wang-editor-content {
  flex-grow: 1;
  height: calc(100vh - 42px) !important;
}
</style> 