<script setup>
import { ref, onMounted, computed, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import AuthDialog from '@/components/AuthDialog.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import CommentItem from '@/components/CommentItem.vue'
import { useTokenStore } from '@/stores/token.js'
import { useUserInfoStore } from '@/stores/userInfo.js'
import * as blogApi from '@/api/blog.js'
import * as commentApi from '@/api/comment.js'
import * as userApi from '@/api/user.js'
import * as messageApi from '@/api/message.js'
import 'highlight.js/styles/github.css'
import hljs from 'highlight.js'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const blogId = route.params.id

// 使用stores
const tokenStore = useTokenStore()
const userInfoStore = useUserInfoStore()

// 博客数据
const blog = ref({})
// 作者数据
const author = ref({})
// 评论列表
const comments = ref([])
// 评论内容
const commentContent = ref('')
// 相关推荐
const relatedBlogs = ref([])
// 是否登录
const isLoggedIn = ref(false)
// 当前用户id
const currentUserId = ref(null)
// 用户是否已点赞
const hasLiked = ref(false)
// 用户是否已点踩
const hasDisliked = ref(false)
// 用户是否已收藏
const hasCollected = ref(false)
// 加载状态
const loading = ref(true)
// 评论加载状态
const commentsLoading = ref(true)
// 推荐加载状态
const relatedLoading = ref(true)
// 提交评论状态
const submittingComment = ref(false)
// 目录相关
const tableOfContents = ref([])
// 当前高亮的目录项索引
const activeIndex = ref(0)
// 登录弹窗相关
const showAuthDialog = ref(false)
// 评论弹窗相关
const showCommentDrawer = ref(false)
// 移动端检测
const isMobile = ref(false)
// 防重复请求的标记
const loadingRequest = ref(false)
// 回复相关
const replyTo = ref(null)
const isReplyMode = ref(false)

// 举报相关
const showReportDialog = ref(false)
const reportType = ref('blog')
const reportTargetId = ref(0) // blogId, commentId, or userId

// 打开举报弹窗
const openReportDialog = (type, id) => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后举报')
    showAuthDialog.value = true
    return
  }
  
  // 不能举报自己
  if (type === 'blog' && isAuthor.value) {
    ElMessage.warning('不能举报自己的博客')
    return
  }
  // 评论举报的自我检测在组件内或后端做，这里简单放行
  
  reportType.value = type
  reportTargetId.value = id
  showReportDialog.value = true
}

// 处理评论举报
const handleCommentReport = (commentId) => {
  openReportDialog('comment', commentId)
}

// 权限验证函数
const withAuth = (callback, message = '请先登录') => {
  if (isLoggedIn.value) {
    callback()
  } else {
    ElMessage.warning(message)
    showAuthDialog.value = true
  }
}

// 初始化
onMounted(async () => {
  // 立即检测移动端状态
  checkMobile()
  checkLoginStatus()
  
  // 🚀 优化：并行加载所有数据，而不是串行等待
  const loadPromises = [
    loadBlogDetail(),
    loadComments(),
    loadRelated()
  ]
  
  // 并行执行所有加载任务
  await Promise.allSettled(loadPromises)
  
  // 延迟执行DOM操作，确保内容已渲染
  await nextTick()
  
  // 再次检查移动端状态，确保正确
  checkMobile()
  
  setTimeout(() => {
    console.log('🚀 开始初始化博客详情页')
    
    // 高亮代码块
    document.querySelectorAll('.content.markdown-body pre code').forEach((block) => {
      hljs.highlightElement(block)
    })
    
    // 添加代码块复制按钮
    addCopyButtonsToCodeBlocks()
    
    // 生成目录
    generateTableOfContents()
    
    window.addEventListener('resize', handleResize)
    
    console.log('✅ 博客详情页初始化完成')
  }, 300) // 减少延迟时间
})

// 检查登录状态
const checkLoginStatus = () => {
  const token = tokenStore.getToken()
  isLoggedIn.value = !!token
  
  if (isLoggedIn.value) {
    const userInfo = userInfoStore.info
    if (userInfo && userInfo.id) {
      currentUserId.value = userInfo.id
    }
  }
}

// 检查是否为移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 992
}

// 监听窗口大小变化
const handleResize = () => {
  // 使用节流来避免频繁触发
  clearTimeout(handleResize.timer)
  handleResize.timer = setTimeout(() => {
    const oldMobile = isMobile.value
    checkMobile()
    
    // 如果移动端状态发生变化，强制重新渲染
    if (oldMobile !== isMobile.value) {
      nextTick(() => {
        // 重新生成目录（如果需要）
        if (!isMobile.value) {
          generateTableOfContents()
        }
      })
    }
  }, 150)
}

