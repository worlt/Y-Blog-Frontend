import request from "@/utils/request.js";

const URL = '/user/message';

/**
 * 创建私聊会话
 * @param {Number} targetUserId - 目标用户ID
 * @returns {Promise} - 返回包含会话ID的Promise
 */
export const createPrivateConversation = (targetUserId) => {
  return request.post(`${URL}/conversations/private/${targetUserId}`);
};

/**
 * 获取当前用户的会话列表
 * @returns {Promise} - 返回会话列表的Promise
 */
export const getConversations = () => {
  return request.get(`${URL}/getConversations`);
};

/**
 * 获取会话消息列表
 * @param {Number} conversationId - 会话ID
 * @param {Boolean} autoMarkRead - 是否自动标记为已读，默认为true
 * @returns {Promise} - 返回消息列表的Promise
 */
export const getConversationMessages = (conversationId, autoMarkRead = true) => {
  return request.get(`${URL}/getConversationMessages/${conversationId}?autoMarkRead=${autoMarkRead}`);
};

/**
 * 发送私聊消息
 * @param {Number} receiverId - 接收者ID
 * @param {String} content - 消息内容
 * @returns {Promise} - 返回Promise
 */
export const sendPrivateMessage = (receiverId, content) => {
  return request.post(`${URL}/send/private/${receiverId}?content=${encodeURIComponent(content)}`);
};

/**
 * 标记会话为已读
 * @param {Number} conversationId - 会话ID
 * @returns {Promise} - 返回Promise
 */
export const markConversationAsRead = (conversationId) => {
  return request.post(`${URL}/conversations/${conversationId}/read`);
};

/**
 * 从会话列表标记会话为已读
 * @param {Number} conversationId - 会话ID
 * @returns {Promise} - 返回Promise
 */
export const markConversationAsReadFromList = (conversationId) => {
  return request.post(`${URL}/conversations/list/read/${conversationId}`);
};

/**
 * 一键标记所有会话为已读
 * @returns {Promise} - 返回Promise
 */
export const markAllConversationsAsRead = () => {
  return request.post(`${URL}/conversations/read-all`);
};

/**
 * 获取未读消息数
 * @returns {Promise} - 返回未读消息数的Promise
 */
export const getUnreadCount = () => {
  return request.get(`${URL}/unread/count`);
};

/**
 * 撤回两分钟内的自己的信息
 * @param {Number} id - 消息ID
 * @returns {Promise} - 返回Promise
 */
export const retractMessage = (id) => {
  return request.put(`${URL}/retract/${id}`);
}; 