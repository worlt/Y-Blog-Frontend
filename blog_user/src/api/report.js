import request from "@/utils/request.js";

const URL = '/user/report';

/**
 * 举报博客
 * @param {Object} data - 举报信息，包括blogId、reason等
 * @returns {Promise} - 返回Promise
 */
export const reportBlog = (data) => {
  return request.post(`${URL}/blog`, data);
};

/**
 * 举报评论
 * @param {Object} data - 举报信息，包括commentId、reason等
 * @returns {Promise} - 返回Promise
 */
export const reportComment = (data) => {
  return request.post(`${URL}/comment`, data);
};

/**
 * 举报用户
 * @param {Object} data - 举报信息，包括userId、reason等
 * @returns {Promise} - 返回Promise
 */
export const reportUser = (data) => {
  return request.post(`${URL}/user`, data);
}; 