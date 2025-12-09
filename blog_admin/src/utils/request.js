import axios from "axios";
import { ElMessage } from "element-plus";
import { useTokenStore } from "@/stores/token.js";
import router from "@/router/index.js";
import { createErrorHandler, ERROR_STRATEGY, handleRequestError } from "@common/utils/errorHandler.js";

const baseURL = '/api';
const instance = axios.create({ baseURL });

// 创建专用的错误处理器 - 管理后台使用跳转策略
const errorHandler = createErrorHandler({
    strategy: ERROR_STRATEGY.REDIRECT,
    router: router,
    clearAuth: () => {
        const tokenStore = useTokenStore();
        tokenStore.removeToken();
    }
});

// 请求拦截器
instance.interceptors.request.use(
    (config) => {
        // 请求前的回调
        // 添加token
        const tokenStore = useTokenStore();
        const token = tokenStore.getToken();

        if (token) {
            config.headers.adminToken = token;
        }
        return config;
    },
    (err) => {
        // 请求错误回调 - 使用统一错误处理
        return handleRequestError(err);
    }
)

// 响应拦截器
instance.interceptors.response.use(
    result => {
        // 使用统一的业务响应处理
        return errorHandler.handleBusinessResponse(result);
    },
    err => {
        // 检查是否为401错误或400错误中的token过期
        if (err.response) {
            const status = err.response.status;
            const responseData = err.response.data;
            const errorMsg = responseData && responseData.msg ? responseData.msg : '';
            
            // token过期相关的错误消息
            const tokenExpiredMessages = [
                '请重新登录',
                '登录状态已过期',
                '用户未登录',
                'token已过期',
                '无效的token',
                'JWT令牌已过期',
                '登录已过期',
                '身份验证失败'
            ];
            
            // 如果是401或400且包含token过期消息
            if (status === 401 || (status === 400 && errorMsg && tokenExpiredMessages.some(msg => errorMsg.includes(msg)))) {
                const tokenStore = useTokenStore();
                tokenStore.removeToken();
                // 跳转到登录页
                router.push('/login').catch(() => {
                    // 忽略路由重复导航错误
                });
            }
        }
        // 使用统一的HTTP错误处理
        return errorHandler.handleResponseError(err);
    }
)

export default instance;