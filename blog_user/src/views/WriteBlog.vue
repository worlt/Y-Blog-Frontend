<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Picture } from '@element-plus/icons-vue'
import WangEditor from '@/components/WangEditor.vue'
import * as blogApi from '@/api/blog.js'
import * as commonApi from '@/api/common.js'
import * as categoryApi from '@/api/category.js'
import * as tagApi from '@/api/tag.js'

const route = useRoute()
const router = useRouter()
const blogId = route.params.id

// 是否是编辑模式
const isEdit = computed(() => !!blogId)

// 博客表单
const blogForm = reactive({
  title: '',
  content: '',
  summary: '',
  tagIdList: [], // 系统标签ID列表
  customTagList: [], // 自定义标签列表
  categoryId: '',
  cover: '',
  status: 0 // 0: 待审核, 5: 草稿
})

// 编辑器对象
const editorRef = ref(null)

// 系统标签输入
const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)

// 自定义标签输入
const customTagInputVisible = ref(false)
const customTagInputValue = ref('')
const customTagInputRef = ref(null)

// 分类和标签列表
const categoryOptions = ref([])
const tagOptions = ref([])

// 状态选项
const statusOptions = [
  { label: '发布', value: 0 },
  { label: '草稿', value: 5 }
]

// 保存状态
const saving = ref(false)
const formRef = ref(null)

// 自动保存定时器
let autoSaveTimer = null

// 上传封面图的对话框可见性
const coverUploadVisible = ref(false)
const coverFile = ref(null)
const uploading = ref(false)

