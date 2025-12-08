import { createRouter, createWebHistory } from "vue-router";
import { useTokenStore } from "@/stores/token.js";


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

// 路由守卫：未登录时重定向到登录页
router.beforeEach((to, from, next) => {
    const tokenStore = useTokenStore();
    const token = tokenStore.getToken();

    if (to.path !== '/login' && !token) {
        // 未登录且访问非登录页，重定向到登录页
        next('/login');
    } else if (to.path === '/login' && token) {
        // 已登录但访问登录页，重定向到首页
        next('/');
    } else {
        next();
    }
});

export default router