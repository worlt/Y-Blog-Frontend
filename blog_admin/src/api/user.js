import request from "@/utils/request.js";

/**
 * 用户分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getUserPage = (params) => {
  return request.get('/admin/user/page', { params });
};

/**
 * 根据ID获取用户详情
 * @param {Number} id - 用户ID
 * @returns {Promise} - 返回用户详情的Promise
 */
export const getUserById = (id) => {
  return request.get(`/admin/user/getById/${id}`);
};

/**
 * 新增用户
 * @param {Object} data - 用户信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addUser = (data) => {
  return request.post('/admin/user/add', data);
};

/**
 * 更新用户
 * @param {Object} data - 用户更新信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const updateUser = (data) => {
  return request.put('/admin/user/update', data);
};

/**
 * 删除用户
 * @param {Number} id - 用户ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteUser = (id) => {
  return request.delete(`/admin/user/deleteById/${id}`);
};

/**
 * 启用/禁用用户
 * @param {Number} id - 用户ID
 * @param {Number} status - 状态(0-启用，1-禁用)
 * @returns {Promise} - 返回操作结果的Promise
 */
export const setUserStatus = (id, status) => {
  return request.put(`/admin/user/status/${status}?id=${id}`);
}; 