// 表单校验规则
const rules = {
  title: [
    { required: true, message: '请输入博客标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在2到100个字符之间', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入博客内容', trigger: 'change' }
  ],
  categoryId: [
    { required: true, message: '请选择博客分类', trigger: 'change' }
  ]
}

onMounted(async () => {
  // 加载分类和标签
  await Promise.all([
    loadCategories(),
    loadTags()
  ])
  
  // 如果是编辑模式，加载博客内容
  if (isEdit.value) {
    await loadBlogDetail()
  }
  
  // 设置自动保存
  setupAutoSave()
  
  // 添加离开页面前的提示
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  // 清除自动保存定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }
  
  // 移除事件监听
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// 加载分类列表
const loadCategories = async () => {
  try {
    const result = await categoryApi.getAllCategories()
    if (result.code === 0) {
      categoryOptions.value = result.data.map(item => ({
        value: item.id,
        label: item.name
      }))
    } else {
      ElMessage.warning('获取分类列表失败')
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
    ElMessage.warning('获取分类列表失败')
  }
}

// 加载标签列表
const loadTags = async () => {
  try {
    const result = await tagApi.getAllTags()
    if (result.code === 0) {
      tagOptions.value = result.data.map(item => ({
        value: item.id,
        label: item.name
      }))
    } else {
      ElMessage.warning('获取标签列表失败')
    }
  } catch (error) {
    console.error('获取标签列表失败:', error)
    ElMessage.warning('获取标签列表失败')
  }
}

// 加载博客详情
const loadBlogDetail = async () => {
  try {
    const result = await blogApi.getBlogById(blogId)
    
    if (result.code === 0 && result.data) {
      const blog = result.data
      console.log('加载的博客数据:', blog) // 添加调试日志
      
      // 设置基本信息
      blogForm.title = blog.title || ''
      blogForm.summary = blog.summary || ''
      blogForm.categoryId = blog.categoryId || ''
      blogForm.cover = blog.cover || ''
      blogForm.status = blog.status || 0
      
      // 处理内容 - 确保编辑器能正确显示
      blogForm.content = blog.content || ''
      
      // 等待下一个tick确保编辑器组件已经挂载
      await nextTick()
      
      // 如果编辑器已经初始化，手动设置内容
      if (editorRef.value && blog.content) {
        try {
          editorRef.value.setContent(blog.content)
        } catch (error) {
          console.warn('编辑器设置内容失败:', error)
        }
      }
      
      // 处理系统标签 - 确保tagOptions已加载
      if (blog.tagList && blog.tagList.length > 0 && tagOptions.value.length > 0) {
        const tagIds = []
        blog.tagList.forEach(tagName => {
          const tag = tagOptions.value.find(t => t.label === tagName)
          if (tag) {
            tagIds.push(tag.value)
          } else {
            console.warn('未找到标签:', tagName)
          }
        })
        blogForm.tagIdList = tagIds
      } else if (blog.tagList && blog.tagList.length > 0) {
        // 如果标签列表还未加载，延迟处理
        setTimeout(() => {
          const tagIds = []
          blog.tagList.forEach(tagName => {
            const tag = tagOptions.value.find(t => t.label === tagName)
            if (tag) {
              tagIds.push(tag.value)
            }
          })
          blogForm.tagIdList = tagIds
        }, 500)
      }
      
      // 处理自定义标签
      if (blog.customTagList && Array.isArray(blog.customTagList)) {
        blogForm.customTagList = [...blog.customTagList]
      } else {
        blogForm.customTagList = []
      }
      
      console.log('博客表单数据设置完成:', blogForm) // 添加调试日志
      
    } else {
      ElMessage.error(result.msg || '获取博客详情失败')
      console.error('API返回错误:', result)
    }
  } catch (error) {
    console.error('获取博客详情失败:', error)
    ElMessage.error('获取博客详情失败: ' + error.message)
  }
}

// 设置自动保存
const setupAutoSave = () => {
  autoSaveTimer = setInterval(() => {
    if (blogForm.title || blogForm.content) {
      saveBlog(5, true) // 自动保存为草稿
    }
  }, 60000) // 每分钟自动保存一次
}

// 处理页面关闭前的提示
const handleBeforeUnload = (e) => {
  if (blogForm.title || blogForm.content) {
    e.preventDefault()
    e.returnValue = '您有未保存的内容，确定要离开吗？'
  }
}

// 显示标签输入
const showTagInput = () => {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value.focus()
  })
}

// 显示自定义标签输入
const showCustomTagInput = () => {
  customTagInputVisible.value = true
  nextTick(() => {
    customTagInputRef.value.focus()
  })
}

// 处理标签确认添加
const handleTagConfirm = () => {
  const selectedTagId = tagInputValue.value
  if (selectedTagId) {
    if (blogForm.tagIdList.length >= 5) {
      ElMessage.warning('最多添加5个系统标签')
      return
    }
    
    if (blogForm.tagIdList.includes(selectedTagId)) {
      ElMessage.warning('已添加该标签')
      return
    }
    
    blogForm.tagIdList.push(selectedTagId)
  }
  tagInputVisible.value = false
  tagInputValue.value = ''
}

// 处理自定义标签确认添加
const handleCustomTagConfirm = () => {
  const inputValue = customTagInputValue.value.trim()
  if (inputValue) {
    if (blogForm.customTagList.length >= 5) {
      ElMessage.warning('最多添加5个自定义标签')
      return
    }
    
    if (blogForm.customTagList.includes(inputValue)) {
      ElMessage.warning('标签已存在')
      return
    }
    
    // 添加自定义标签
    blogForm.customTagList.push(inputValue)
  }
  customTagInputVisible.value = false
  customTagInputValue.value = ''
}

// 删除标签
const handleRemoveTag = (tag) => {
  blogForm.tagIdList = blogForm.tagIdList.filter(item => item !== tag)
}

// 删除自定义标签
const handleRemoveCustomTag = (tag) => {
  blogForm.customTagList = blogForm.customTagList.filter(item => item !== tag)
}

// 获取标签名称
const getTagName = (tagId) => {
  const tag = tagOptions.value.find(item => item.value === tagId)
  return tag ? tag.label : ''
}

// 自动生成摘要
const generateSummary = () => {
  if (!blogForm.summary && blogForm.content) {
    // 如果编辑器实例存在，则使用编辑器的getText方法获取纯文本
    if (editorRef.value) {
      const text = editorRef.value.getText() || ''
      blogForm.summary = text.substring(0, 200)
    } else {
      // 否则尝试从HTML中提取文本
      const div = document.createElement('div')
      div.innerHTML = blogForm.content
      const text = div.textContent || div.innerText || ''
      blogForm.summary = text.substring(0, 200)
    }
  }
}

// 保存博客
const saveBlog = async (status, isAutoSave = false) => {
  if (saving.value) return
  
  // 确保表单验证通过
  if (!isAutoSave) {
    if (!formRef.value) return
    
    try {
      await formRef.value.validate()
    } catch (error) {
      ElMessage.error('请完善表单信息')
      return
    }
  }
  
  // 获取编辑器最新内容
  if (editorRef.value) {
    try {
      const currentContent = editorRef.value.getContent()
      if (currentContent !== undefined) {
        blogForm.content = currentContent
      }
    } catch (error) {
      console.warn('获取编辑器内容失败:', error)
    }
  }
  
  // 验证必要内容
  if (!blogForm.title?.trim()) {
    ElMessage.error('请输入博客标题')
    return
  }
  
  if (!blogForm.content?.trim()) {
    ElMessage.error('请输入博客内容')
    return
  }
  
  // 自动生成摘要
  generateSummary()
  
  // 更新状态
  blogForm.status = status
  
  saving.value = true
  
  try {
    let result
    if (isEdit.value) {
      // 更新博客
      result = await blogApi.updateBlog({
        ...blogForm,
        id: blogId
      })
    } else {
      // 新建博客
      result = await blogApi.addBlog(blogForm)
    }
    
    if (result.code === 0) {
      if (!isAutoSave) {
        if (status === 5) {
          ElMessage.success('博客已保存为草稿')
        } else {
          ElMessage.success('提交审核成功，请等待审核结果')
        }
        router.back() // 返回进入前的页面
      } else {
        console.log('博客已自动保存')
      }
    } else {
      ElMessage.error(result.msg || '保存失败')
    }
  } catch (error) {
    console.error('保存博客失败:', error)
    ElMessage.error('保存博客失败')
  } finally {
    saving.value = false
  }
}

// 上传封面图
const uploadCover = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只能上传JPG/PNG/GIF/WEBP格式的图片')
    return
  }
  
  // 检查文件大小（限制为2MB）
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过2MB')
    return
  }
  
  uploading.value = true
  
  try {
    const result = await commonApi.uploadImage(file)
    if (result.code === 0 && result.data) {
      blogForm.cover = result.data
      ElMessage.success('封面上传成功')
    } else {
      ElMessage.error(result.msg || '封面上传失败')
    }
  } catch (error) {
    console.error('上传封面失败:', error)
    ElMessage.error('上传封面失败')
  } finally {
    uploading.value = false
    // 重置文件输入框
    if (event.target) {
      event.target.value = ''
    }
  }
}