// 加载博客详情
const loadBlogDetail = async () => {
  // 防止重复请求
  if (loadingRequest.value) {
    console.log('⚠️ 正在加载中，跳过重复请求')
    return
  }
  
  loadingRequest.value = true
  
  try {
    // 验证博客ID
    if (!blogId || isNaN(Number(blogId))) {
      ElMessage.error('无效的博客ID')
      router.push('/')
      return
    }
    
    console.log('📖 开始加载博客详情，ID:', blogId)
    
    // 使用viewBlog而不是getBlogById，以便记录浏览量
    const result = await blogApi.viewBlog(blogId)
    
    if (result.code === 0 && result.data) {
      blog.value = result.data
      console.log('✅ 博客详情加载成功:', blog.value.title)
      console.log('👀 浏览量已记录，当前浏览量:', blog.value.views || 0)
      
      // 🚀 优化：并行加载作者信息和用户状态检查
      const parallelTasks = []
      
      // 加载作者信息
      if (blog.value.userId) {
        parallelTasks.push(loadAuthorInfo(blog.value.userId))
      }
      
      // 检查点赞、点踩、收藏状态
      if (isLoggedIn.value) {
        parallelTasks.push(checkLikeStatus())
        parallelTasks.push(checkCollectStatus())
      }
      
      // 并行执行所有任务
      if (parallelTasks.length > 0) {
        await Promise.allSettled(parallelTasks)
      }
    } else {
      console.error('❌ 获取博客详情失败:', result.msg)
      ElMessage.error(result.msg || '获取博客详情失败')
      
      // 如果是博客不存在或被删除，跳转回首页
      if (result.code === 404 || result.msg?.includes('不存在')) {
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }
  } catch (error) {
    console.error('❌ 获取博客详情出错:', error)
    ElMessage.error('获取博客详情失败，请稍后重试')
    
    // 网络错误时延迟跳转
    setTimeout(() => {
      router.push('/')
    }, 3000)
  } finally {
    loading.value = false
    loadingRequest.value = false
    
    // 内容加载完成后，重新初始化目录和滚动监听
    nextTick(() => {
      setTimeout(() => {
        console.log('🔄 博客内容加载完成，重新初始化')
        generateTableOfContents()
        addCopyButtonsToCodeBlocks()
        
        // 确保滚动监听器在内容加载后重新初始化
        setTimeout(() => {
          if (tableOfContents.value.length > 0) {
            console.log('🔄 重新初始化滚动监听器')
            initScrollListener()
          }
        }, 200) // 减少延迟
      }, 100) // 减少延迟
    })
  }
}

// 加载作者信息
const loadAuthorInfo = async (userId) => {
  try {
    const result = await userApi.getUserById(userId)
    if (result.code === 0 && result.data) {
      author.value = result.data
      
      // 如果用户已登录，检查是否已关注作者
      if (isLoggedIn.value && currentUserId.value !== userId) {
        try {
          const followResult = await userApi.isFollowed(userId)
          if (followResult.code === 0) {
            author.value.followed = followResult.data
            console.log('已获取关注状态:', author.value.followed)
          }
        } catch (error) {
          console.error('获取关注状态出错:', error)
        }
      }
      
      // 获取作者的统计信息
      try {
        const statsResult = await userApi.getUserStats(userId)
        if (statsResult.code === 0 && statsResult.data) {
          // 更新作者的统计数据
          author.value.blogCount = statsResult.data.blogCount || 0
          author.value.followCount = statsResult.data.followCount || 0
          author.value.fansCount = statsResult.data.fansCount || 0
          console.log('获取作者统计信息成功:', statsResult.data)
        }
      } catch (error) {
        console.error('获取作者统计信息出错:', error)
      }
    }
  } catch (error) {
    console.error('获取作者信息出错:', error)
  }
}

// 加载评论
const loadComments = async () => {
  try {
    const result = await commentApi.getCommentsByBlogId(blogId)
    if (result.code === 0 && result.data) {
      // 获取所有评论
      const allComments = result.data || []
      console.log("原始评论数据:", allComments)
      
      // 将评论按照层级结构组织
      const commentMap = new Map()
      
      // 首先创建所有评论的映射
      allComments.forEach(comment => {
        // 确保每条评论都有children数组
        comment.children = []
        commentMap.set(comment.id, comment)
      })
      
      // 构建评论树
      const rootComments = []
      allComments.forEach(comment => {
        if (!comment.parentId) {
          // 顶层评论
          rootComments.push(comment)
        } else {
          // 找到父评论
          const parentComment = commentMap.get(comment.parentId)
          if (parentComment) {
            // 如果找到父评论，则添加到父评论的子评论列表中
            parentComment.children.push(comment)
            
            // 设置回复目标用户名
            comment.replyToUsername = parentComment.username
          } else {
            // 如果找不到父评论(可能已删除)，作为顶层评论处理
            rootComments.push(comment)
          }
        }
      })
      
      console.log("处理后的评论结构:", rootComments)
      comments.value = rootComments
    }
  } catch (error) {
    console.error('获取评论出错:', error)
  } finally {
    commentsLoading.value = false
  }
}

// 加载相关推荐
const loadRelated = async () => {
  try {
    // 这里可以根据标签、分类等推荐相关博客
    // 示例中简单使用获取最新文章作为推荐
    const result = await blogApi.getBlogPage({
      pageSize: 5,
      page: 1,
      excludeId: blogId
    })
    
    if (result.code === 0 && result.data) {
      relatedBlogs.value = result.data.records || []
    }
  } catch (error) {
    console.error('获取相关推荐出错:', error)
  } finally {
    relatedLoading.value = false
  }
}

// 检查点赞状态
const checkLikeStatus = async () => {
  try {
    // 检查点赞状态
    const likedResult = await blogApi.isLiked(blogId);
    if (likedResult.code === 0) {
      hasLiked.value = likedResult.data;
    }
    
    // 检查点踩状态
    const dislikedResult = await blogApi.isDisliked(blogId);
    if (dislikedResult.code === 0) {
      hasDisliked.value = dislikedResult.data;
    }
  } catch (error) {
    console.error('检查点赞/点踩状态出错:', error);
    // 失败时默认未点赞/点踩
    hasLiked.value = false;
    hasDisliked.value = false;
  }
}

// 检查收藏状态
const checkCollectStatus = async () => {
  try {
    const result = await blogApi.isCollected(blogId)
    if (result.code === 0) {
      hasCollected.value = result.data
    }
  } catch (error) {
    console.error('检查收藏状态出错:', error)
  }
}

// 点赞博客
const likeBlog = () => {
  withAuth(async () => {
    // 已登录，可以执行点赞逻辑
    try {
      const result = await blogApi.likeBlog(blogId.value)
      if (result.code === 0) {
        if (blog.value.liked) {
          ElMessage.success('取消点赞成功')
          blog.value.likeCount--
        } else {
          ElMessage.success('点赞成功')
          blog.value.likeCount++
        }
        blog.value.liked = !blog.value.liked
      } else {
        ElMessage.error(result.msg || '操作失败')
      }
    } catch (error) {
      console.error('点赞操作失败:', error)
      ElMessage.error('操作失败，请稍后重试')
    }
  }, '登录后才能点赞哦')
}

// 收藏博客
const collectBlog = () => {
  withAuth(async () => {
    // 已登录，可以执行收藏逻辑
    try {
      const result = await blogApi.collectBlog(blogId.value)
      if (result.code === 0) {
        if (blog.value.collected) {
          ElMessage.success('取消收藏成功')
          blog.value.collectCount--
        } else {
          ElMessage.success('收藏成功')
          blog.value.collectCount++
        }
        blog.value.collected = !blog.value.collected
      } else {
        ElMessage.error(result.msg || '操作失败')
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      ElMessage.error('操作失败，请稍后重试')
    }
  }, '登录后才能收藏哦')
}

// 处理点赞
const handleLike = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    showAuthDialog.value = true
    return
  }
  
  try {
    const result = await blogApi.likeBlog(blogId);
    
    if (result.code === 0) {
      // 更新点赞状态和数量
      hasLiked.value = !hasLiked.value;
      if (hasLiked.value) {
        blog.value.likes = (blog.value.likes || 0) + 1;
        if (hasDisliked.value) {
          hasDisliked.value = false;
          blog.value.dislikes = Math.max(0, (blog.value.dislikes || 0) - 1);
        }
      } else {
        blog.value.likes = Math.max(0, (blog.value.likes || 0) - 1);
      }
      ElMessage.success(hasLiked.value ? '点赞成功' : '已取消点赞');
    } else {
      ElMessage.error(result.msg || '操作失败');
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    ElMessage.error('点赞失败，请稍后重试');
  }
}

// 处理点踩
const handleDislike = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    showAuthDialog.value = true
    return
  }
  
  try {
    const result = await blogApi.dislikeBlog(blogId);
    
    if (result.code === 0) {
      // 更新点踩状态和数量
      hasDisliked.value = !hasDisliked.value;
      if (hasDisliked.value) {
        blog.value.dislikes = (blog.value.dislikes || 0) + 1;
        if (hasLiked.value) {
          hasLiked.value = false;
          blog.value.likes = Math.max(0, (blog.value.likes || 0) - 1);
        }
      } else {
        blog.value.dislikes = Math.max(0, (blog.value.dislikes || 0) - 1);
      }
      ElMessage.success(hasDisliked.value ? '点踩成功' : '已取消点踩');
    } else {
      ElMessage.error(result.msg || '操作失败');
    }
  } catch (error) {
    console.error('点踩操作失败:', error);
    ElMessage.error('操作失败，请稍后重试');
  }
}

