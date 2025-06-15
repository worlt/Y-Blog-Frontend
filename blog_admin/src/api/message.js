import request from "@/utils/request.js";

/**
 * 消息分页查询
 * @param {Object} params - 查询参数 (content, page, pageSize)
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getMessagePage = (params) => {
  return request.get('/admin/message/page', { params });
};

/**
 * 根据ID获取消息详情
 * @param {Number} id - 消息ID
 * @returns {Promise} - 返回消息详情的Promise
 */
export const getMessageById = (id) => {
  return request.get(`/admin/message/getById/${id}`);
};

/**
 * 新增消息
 * @param {Object} data - 消息信息 (content, senderId, receiverId, conversationId, messageType)
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addMessage = (data) => {
  return request.post('/admin/message/add', data);
};

/**
 * 删除消息
 * @param {Number} id - 消息ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteMessage = (id) => {
  return request.delete(`/admin/message/deleteById/${id}`);
}; 