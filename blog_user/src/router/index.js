import {createRouter, createWebHistory} from "vue-router";
import { useTokenStore } from '@/stores/token.js';

const routes = [
    {
        path: '/',
        component: () => import('@/views/Home.vue'),
        children: [
            {
                path: '',  // 默认子路由
                redirect: '/index'
            },
            {
                path: '/index',
                component: () => import('@/views/Index.vue')
            },
            {
                path: '/auth',
                component: () => import('@/views/UserAuth.vue'),
                meta: { hideFromHistory: true } // 标记此页面不应在历史记录中保留
            },
            {
                path: '/blogs',
                component: () => import('@/views/BlogList.vue')
            },
            {
                path: '/blog/:id',
                component: () => import('@/views/BlogDetail.vue')
            },
            {
                path: '/write',
                component: () => import('@/views/WriteBlog.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/edit/:id',
                component: () => import('@/views/WriteBlog.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/my-blogs',
                component: () => import('@/views/MyBlogs.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/liked',
                component: () => import('@/views/LikedBlogs.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/collections',
                component: () => import('@/views/Collections.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/my-collections',
                component: () => import('@/views/MyCollections.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/my-disliked-blogs',
                component: () => import('@/views/DislikedBlogs.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/my-follows',
                component: () => import('@/views/FollowedUsers.vue'),
                name: 'followed-users',
                meta: { requiresAuth: true }
            },
            {
                path: '/my-followers',
                component: () => import('@/views/Followers.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/my-profile',
                component: () => import('@/views/Profile.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/user/:userId',
                component: () => import('@/views/UserProfile.vue'),
                name: 'user-profile'
            },
            {
                path: '/search',
                component: () => import('@/views/Search.vue')
            },
            {
                path: '/messages',
                component: () => import('@/views/Messages.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: '/history',
                component: () => import('@/views/History.vue')
            },
            {
                path: '/appeal',
                component: () => import('@/views/Appeal.vue'),
                meta: { requiresAuth: true }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes: routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
    const tokenStore = useTokenStore();
    const isLoggedIn = !!tokenStore.getToken();
    
    // 如果已登录且要访问登录页，重定向到首页
    if (isLoggedIn && to.path === '/auth') {
        next('/');
        return;
    }
    
    // 如果需要登录认证
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!isLoggedIn) {
            // 如果未登录，重定向到登录页
            next({
                path: '/auth',
                query: { redirect: to.fullPath } // 登录成功后重定向回来
            });
        } else {
            next(); // 已登录，正常导航
        }
    } else {
        next(); // 不需要认证的页面，正常导航
    }
})

// 全局后置守卫
router.afterEach((to, from) => {
    console.log(`路由变化: ${from.path} -> ${to.path}`);
    
    // 如果是从登录页成功跳转，清理历史记录
    if (from.path === '/auth') {
        // 使用 replaceState 清理历史记录
        if (window.history.state && window.history.state.forward) {
            window.history.replaceState(null, '', to.fullPath);
        }
    }
    
    // 在路由变化后发送一个自定义事件，用于通知组件刷新
    window.dispatchEvent(new CustomEvent('router-change', {
        detail: { to, from }
    }));
})

export default router