// 处理收藏
const handleCollect = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    showAuthDialog.value = true
    return
  }
  
  try {
    const result = await blogApi.collectBlog(blogId);
    
    if (result.code === 0) {
      hasCollected.value = !hasCollected.value;
      
      if (hasCollected.value) {
        ElMessage.success('收藏成功');
        blog.value.collections = (blog.value.collections || 0) + 1;
      } else {
        ElMessage.success('已取消收藏');
        blog.value.collections = Math.max(0, (blog.value.collections || 0) - 1);
      }
    } else {
      ElMessage.error(result.msg || '操作失败');
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    ElMessage.error('收藏失败，请稍后重试');
  }
}

// 处理分享
const handleShare = async () => {
  try {
    // 获取支持的平台
    const platforms = await blogApi.getSupportedPlatforms()
    
    if (platforms.code === 0 && platforms.data && platforms.data.length > 0) {
      // 调用分享API（使用第一个平台作为默认）
      const shareResult = await blogApi.shareBlog(blogId, platforms.data[0])
      
      // 只有在后端API成功返回后才更新本地分享计数
      if (shareResult.code === 0) {
        blog.value.shares = (blog.value.shares || 0) + 1
      }
      
      // 复制当前页面链接
      const url = window.location.href
      navigator.clipboard.writeText(url).then(() => {
        ElMessage.success('链接已复制，可分享给朋友')
      })
    } else {
      // 平台获取失败时也尝试复制链接
      const url = window.location.href
      navigator.clipboard.writeText(url).then(() => {
        ElMessage.success('链接已复制，可分享给朋友')
      })
    }
  } catch (error) {
    console.error('分享操作失败:', error)
    
    // 退化方案，直接复制链接（不更新分享计数）
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      ElMessage.success('链接已复制，可分享给朋友')
    })
  }
}

// 处理关注作者
const handleFollowAuthor = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    showAuthDialog.value = true
    return
  }
  
  try {
    const result = await userApi.followUser(author.value.id)
    
    if (result.code === 0) {
      // 更新关注状态
      author.value.followed = !author.value.followed
      
      // 更新粉丝计数
      if (author.value.followed) {
        author.value.fansCount = (author.value.fansCount || 0) + 1
        ElMessage.success(`已关注 ${author.value.username}`)
      } else {
        author.value.fansCount = Math.max(0, (author.value.fansCount || 0) - 1)
        ElMessage.success(`已取消关注 ${author.value.username}`)
      }
    } else {
      ElMessage.error(result.msg || '操作失败')
    }
  } catch (error) {
    console.error('关注操作失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  }
}

// 处理私信 - 创建/匹配会话后跳转到消息页面
const handleSendMessage = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    showAuthDialog.value = true
    return
  }
  
  try {
    const result = await messageApi.createPrivateConversation(author.value.id)
    if (result.code === 0 && result.data) {
      // 跳转到消息页面并传递会话ID
      router.push({ path: '/messages', query: { conversationId: result.data } })
    } else {
      ElMessage.error(result.msg || '创建会话失败')
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  }
}

// 提交评论
const submitComment = () => {
  withAuth(async () => {
    if (!commentContent.value.trim()) {
      ElMessage.warning('评论内容不能为空')
      return
    }
    
    try {
      submittingComment.value = true
      
      const data = {
        blogId: blogId,
        content: commentContent.value,
        parentId: isReplyMode.value ? replyTo.value.id : null
      }
      
      const result = await commentApi.addComment(data)
      
      if (result.code === 0) {
        ElMessage.success(isReplyMode.value ? '回复发表成功' : '评论发表成功')
        commentContent.value = ''
        
        // 清除回复状态
        cancelReply()
        
        // 重新加载评论列表
        loadComments()
      } else {
        ElMessage.error(result.msg || '评论发表失败')
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      ElMessage.error('发表评论失败')
    } finally {
      submittingComment.value = false
    }
  }, '登录后才能发表评论')
}

// 回复评论
const replyComment = (comment) => {
  withAuth(() => {
    replyTo.value = comment
    isReplyMode.value = true
    commentContent.value = ''
    
    // 滚动到评论框
    showCommentDrawer.value = true
    setTimeout(() => {
      const commentInput = document.querySelector('.comment-input textarea')
      if (commentInput) {
        commentInput.focus()
      }
    }, 300)
  }, '登录后才能回复评论')
}

// 取消回复
const cancelReply = () => {
  replyTo.value = null
  isReplyMode.value = false
}

// 删除评论
const deleteComment = async (commentId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const result = await commentApi.deleteComment(commentId)
    
    if (result.code === 0) {
      ElMessage.success('评论已删除')
      
      // 重新加载评论列表
      loadComments()
    } else {
      ElMessage.error(result.msg || '删除评论失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除评论失败:', error)
    }
  }
}

// 处理编辑博客
const handleEditBlog = () => {
  router.push(`/edit/${blogId}`)
}

// 处理删除博客
const handleDeleteBlog = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这篇博客吗？此操作不可逆！', '警告', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const result = await blogApi.deleteBlogById(blogId)
    
    if (result.code === 0) {
      ElMessage.success('博客已删除')
      router.push('/my-blogs')
    } else {
      ElMessage.error(result.msg || '删除博客失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除博客失败:', error)
    }
  }
}

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

