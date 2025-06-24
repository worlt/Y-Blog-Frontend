import request from "@/utils/request.js";

const URL = '/user/appeal';

/**
 * 提交申诉
 * @param {Object} data - 申诉信息
 * @returns {Promise} - 返回Promise
 */
export const appealSubmit = (data) => {
    return request.post(`${URL}/submit`, data);
};

/**
 * 查询申诉状态
 * @param {Number} id - 申诉ID
 * @returns {Promise} - 返回Promise
 */
export const getAppealById = (id) => {
    return request.get(`${URL}/${id}`);
};