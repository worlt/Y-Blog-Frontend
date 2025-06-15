import request from "@/utils/request.js";

/**
 * 审核员分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getAuditorPage = (params) => {
  return request.get('/admin/auditor/page', { params });
};

/**
 * 根据ID获取审核员详情
 * @param {Number} id - 审核员ID
 * @returns {Promise} - 返回审核员详情的Promise
 */
export const getAuditorById = (id) => {
  return request.get(`/admin/auditor/getById/${id}`);
};

/**
 * 新增审核员
 * @param {Object} data - 审核员信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addAuditor = (data) => {
  return request.post('/admin/auditor/add', data);
};

/**
 * 更新审核员
 * @param {Object} data - 审核员更新信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const updateAuditor = (data) => {
  return request.put('/admin/auditor/update', data);
};

/**
 * 删除审核员
 * @param {Number} id - 审核员ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteAuditor = (id) => {
  return request.delete(`/admin/auditor/deleteById/${id}`);
};

/**
 * 设置审核员状态
 * @param {Number} id - 审核员ID
 * @param {Number} status - 状态(0-启用，1-禁用)
 * @returns {Promise} - 返回操作结果的Promise
 */
export const setAuditorStatus = (id, status) => {
  return request.put(`/admin/auditor/status/${status}?id=${id}`);
}; 