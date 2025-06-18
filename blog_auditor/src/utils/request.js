import axios from "axios";
import {useTokenStore} from "@/strores/token.js";
import {ElMessage} from "element-plus";
import router from "@/router/index.js";


const baseURL = '/api';
const instance = axios.create({baseURL});

instance.interceptors.request.use(
    (config) => {
        const tokenStore = useTokenStore();

        if (tokenStore.token) {
            config.headers.auditorToken = tokenStore.token;
        }
        return config;
    },
    (err) => {
        return Promise.reject(err);
    }
)

instance.interceptors.response.use(
    result => {
        if (result.data.code === 0) {
            return result.data;
        }
        ElMessage.error(result.data.msg ? result.data.msg : '服务异常')
        return Promise.reject(result.data)
    },
    err => {
        if (err.response.status === 401) {
            ElMessage.error('请先登录')
            router.push('/login')
        } else {
            ElMessage.error('服务异常')
        }
        return Promise.reject(err)
    }
)

export default instance;