// 格式化Markdown内容为HTML
const formattedContent = computed(() => {
  if (!blog.value.content) return ''
  
  // 配置marked选项
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    highlight: function(code, language) {
      if (language && hljs.getLanguage(language)) {
        try {
          return hljs.highlight(code, { language }).value
        } catch (err) {}
      }
      return hljs.highlightAuto(code).value
    }
  })
  
  try {
    return marked(blog.value.content)
  } catch (e) {
    console.error('Markdown解析错误:', e)
    return blog.value.content
  }
})

// 是否是博客作者
const isAuthor = computed(() => {
  return currentUserId.value === blog.value.userId
})

// 计算是否显示侧边栏
const showSidebars = computed(() => {
  return !isMobile.value
})

// 计算容器样式
const containerStyle = computed(() => {
  if (isMobile.value) {
    return {
      display: 'block'
    }
  }
  return {
    display: 'flex'
  }
})

// 生成目录
const generateTableOfContents = () => {
  console.log('开始生成目录，isMobile:', isMobile.value)
  
  setTimeout(() => {
    // 等待内容完全渲染
    const contentElement = document.querySelector('.content.markdown-body')
    if (!contentElement) {
      console.log('❌ 未找到内容元素，无法生成目录')
      return
    }
    
    const headings = document.querySelectorAll('.content.markdown-body h1, .content.markdown-body h2, .content.markdown-body h3, .content.markdown-body h4, .content.markdown-body h5, .content.markdown-body h6')
    console.log('🔍 查找到的标题元素数量:', headings.length)
    
    const toc = []
    
    headings.forEach((heading, index) => {
      const id = `heading-${index + 1}`
      const level = parseInt(heading.tagName.substring(1)) // H1->1, H2->2, etc.
      const text = heading.textContent.trim()
      
      // 为标题添加ID
      heading.setAttribute('id', id)
      
      // 添加到目录数组
      toc.push({
        id: id,
        text: text,
        level: level,
        index: index
      })
      
      console.log(`📝 标题 ${index}: ${text} (${heading.tagName})`)
    })
    
    tableOfContents.value = toc
    
    if (toc.length > 0) {
      console.log('✅ 目录生成完成:', toc.length, '个标题')
      // 只有在非移动模式下才初始化滚动监听
      if (!isMobile.value) {
        // 初始化滚动监听，给DOM更多时间渲染
        setTimeout(() => {
          initScrollListener()
        }, 300)
      } else {
        console.log('📱 移动端模式，跳过目录滚动监听初始化')
      }
    } else {
      console.log('❌ 未找到任何标题元素，请检查内容是否已加载')
    }
  }, 500) // 增加延迟时间
}

// 为代码块添加复制按钮
const addCopyButtonsToCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll('.content.markdown-body pre code')
  codeBlocks.forEach((codeBlock) => {
    // 检查是否已经添加了复制按钮
    if (codeBlock.parentElement.querySelector('.copy-button')) {
      return
    }
    
    // 创建复制按钮
    const copyButton = document.createElement('button')
    copyButton.innerText = '复制'
    copyButton.classList.add('copy-button')
    
    // 为复制按钮添加点击事件
    copyButton.addEventListener('click', () => {
      const codeText = codeBlock.textContent
      navigator.clipboard.writeText(codeText).then(() => {
        ElMessage.success('代码已复制到剪贴板')
        copyButton.innerText = '已复制'
        setTimeout(() => {
          copyButton.innerText = '复制'
        }, 2000)
      }).catch(() => {
        ElMessage.error('复制失败')
      })
    })
    
    // 将复制按钮添加到代码块的父级元素中
    codeBlock.parentElement.style.position = 'relative'
    codeBlock.parentElement.appendChild(copyButton)
  })
}

// 目录项点击事件
const handleTocItemClick = (index, id) => {
  activeIndex.value = index
  
  // 页面滚动到对应标题
  const targetElement = document.getElementById(id)
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
  // 滚动目录以确保当前点击的目录项可见
  setTimeout(() => {
    scrollTocToActive()
  }, 300)
}

// 使用 IntersectionObserver 的滚动监听
const visibleHeadings = ref(new Set())
const observer = ref(null)

const handleIntersection = (entries) => {
  entries.forEach((entry) => {
    const headingId = entry.target.getAttribute('id')
    if (entry.isIntersecting) {
      visibleHeadings.value.add(entry.target)
    } else {
      visibleHeadings.value.delete(entry.target)
    }
  })
  
  // 获取所有标题元素的数组
  const allHeadings = document.querySelectorAll('.content.markdown-body h1, .content.markdown-body h2, .content.markdown-body h3, .content.markdown-body h4, .content.markdown-body h5, .content.markdown-body h6')
  const headingsArray = Array.from(allHeadings)
  
  // 按照DOM中的倒序排列可见标题，然后取第一个（即最后一个可见的标题）
  const visibleArray = Array.from(visibleHeadings.value)
  const lastVisible = visibleArray.sort((a, b) => headingsArray.indexOf(b) - headingsArray.indexOf(a))[0]
  
  if (lastVisible) {
    // 找到对应的目录索引
    const headingId = lastVisible.getAttribute('id')
    const tocIndex = tableOfContents.value.findIndex(item => item.id === headingId)
    
    if (tocIndex !== -1 && activeIndex.value !== tocIndex) {
      console.log('🔄 IntersectionObserver 更新激活索引:', activeIndex.value, '->', tocIndex)
      activeIndex.value = tocIndex
      
      // 滚动目录
      nextTick(() => {
        scrollTocToActive()
      })
    }
  }
}

// 滚动目录到激活项
const scrollTocToActive = () => {
  const activeItem = document.querySelector('.toc-item.toc-active')
  const container = document.querySelector('.toc-container')
  
  console.log('📦 目录滚动 - 容器:', container, '激活项:', activeItem)
  
  if (activeItem && container) {
    const containerRect = container.getBoundingClientRect()
    const activeRect = activeItem.getBoundingClientRect()
    const itemOffsetTop = activeItem.offsetTop
    const containerHeight = containerRect.height
    
    // 计算滚动位置，让激活项在容器中央
    let scrollTop = itemOffsetTop - containerHeight / 2 + activeRect.height / 2
    
    // 确保不超出边界
    const maxScrollTop = container.scrollHeight - containerHeight
    scrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop))
    
    console.log('📏 目录滚动计算:', {
      itemOffsetTop,
      containerHeight,
      scrollTop,
      maxScrollTop,
      currentScrollTop: container.scrollTop
    })
    
    // 只有当滚动距离足够大时才执行滚动
    const scrollDistance = Math.abs(container.scrollTop - scrollTop)
    if (scrollDistance > 10) {
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
      console.log('✅ 目录已滚动到位置:', scrollTop)
    } else {
      console.log('📍 目录无需滚动，已在合适位置')
    }
  } else {
    console.log('❌ 未找到目录容器或激活项')
  }
}

