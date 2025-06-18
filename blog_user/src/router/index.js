import {createRouter, createWebHistory} from "vue-router";

const routes = [
    {
        path: 'userAuth',
        component: () => import('@/views/UserAuth.vue')
    },
    {
        path: '/',
        component: () => import('@/views/Home.vue'),
        children: [
            {
                path: '/index',
                component: () => import('@/views/Index.vue')
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes: routes
})

export default router