// 移除封面图
const removeCover = () => {
  blogForm.cover = ''
}

// 提交表单
const submitForm = () => {
  saveBlog(0) // 保存为待审核状态
}

// 保存草稿
const saveDraft = () => {
  saveBlog(5) // 保存为草稿状态
}

// 取消编辑
const cancelEdit = () => {
  ElMessageBox.confirm('是否放弃编辑？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    router.back()
  }).catch(() => {})
}

// 确保编辑器在挂载后正确显示内容
watch(editorRef, (newEditor) => {
  if (newEditor && blogForm.content) {
    nextTick(() => {
      try {
        newEditor.setContent(blogForm.content)
        console.log('编辑器初始化内容成功')
      } catch (error) {
        console.warn('编辑器初始化内容失败:', error)
      }
    })
  }
}, { immediate: true })
</script>

<template>
  <div class="write-blog-container">
    <el-form ref="formRef" :model="blogForm" :rules="rules" label-width="100px">
      <!-- 顶部操作栏 -->
      <div class="top-actions">
        <div class="title">{{ isEdit ? '编辑博客' : '新建博客' }}</div>
        <div class="buttons">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="success" @click="saveDraft" :loading="saving">保存草稿</el-button>
          <el-button type="primary" @click="submitForm" :loading="saving">发布</el-button>
        </div>
      </div>
      
      <!-- 主体内容区域 -->
      <div class="content-wrapper">
        <!-- 左侧编辑区 -->
        <div class="editor-area">
          <!-- 标题输入 -->
          <el-form-item prop="title" class="title-input-wrap">
            <el-input
              v-model="blogForm.title"
              placeholder="请输入博客标题"
              class="title-input"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
          
          <!-- 内容编辑器 -->
          <el-form-item prop="content" class="editor-wrap">
            <WangEditor
              ref="editorRef"
              v-model="blogForm.content"
              :height="500"
              :blog-title="blogForm.title"
            />
          </el-form-item>
        </div>
        
        <!-- 右侧设置区 -->
        <div class="settings-area">
          <el-card shadow="never" class="settings-card">
            <template #header>
              <div class="card-header">
                <span>博客设置</span>
              </div>
            </template>
            
            <div class="settings-section">
              <!-- 分类选择 -->
              <el-form-item label="博客分类" prop="categoryId">
                <el-select v-model="blogForm.categoryId" placeholder="请选择分类" style="width: 100%">
                  <el-option
                    v-for="item in categoryOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              
              <!-- 系统标签 -->
              <el-form-item label="系统标签">
                <div class="tags-container">
                  <el-tag
                    v-for="tagId in blogForm.tagIdList"
                    :key="tagId"
                    closable
                    :disable-transitions="false"
                    @close="handleRemoveTag(tagId)"
                    class="tag-item"
                  >
                    {{ getTagName(tagId) }}
                  </el-tag>
                  
                  <el-select
                    v-if="tagInputVisible"
                    ref="tagInputRef"
                    v-model="tagInputValue"
                    class="tag-input"
                    placeholder="请选择标签"
                    filterable
                    @change="handleTagConfirm"
                    @blur="tagInputVisible = false"
                  >
                    <el-option
                      v-for="item in tagOptions.filter(tag => !blogForm.tagIdList.includes(tag.value))"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                  
                  <el-button v-else class="button-new-tag" size="small" @click="showTagInput">
                    <el-icon><Plus /></el-icon> 添加系统标签
                  </el-button>
                </div>
                <div class="tag-tips">最多选择5个系统标签</div>
              </el-form-item>
              
              <!-- 自定义标签 -->
              <el-form-item label="自定义标签">
                <div class="tags-container">
                  <el-tag
                    v-for="tag in blogForm.customTagList"
                    :key="tag"
                    closable
                    :disable-transitions="false"
                    @close="handleRemoveCustomTag(tag)"
                    type="success"
                    class="tag-item"
                  >
                    {{ tag }}
                  </el-tag>
                  
                  <el-input
                    v-if="customTagInputVisible"
                    ref="customTagInputRef"
                    v-model="customTagInputValue"
                    class="tag-input"
                    size="small"
                    @keyup.enter="handleCustomTagConfirm"
                    @blur="handleCustomTagConfirm"
                    placeholder="请输入标签名"
                    maxlength="20"
                  />
                  
                  <el-button v-else class="button-new-tag" size="small" @click="showCustomTagInput">
                    <el-icon><Plus /></el-icon> 添加自定义标签
                  </el-button>
                </div>
                <div class="tag-tips">最多添加5个自定义标签，Enter键确认</div>
              </el-form-item>
              
              <!-- 封面上传 -->
              <el-form-item label="博客封面">
                <div class="cover-container">
                  <div v-if="blogForm.cover" class="cover-preview">
                    <el-image
                      :src="blogForm.cover"
                      fit="cover"
                      class="cover-image"
                      :preview-src-list="[blogForm.cover]"
                    />
                    <div class="cover-actions">
                      <el-button type="danger" size="small" icon="Delete" @click="removeCover">
                        移除封面
                      </el-button>
                    </div>
                  </div>
                  
                  <div v-else class="cover-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      style="display: none"
                      ref="coverInput"
                      @change="uploadCover"
                    />
                    <el-button 
                      type="primary" 
                      @click="$refs.coverInput.click()"
                      :loading="uploading"
                      size="large"
                      class="upload-button"
                    >
                      <el-icon><Picture /></el-icon>
                      上传封面
                    </el-button>
                    <div class="upload-tips">
                      建议尺寸：1200×675px<br/>
                      支持JPG、PNG、GIF格式，不超过2MB
                    </div>
                  </div>
                </div>
              </el-form-item>
              
              <!-- 摘要 -->
              <el-form-item label="博客摘要">
                <el-input
                  v-model="blogForm.summary"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入博客摘要，不填将自动提取正文前200字"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </div>
          </el-card>
        </div>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.write-blog-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.top-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 0;
}

.title {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}

.content-wrapper {
  display: flex;
  gap: 20px;
}

.editor-area {
  flex: 1;
}

.settings-area {
  width: 350px;
}

.title-input {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

.title-input-wrap {
  margin-bottom: 20px;
}

.title-input :deep(.el-input__inner) {
  font-size: 24px;
  height: 56px;
  padding: 0 15px;
  border-radius: 8px;
}

.editor-wrap {
  margin-bottom: 20px;
}

.settings-card {
  position: sticky;
  top: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.settings-section {
  margin-bottom: 30px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  margin-right: 0;
}

.tag-input {
  width: 120px;
  margin-right: 0;
}

.tag-tips {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

.cover-container {
  width: 100%;
}

.cover-preview {
  margin-bottom: 10px;
}

.cover-image {
  width: 100%;
  height: 170px;
  border-radius: 6px;
  margin-bottom: 10px;
  object-fit: cover;
}

.cover-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  height: 170px;
  text-align: center;
}

.upload-button {
  margin-bottom: 10px;
}

.upload-tips {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.cover-actions {
  display: flex;
  justify-content: center;
}
</style> 