// 初始化 IntersectionObserver
const initScrollListener = () => {
  console.log('🚀 开始初始化 IntersectionObserver')
  
  // 检查必要的DOM元素是否存在
  const contentElement = document.querySelector('.content.markdown-body')
  const tocContainer = document.querySelector('.toc-container')
  const headings = document.querySelectorAll('.content.markdown-body h1, .content.markdown-body h2, .content.markdown-body h3, .content.markdown-body h4, .content.markdown-body h5, .content.markdown-body h6')
  
  console.log('🔍 DOM检查:', {
    contentElement: !!contentElement,
    tocContainer: !!tocContainer,
    headingsCount: headings.length,
    tableOfContentsLength: tableOfContents.value.length
  })
  
  // 如果目录容器不存在且不是移动端，则可能是在移动端视图
  // 或者没有足够的标题来显示目录，这种情况下不需要继续初始化
  if (!contentElement || headings.length === 0) {
    console.log('⚠️ 没有找到内容元素或没有标题，取消目录初始化')
    return
  }
  
  // 如果目录容器不存在，在非移动端下应该显示，但可能还没渲染
  // 在移动端不需要目录，所以直接返回
  if (!tocContainer) {
    if (isMobile.value) {
      console.log('📱 移动端模式，不需要初始化目录')
      return
    }
    
    // 最多尝试5次，避免无限循环
    if (!initScrollListener.retryCount) {
      initScrollListener.retryCount = 1
    } else if (initScrollListener.retryCount >= 5) {
      console.log('❌ 多次尝试未找到目录容器，放弃初始化')
      return
    } else {
      initScrollListener.retryCount++
    }
    
    console.log(`⚠️ DOM元素未准备好，延迟重试 (${initScrollListener.retryCount}/5)`)
    setTimeout(() => {
      initScrollListener()
    }, 500)
    return
  }
  
  // 重置重试计数
  initScrollListener.retryCount = 0
  
  // 清除之前的 observer
  if (observer.value) {
    observer.value.disconnect()
    console.log('🧹 清除旧的 IntersectionObserver')
  }
  
  // 获取文档高度，用于扩展检测区域
  const docHeight = Math.floor(document.body.clientHeight)
  
  // 创建 IntersectionObserver
  observer.value = new IntersectionObserver(handleIntersection, {
    // 扩展检测区域：向上扩展整个文档高度，向下收缩33%
    // 这样一旦标题滚过屏幕下方33%的位置，就会一直被认为是可见的
    rootMargin: `${docHeight}px 0px -33% 0px`,
    threshold: 0.1 // 10% 可见时触发
  })
  
  // 观察所有标题元素
  headings.forEach(heading => {
    observer.value.observe(heading)
  })
  
  console.log('✅ IntersectionObserver 已成功初始化')
  console.log('📊 观察的标题数量:', headings.length)
  
  // 设置初始状态：激活第一个标题
  if (tableOfContents.value.length > 0) {
    activeIndex.value = 0
    console.log('🎯 设置初始激活索引:', 0)
  }
}

// 登录成功处理
const handleLoginSuccess = (userData) => {
  // 更新登录状态
  checkLoginStatus()
  
  // 刷新页面状态
  if (blog.value.id) {
    checkLikeStatus()
    checkCollectStatus()
  }
  
  ElMessage.success('登录成功，现在可以互动了！')
}

// 组件卸载时清理
onBeforeUnmount(() => {
  // 清理 IntersectionObserver
  if (observer.value) {
    observer.value.disconnect()
    console.log('🧹 IntersectionObserver 已清理')
  }
  
  window.removeEventListener('resize', handleResize)
  console.log('🧹 组件已卸载，事件监听器已清理')
})

// 计算总评论数（包括所有子评论）
const totalCommentsCount = computed(() => {
  let count = 0;
  
  // 递归函数计算评论及其所有子评论的数量
  const countComments = (commentList) => {
    if (!commentList || !commentList.length) return 0;
    
    // 当前层级的评论数量
    count += commentList.length;
    
    // 计算所有子评论的数量
    commentList.forEach(comment => {
      if (comment.children && comment.children.length > 0) {
        countComments(comment.children);
      }
    });
    
    return count;
  };
  
  // 从根评论开始计算
  return countComments(comments.value);
});
</script>

