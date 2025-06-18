import request from "@/utils/request.js";

const URL = '/user/comment';

/**
 * 获取博客的所有评论
 * @param {Number} blogId - 博客id
 * @returns {Promise} - 返回评论列表的Promise
 */
export const getCommentsByBlogId = (blogId) => {
  return request.get(`${URL}/getByBlogId/${blogId}`);
};

/**
 * 添加评论
 * @param {Object} data - 评论信息，包括blogId、content、userId等
 * @returns {Promise} - 返回Promise
 */
export const addComment = (data) => {
  return request.post(`${URL}/add`, data);
};

/**
 * 删除评论
 * @param {Number} id - 评论id
 * @returns {Promise} - 返回Promise
 */
export const deleteComment = (id) => {
  return request.delete(`${URL}/deleteById/${id}`);
};

/**
 * 点赞评论
 * @param {Number} id - 评论id
 * @returns {Promise} - 返回Promise
 */
export const likeComment = (id) => {
  return request.post(`${URL}/like/${id}`);
};

/**
 * 点踩评论
 * @param {Number} id - 评论id
 * @returns {Promise} - 返回Promise
 */
export const dislikeComment = (id) => {
  return request.post(`${URL}/dislike/${id}`);
};

/**
 * 获取当前用户的所有评论
 * @returns {Promise} - 返回评论列表的Promise
 */
export const getMyComments = () => {
  return request.get(`${URL}/getMyComments`);
}; 