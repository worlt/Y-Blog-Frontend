import request from "@/utils/request.js";

/**
 * 评论分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getCommentPage = (params) => {
  return request.get('/admin/comment/page', { params });
};

/**
 * 根据ID获取评论详情
 * @param {Number} id - 评论ID
 * @returns {Promise} - 返回评论详情的Promise
 */
export const getCommentById = (id) => {
  return request.get(`/admin/comment/getById/${id}`);
};

/**
 * 新增评论
 * @param {Object} data - 评论信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addComment = (data) => {
  return request.post('/admin/comment/add', data);
};

/**
 * 删除评论
 * @param {Number} id - 评论ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteComment = (id) => {
  return request.delete(`/admin/comment/deleteById/${id}`);
}; 