<template>
    <div class="blog-detail-page">
    <el-container class="detail-container" :style="containerStyle">
      <!-- 左侧作者信息区 -->
      <el-aside v-if="showSidebars" class="blog-sidebar-left" width="260px">
        <el-affix :offset="80">
          <div class="sidebar-card author-card">
            <div class="author-header" @click="router.push(`/user/${author.id}`)" style="cursor: pointer;">
              <el-avatar :size="60" :src="author.avatar || ''" />
              <div class="author-info">
                <div class="author-name">{{ author.username || '未知作者' }}</div>
              </div>
            </div>
            
            <div class="author-stats">
              <div class="stat-item">
                <div class="stat-value">{{ author.followCount || 0 }}</div>
                <div class="stat-label">关注</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ author.fansCount || 0 }}</div>
                <div class="stat-label">粉丝</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ author.blogCount || 0 }}</div>
                <div class="stat-label">文章</div>
              </div>
            </div>
            
            <div class="author-action" v-if="!isAuthor">
              <div class="author-btn-group">
                <el-button 
                  :type="author.followed ? 'default' : 'primary'" 
                  size="default" 
                  class="follow-btn"
                  @click="handleFollowAuthor"
                >
                  {{ author.followed ? '已关注' : '关注' }}
                </el-button>
                <el-button 
                  type="success" 
                  plain 
                  size="default"
                  class="message-btn"
                  @click="handleSendMessage"
                >
                  ✉ 
                </el-button>
                <el-button 
                  type="info" 
                  plain 
                  size="default"
                  class="report-btn"
                  @click="openReportDialog('user', author.id)"
                >
                  举报
                </el-button>
              </div>
            </div>
          </div>
        </el-affix>
      </el-aside>

      <!-- 博客内容区 -->
      <el-main class="blog-content-main" :class="{ 'mobile-main': isMobile }">
        <div class="blog-content-container">
          <!-- 加载中 -->
          <div v-if="loading" class="loading-skeleton">
            <el-skeleton animated :rows="20" />
          </div>
          
          <!-- 博客内容 -->
          <div v-else class="blog-content">
            <!-- 文章头部信息 -->
            <div class="blog-header">
              <h1 class="blog-title">{{ blog.title }}</h1>

              <!-- 文章标签 -->
              <div class="blog-tags" v-if="blog.tagList && blog.tagList.length">
                文章标签：
                <el-tag
                    v-for="tag in blog.tagList"
                    :key="tag"
                    size="small"
                    effect="plain"
                    class="blog-tag"
                >
                  {{ tag }}
                </el-tag>
                <el-tag
                    v-for="customTag in blog.customTagList"
                    :key="customTag"
                    size="small"
                    effect="plain"
                    class="blog-tag"
                >
                  {{ customTag }}
                </el-tag>
              </div>
              
              <div class="blog-meta">
                <div class="author-info" @click="router.push(`/user/${blog.userId}`)">
                  <el-avatar :size="40" :src="author.avatar || ''" />
                  <div class="author-detail">
                    <div class="author-name">{{ author.username || '未知作者' }}</div>
                    <div class="publish-time">{{ formatDate(blog.createTime) }}</div>
                  </div>
                </div>
                
                <!-- 作者操作区 -->
                <div class="author-actions" v-if="isAuthor">
                  <el-button type="primary" plain size="small" @click="handleEditBlog">编辑文章</el-button>
                  <el-button type="danger" plain size="small" @click="handleDeleteBlog">删除</el-button>
                </div>
                
                <!-- 非作者的关注按钮 -->
                <div class="follow-action" v-if="false">
                  <!-- 已移除头部关注和举报按钮 -->
                </div>
              </div>
            </div>

            <!-- 文章内容 -->
            <div class="content markdown-body" v-html="formattedContent"></div>
          </div>
        </div>
      </el-main>
      
      <!-- 右侧边栏 -->
      <el-aside v-if="showSidebars" class="blog-sidebar-right" width="240px">
        <el-affix :offset="80">
          <div class="sidebar-actions">
            <!-- 目录导航卡片 -->
            <div class="sidebar-card toc-card" v-if="tableOfContents.length > 0">
              <div class="toc-header">
                <Icon icon="mdi:format-list-bulleted" class="icon" />
                <span>目录</span>
              </div>
              <div class="toc-container">
                <ul class="toc-list">
                  <li 
                    v-for="(item, index) in tableOfContents" 
                    :key="item.id"
                    :class="{ 'toc-active': activeIndex === index }"
                    :style="{ paddingLeft: (item.level - 1) * 12 + 'px' }"
                    class="toc-item"
                    @click="handleTocItemClick(index, item.id)"
                  >
                    <a :href="`#${item.id}`" @click.prevent>{{ item.text }}</a>
                  </li>
                </ul>
              </div>
            </div>

            <!-- 交互操作卡片 -->
            <div class="sidebar-card action-card">
              <div class="action-grid">
                <!-- 第一行 -->
                <div class="action-item" @click="handleLike">
                  <Icon icon="mdi:thumb-up" :class="['action-icon', { 'liked': hasLiked }]" />
                  <span class="action-text">{{ blog.likes || 0 }}</span>
                  <span class="action-label">点赞</span>
                </div>
                
                <div class="action-item" @click="handleDislike">
                  <Icon icon="mdi:thumb-down" :class="['action-icon', { 'disliked': hasDisliked }]" />
                  <span class="action-text">{{ blog.dislikes || 0 }}</span>
                  <span class="action-label">点踩</span>
                </div>
                
                <!-- 第二行 -->
                <div class="action-item">
                  <Icon icon="mdi:eye-outline" class="action-icon" />
                  <span class="action-text">{{ blog.views || 0 }}</span>
                  <span class="action-label">阅读量</span>
                </div>

                <div class="action-item" @click="handleCollect">
                  <Icon icon="mdi:star" :class="['action-icon', { 'collected': hasCollected }]" />
                  <span class="action-text">{{ blog.collections || 0 }}</span>
                  <span class="action-label">收藏</span>
                </div>
                
                <!-- 第三行 -->
                <div class="action-item" @click="showCommentDrawer = true">
                  <Icon icon="mdi:comment-outline" class="action-icon" />
                  <span class="action-text">{{ totalCommentsCount }}</span>
                  <span class="action-label">评论</span>
                </div>
                
                <div class="action-item" @click="handleShare">
                  <Icon icon="mdi:share-variant" class="action-icon" />
                  <span class="action-text">{{ blog.shares || 0 }}</span>
                  <span class="action-label">分享</span>
                </div>
                
                <div class="action-item full-width-item" @click="openReportDialog('blog', blog.id)">
                  <Icon icon="mdi:alert-circle-outline" class="action-icon warning-icon" />
                  <span class="action-text">举报</span>
                </div>
              </div>
            </div>
          </div>
        </el-affix>
      </el-aside>
    </el-container>
    
    <!-- 登录弹窗 -->
    <AuthDialog 
      v-model="showAuthDialog" 
      @login-success="handleLoginSuccess"
    />

    <!-- 举报弹窗 -->
    <ReportDialog
      v-model:visible="showReportDialog"
      :report-type="reportType"
      :target-id="reportTargetId"
    />
    
    <!-- 移动端浮动操作按钮 -->
    <div class="mobile-actions" v-if="isMobile">
      <div class="mobile-action-item" @click="handleLike">
        <Icon icon="mdi:thumb-up" :class="['action-icon', { 'liked': hasLiked }]" />
        <span class="action-count">{{ blog.likes || 0 }}</span>
      </div>
      <div class="mobile-action-item" @click="handleCollect">
        <Icon icon="mdi:star" :class="['action-icon', { 'collected': hasCollected }]" />
        <span class="action-count">{{ blog.collections || 0 }}</span>
      </div>
      <div class="mobile-action-item" @click="showCommentDrawer = true">
        <Icon icon="mdi:comment-outline" class="action-icon" />
        <span class="action-count">{{ totalCommentsCount }}</span>
      </div>
      <div class="mobile-action-item">
        <Icon icon="mdi:eye-outline" class="action-icon" />
        <span class="action-count">{{ blog.views || 0 }}</span>
      </div>
    </div>

    <!-- 评论抽屉 -->
    <el-drawer
      v-model="showCommentDrawer"
      title="评论区"
      direction="rtl"
      :size="isMobile ? '100%' : '500px'"
    >
      <div class="comment-drawer-content">
        <div class="comment-stats">
          <Icon icon="mdi:comment-multiple-outline" class="icon" />
          <span>共 {{ totalCommentsCount }} 条评论</span>
        </div>
        
        <!-- 评论输入框 -->
        <div class="comment-input">
          <div class="reply-info" v-if="isReplyMode && isLoggedIn">
            <span class="reply-tip">回复 <strong>{{ replyTo?.username }}</strong>：</span>
            <el-button type="text" size="small" @click="cancelReply">取消回复</el-button>
          </div>
          
          <!-- 已登录状态显示评论输入框 -->
          <template v-if="isLoggedIn">
            <el-input
              v-model="commentContent"
              type="textarea"
              :rows="4"
              :placeholder="isReplyMode ? '写下你的回复...' : '写下你的评论...'"
            />
            <div class="comment-actions">
              <el-button 
                type="primary" 
                :disabled="!commentContent.trim() || submittingComment"
                :loading="submittingComment"
                @click="submitComment"
              >
                {{ isReplyMode ? '发表回复' : '发表评论' }}
              </el-button>
            </div>
          </template>
          
          <!-- 未登录状态显示登录提示 -->
          <div v-else class="login-tip-container">
            <div class="login-tip">登录后才能发表评论</div>
            <el-button type="primary" @click="showAuthDialog = true">
              立即登录
            </el-button>
          </div>
        </div>
        
        <!-- 评论列表 -->
        <div class="comment-list-container">
          <div v-if="commentsLoading" class="loading-skeleton">
            <el-skeleton animated :rows="5" />
          </div>
          
          <div v-else-if="comments.length === 0" class="empty-comments">
            <el-empty description="暂无评论，快来抢沙发吧！" />
          </div>
          
          <div v-else class="comment-list">
            <CommentItem
              v-for="comment in comments"
              :key="comment.id"
              :comment="comment"
              :current-user-id="currentUserId"
              :is-logged-in="isLoggedIn"
              @reply="replyComment"
              @delete="deleteComment"
              @report="handleCommentReport"
              @show-login="showAuthDialog = true"
            />
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
/* 全局滚动行为 */
html {
  scroll-behavior: smooth;
}

