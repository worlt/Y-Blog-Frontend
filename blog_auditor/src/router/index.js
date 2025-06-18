import {createRouter, createWebHistory} from "vue-router";


const routes = [
    {
        path: '/login',
        component: () => import('@/views/Login.vue')
    },
    {
        path: '/',
        component: () => import('@/views/Home.vue'),
        children: [
            {
                path: '/audit/blog',
                component: () => import('@/views/audit/BlogAuditor.vue')
            },
            {
                path: '/report/blog',
                component: () => import('@/views/report/BlogReport.vue')
            },
            {
                path: '/report/comment',
                component: () => import('@/views/report/CommentReport.vue')
            },
            {
                path: '/report/user',
                component: () => import('@/views/report/UserReport.vue')
            },
            {
                path: '/appeal/user',
                component: () => import('@/views/appeal/Appeal.vue')
            },
            {
                path: '/setting/user',
                component: () => import('@/views/setting/User.vue')
            }
        ],
        redirect: '/audit/blog'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes: routes
})

export default router