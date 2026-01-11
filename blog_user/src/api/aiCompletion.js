import request from "@/utils/request.js";

const URL = '/user/ai';

/**
 * 获取AI内容补全建议
 * @param {Object} data - 请求数据
 * @param {string} data.content - 当前编辑器内容
 * @param {string} data.title - 博客标题（可选）
 * @returns {Promise} - 返回AI补全结果的Promise
 * @author worlt
 */
export const getCompletion = (data) => {
    return request.post(`${URL}/completion`, data);
};