/* Iconify图标样式 */
.icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: middle;
  transition: all 0.3s ease;
}

/* 图标状态样式 */
.icon.liked {
  color: var(--pixel-primary-light);
}

.icon.disliked {
  color: var(--pixel-red);
}

.icon.collected {
  color: var(--pixel-gold);
}

.warning-icon {
  color: var(--pixel-gold);
}

.warning-icon:hover {
  color: var(--pixel-red);
}

.author-btn-group {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.follow-btn {
  flex: 1;
}

.report-btn {
  padding: 8px 15px;
}

.blog-detail-page {
  width: 100%;
  padding: 0 20px;
  margin: 0 auto;
  box-sizing: border-box;
}

.detail-container {
  width: 100%;
  min-height: calc(100vh - 60px);
}

.blog-sidebar-left {
  width: 260px !important;
  min-width: 260px;
  padding-right: 20px;
  box-sizing: border-box;
}

.blog-content-main {
  flex: 1;
  min-width: 0;
  padding: 0 20px;
  box-sizing: border-box;
}

.blog-content-main.mobile-main {
  padding: 0;
  width: 100%;
}

.blog-content-container {
  width: 100%;
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 30px;
  box-shadow: 3px 3px 0 #000;
  box-sizing: border-box;
  border: 2px solid #000;
}

.blog-sidebar-right {
  width: 240px !important;
  min-width: 240px;
  padding-left: 20px;
  box-sizing: border-box;
}

.blog-title {
  font-size: 28px;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--pixel-text-primary);
}

.blog-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000;
}

.author-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.author-detail {
  margin-left: 10px;
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.publish-time {
  font-size: 15px;
  color: var(--pixel-text-muted);
  margin-top: 4px;
}

.blog-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.blog-tag {
  cursor: pointer;
}

.content {
  font-size: 16px;
  line-height: 1.8;
  color: var(--pixel-text-primary);
  margin-bottom: 30px;
}

/* Markdown样式 */
:deep(.markdown-body) {
  line-height: 1.8;
  font-size: 16px;
  background-color: transparent;
  color: var(--pixel-text-primary);
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

:deep(.markdown-body h1) {
  font-size: 2em;
  border-bottom: 2px solid #000;
  padding-bottom: 0.3em;
  color: var(--pixel-text-primary);
}

:deep(.markdown-body h2) {
  font-size: 1.5em;
  border-bottom: 2px solid #000;
  padding-bottom: 0.3em;
  color: var(--pixel-text-primary);
}

:deep(.markdown-body h3) {
  font-size: 1.25em;
}

:deep(.markdown-body p) {
  margin-top: 0;
  margin-bottom: 16px;
}

:deep(.markdown-body pre) {
  margin-bottom: 16px;
  padding: 16px;
  overflow: auto;
  background-color: var(--pixel-bg-secondary);
  border-radius: 0;
  border: 2px solid #000;
}

:deep(.markdown-body code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
}

:deep(.markdown-body pre code) {
  padding: 0;
  font-size: 100%;
  background-color: transparent;
  border: 0;
}

:deep(.markdown-body img) {
  max-width: 100%;
  border-style: none;
  box-sizing: content-box;
}

/* 代码块复制按钮样式 */
:deep(.blog-content pre) {
  position: relative;
}

:deep(.copy-button) {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid #ddd;
  border-radius: 0;
  font-size: 14px;
  color: var(--pixel-text-muted);
  cursor: pointer;
  transition: all 0.3s;
  z-index: 10;
}

:deep(.copy-button:hover) {
  background-color: var(--pixel-bg-secondary);
  color: var(--pixel-primary-light);
}



.sidebar-card {
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  padding: 10px 5px;
  margin-bottom: 20px;
  box-shadow: 3px 3px 0 #000;
  border: 2px solid #000;
}

.card-title {
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.author-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.author-info {
  margin-left: 10px;
  flex: 1;
}

.author-bio {
  font-size: 15px;
  color: var(--pixel-text-muted);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;  
  -webkit-box-orient: vertical;
}

.author-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px 0;
  border-top: 1px solid #f0f2f5;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--pixel-text-primary);
}

.stat-label {
  font-size: 15px;
  color: var(--pixel-text-muted);
  margin-top: 4px;
}



.loading-skeleton {
  padding: 20px 0;
}

@media (max-width: 992px) {
  .detail-container {
    flex-direction: column;
  }
  
  .blog-sidebar {
    width: 100%;
  }
}

/* 操作卡片样式 */
.action-card {
  margin-bottom: 20px;
  padding: 10px;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.1s ease;
  border: 2px solid #000;
  background-color: var(--pixel-bg-card);
  min-height: 60px;
}

.action-item:hover {
  background-color: var(--pixel-bg-secondary);
  border-color: var(--pixel-primary);
  transform: translateY(-1px);
  box-shadow: 3px 3px 0 #000;
}

.full-width-item {
  grid-column: 1 / -1;
}

.action-icon {

  font-size: 20px;
  margin-bottom: 3px;
  color: var(--pixel-text-muted);
  transition: all 0.3s ease;
}

.action-icon.liked {
  color: var(--pixel-primary-light);
}

.action-icon.disliked {
  color: var(--pixel-red);
}

.action-icon.collected {
  color: var(--pixel-gold);
}

.action-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--pixel-text-primary);
  margin-bottom: 1px;
}

