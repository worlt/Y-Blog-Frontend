import request from "@/utils/request.js";

const URL = '/user/user'

/**
 * 发送邮箱验证码
 * @param {String} email - 邮箱地址
 * @returns {Promise} - 返回Promise
 */
export const sendVerificationCode = (email) => {
  return request.post(`${URL}/sendCode?email=${email}`);
};

/**
 * 邮箱验证码注册
 * @param {Object} data - 注册信息，包括email、code、password、username等
 * @returns {Promise} - 返回Promise
 */
export const register = (data) => {
  return request.post(`${URL}/register`, data);
};

/**
 * 邮箱密码登录
 * @param {Object} data - 登录信息，包括email和password
 * @returns {Promise} - 返回包含用户信息和token的Promise
 */
export const loginByPassword = (data) => {
  return request.post(`${URL}/login/password`, data);
};

/**
 * 邮箱验证码登录
 * @param {Object} data - 登录信息，包括email和code
 * @returns {Promise} - 返回包含用户信息和token的Promise
 */
export const loginByCode = (data) => {
  return request.post(`${URL}/login/code`, data);
};

/**
 * 找回密码
 * @param {Object} data - 重置密码信息，包括email、code和新的password
 * @returns {Promise} - 返回Promise
 */
export const resetPassword = (data) => {
  return request.post(`${URL}/resetPassword`, data);
};

/**
 * 编辑用户信息
 * @param {Object} data - 用户信息
 * @returns {Promise} - 返回Promise
 */
export const updateUserInfo = (data) => {
  return request.put(`${URL}/update`, data);
};

/**
 * 根据id查询用户
 * @param {Number} id - 用户id
 * @returns {Promise} - 返回包含用户信息的Promise
 */
export const getUserById = (id) => {
  return request.get(`${URL}/getById/${id}`);
};

/**
 * 关注/取消关注用户
 * @param {Number} id - 用户id
 * @returns {Promise} - 返回Promise
 */
export const followUser = (id) => {
  return request.post(`${URL}/follow/${id}`);
};

/**
 * 获取用户关注列表
 * @param {Number} userId - 用户id，可选，不传则获取当前登录用户的关注列表
 * @returns {Promise} - 返回包含关注列表的Promise
 */
export const getFollows = (userId) => {
  return request.get(`${URL}/follows${userId ? `?userId=${userId}` : ''}`);
};

/**
 * 获取用户粉丝列表
 * @param {Number} userId - 用户id，可选，不传则获取当前登录用户的粉丝列表
 * @returns {Promise} - 返回包含粉丝列表的Promise
 */
export const getFans = (userId) => {
  return request.get(`${URL}/fans${userId ? `?userId=${userId}` : ''}`);
};

/**
 * 检查是否已关注用户
 * @param {Number} userId - 用户id
 * @returns {Promise} - 返回包含是否已关注的Promise
 */
export const isFollowed = (userId) => {
  return request.get(`${URL}/isFollowed/${userId}`);
};

/**
 * 获取用户分享记录
 * @param {Number} userId - 用户id，可选，不传则获取当前登录用户的分享记录
 * @returns {Promise} - 返回包含分享记录的Promise
 */
export const getUserShares = (userId) => {
  return request.get(`${URL}/shares${userId ? `?userId=${userId}` : ''}`);
};

