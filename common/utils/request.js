import axios from 'axios';

// 创建一个基础的、不带拦截器的axios实例
// 主要用于公共组件中不需要身份验证的API调用，例如验证码
const baseURL = '/api';
const instance = axios.create({ baseURL });

// 响应拦截器，仅提取 data 部分，不做任何错误处理
instance.interceptors.response.use(
  response => {
    // 假设所有成功的响应都包含 data 字段
    return response.data;
  },
  error => {
    // 对于网络错误或非2xx响应，直接拒绝
    // 让调用方（例如 captcha.js）自行处理
    console.error('公共请求发生错误:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default instance;