.action-label {
  font-size: 15px;
  color: var(--pixel-text-muted);
}

/* 目录样式 */
.toc-card {
  margin-bottom: 20px;
  max-height: 50vh;
  overflow: hidden;
  background-color: var(--pixel-bg-card);
  border: 2px solid #000;
}

.toc-header {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--pixel-text-primary);
  margin-bottom: 0;
  padding: 12px 15px;
  border-bottom: 2px solid #000;
  background-color: var(--pixel-primary);
}

.toc-header .icon {
  margin-right: 6px;
  color: #fff;
  font-size: 14px;
}

.toc-container {
  max-height: calc(50vh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  scroll-behavior: smooth;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin-bottom: 2px;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  margin: 0 8px 2px 8px;
}

.toc-item:hover {
  background-color: var(--pixel-bg-secondary);
}

.toc-item.toc-active {
  background-color: var(--pixel-primary) !important;
  border-left: 3px solid var(--pixel-gold) !important;
  position: relative;
  transform: translateX(2px);
  box-shadow: 2px 2px 0 #000;
}

.toc-item.toc-active a {
  color: #fff;
  font-weight: 600;
}

.toc-item a {
  display: block;
  padding: 6px 10px;
  color: var(--pixel-text-secondary);
  text-decoration: none;
  font-size: 15px;
  line-height: 1.3;
  transition: color 0.2s;
  min-height: 26px;
  
  /* 文本省略 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  /* Flex布局对齐 */
  display: flex;
  align-items: center;
}

.toc-item a:hover {
  color: var(--pixel-primary-light);
}

/* 滚动条美化 */
.toc-container::-webkit-scrollbar {
  width: 6px;
}

.toc-container::-webkit-scrollbar-track {
  background: var(--pixel-bg-secondary);
  border: 1px solid #000;
}

.toc-container::-webkit-scrollbar-thumb {
  background: var(--pixel-primary);
  border: 1px solid #000;
  transition: background 0.2s;
}

.toc-container::-webkit-scrollbar-thumb:hover {
  background: var(--pixel-primary-light);
}

/* 目录容器滚动优化 */
.toc-container {
  scroll-behavior: smooth;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: var(--pixel-primary) var(--pixel-bg-secondary); /* Firefox */
}

/* 确保标题有正确的ID定位 */
:deep(.content.markdown-body h1),
:deep(.content.markdown-body h2),
:deep(.content.markdown-body h3),
:deep(.content.markdown-body h4),
:deep(.content.markdown-body h5),
:deep(.content.markdown-body h6) {
  scroll-margin-top: 100px; /* 为固定头部留出空间 */
}

/* 评论抽屉样式 */
.comment-drawer-content {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.comment-stats {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #000;
  background-color: var(--pixel-bg-card);
  color: var(--pixel-text-primary);
}

.comment-stats .icon {
  margin-right: 8px;
  color: var(--pixel-primary);
  font-size: 18px;
}

.comment-input {
  padding: 20px;
  border-bottom: 2px solid #000;
  background-color: var(--pixel-bg-card);
}

.comment-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: var(--pixel-bg-card);
}

.comment-input .comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.comment-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;  /* 减小评论之间的间距 */
}

/* 回复模式相关样式 */
.reply-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--pixel-bg-card);
  padding: 6px 10px;
  border-radius: 0;
  margin-bottom: 8px;
  border: 2px solid #000;
}

.reply-tip {
  color: var(--pixel-text-primary);
  font-size: 15px;
}

.reply-tip strong {
  color: var(--pixel-primary);
}

.empty-comments {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

/* 中等屏幕：隐藏目录但保留侧边栏 */
@media (max-width: 1200px) {
  .toc-card {
    display: none;
  }
  
  .blog-sidebar-right {
    width: 140px !important;
    min-width: 140px;
  }
}

/* 小屏幕：移动端样式 */
@media (max-width: 992px) {
  .blog-content-main {
    padding: 0;
    width: 100%;
  }
  
  .blog-detail-page {
    padding: 0 10px;
  }
}

/* 移动端浮动操作按钮 */
.mobile-actions {
  position: fixed;
  right: 20px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.mobile-action-item {
  width: 50px;
  height: 50px;
  background: white;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #f0f2f5;
}

.mobile-action-item:hover {
  transform: scale(1.1);
  box-shadow: 4px 4px 0 #000;
}

.mobile-action-item .action-icon {
  font-size: 20px;
  color: var(--pixel-text-muted);
  margin-bottom: 2px;
}

.mobile-action-item .action-icon.liked {
  color: var(--pixel-primary-light);
}

.mobile-action-item .action-icon.collected {
  color: var(--pixel-gold);
}

.mobile-action-item .action-count {
  font-size: 14px;
  color: var(--pixel-text-muted);
  font-weight: 600;
  line-height: 1;
}

@media (max-width: 768px) {
  .blog-content-container {
    padding: 20px;
    border-radius: 0;
    box-shadow: none;
  }
  
  .blog-detail-page {
    padding: 0;
  }
  
  .mobile-actions {
    right: 15px;
    bottom: 60px;
  }
  
  .mobile-action-item {
    width: 45px;
    height: 45px;
  }
  
  .mobile-action-item .action-icon {
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .blog-content-container {
    padding: 15px;
  }
  
  .blog-title {
    font-size: 24px;
  }
  
  .blog-actions {
    flex-direction: column;
    gap: 10px;
  }
}

/* 未登录评论区样式 */
.login-tip-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: var(--pixel-bg-card);
  border-radius: 0;
  text-align: center;
  gap: 15px;
  border: 2px solid #000;
}

.login-tip {
  font-size: 14px;
  color: var(--pixel-text-primary);
  margin-bottom: 5px;
}
</style> 