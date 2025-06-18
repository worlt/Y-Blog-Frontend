import {createRouter, createWebHistory} from "vue-router";

//定义路由
const routes = [
    {
        path: '/login',
        component: () => import('@/views/Login.vue')
    },
    {
        path: '/',
        component: () => import('@/views/Home.vue'),
        // 子路由
        children: [
            // 内容管理
            {
                path: '/content/blog',
                component: () => import('@/views/content/Blog.vue'),
                meta: { title: '博客管理' }
            },
            {
                path: '/content/comment',
                component: () => import('@/views/content/Comment.vue'),
                meta: { title: '评论管理' }
            },
            {
                path: '/content/tag',
                component: () => import('@/views/content/Tag.vue'),
                meta: { title: '标签管理' }
            },
            {
                path: '/content/category',
                component: () => import('@/views/content/Category.vue'),
                meta: { title: '分类管理' }
            },
            // 用户中心
            {
                path: '/user/admin',
                component: () => import('@/views/user/Admin.vue'),
                meta: { title: '管理员管理' }
            },
            {
                path: '/user/audit',
                component: () => import('@/views/user/Auditor.vue'),
                meta: { title: '审核员管理' }
            },
            {
                path: '/user/user',
                component: () => import('@/views/user/User.vue'),
                meta: { title: '用户管理' }
            },
            // 交互管理
            {
                path: '/interaction/message',
                component: () => import('@/views/interaction/Message.vue'),
                meta: { title: '消息管理' }
            },
            {
                path: '/interaction/audit-record',
                component: () => import('@/views/interaction/AuditRecord.vue'),
                meta: { title: '审核记录' }
            },
            // 系统配置
            {
              path: '/config/personal',
              component: () => import('@/views/config/Personal.vue'),
              meta: { title: '个人中心'}
            },
            {
                path: '/config/permission',
                component: () => import('@/views/config/Permission.vue'),
                meta: { title: '用户权限配置' }
            },
            {
                path: '/config/settings',
                component: () => import('@/views/config/Settings.vue'),
                meta: { title: '网站基础设置' }
            }
        ],
        redirect: '/content/blog'
    }
]

// 创建路由
const router = createRouter({
    history: createWebHistory(),
    routes: routes
})

export default router