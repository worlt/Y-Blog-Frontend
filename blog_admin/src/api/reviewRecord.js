import request from "@/utils/request.js";

/**
 * 审核记录分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getReviewRecordPage = (params) => {
  return request.get('/admin/reviewRecord/page', { params });
};

/**
 * 根据ID获取审核记录详情
 * @param {Number} id - 审核记录ID
 * @returns {Promise} - 返回审核记录详情的Promise
 */
export const getReviewRecordById = (id) => {
  return request.get(`/admin/reviewRecord/${id}`);
};