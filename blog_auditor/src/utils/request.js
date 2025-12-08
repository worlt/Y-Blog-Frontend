import axios from "axios";
import { useTokenStore } from "@/stores/token.js";
import { ElMessage } from "element-plus";
import router from "@/router/index.js";
import { createErrorHandler, ERROR_STRATEGY, handleRequestError } from "@common/utils/errorHandler.js";

const baseURL = '/api';
const instance = axios.create({ baseURL });

// 创建专用的错误处理器 - 审核后台使用跳转策略
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
        const tokenStore = useTokenStore();
        const token = tokenStore.getToken();

        if (token) {
            config.headers.auditorToken = token;
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
        // 使用统一的HTTP错误处理
        return errorHandler.handleResponseError(err);
    }
)

export default instance;