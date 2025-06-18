import request from "@/utils/request.js";

const URL = '/user/blog';

/**
 * 分页查询博客
 * @param {Object} params - 查询参数，包括page、pageSize、status等
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getBlogPage = (params) => {
  return request.get(`${URL}/page`, { params });
};

/**
 * 新增博客文章
 * @param {Object} data - 博客信息
 * @returns {Promise} - 返回Promise
 */
export const addBlog = (data) => {
  return request.post(`${URL}/add`, data);
};

/**
 * 根据id删除博客
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回Promise
 */
export const deleteBlogById = (id) => {
  return request.delete(`${URL}/deleteById/${id}`);
};

/**
 * 编辑博客
 * @param {Object} data - 博客信息
 * @returns {Promise} - 返回Promise
 */
export const updateBlog = (data) => {
  return request.put(`${URL}/update`, data);
};

/**
 * 查询博客详情
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回博客详情的Promise
 */
export const getBlogById = (id) => {
  return request.get(`${URL}/getById/${id}`);
};

/**
 * 获取我的博客列表
 * @returns {Promise} - 返回我的博客列表的Promise
 */
export const getMyBlogs = () => {
  return request.get(`${URL}/getMyBlogs`);
};

/**
 * 点赞博客
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回Promise
 */
export const likeBlog = (id) => {
  return request.post(`${URL}/like/${id}`);
};

/**
 * 点踩博客
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回Promise
 */
export const dislikeBlog = (id) => {
  return request.post(`${URL}/dislike/${id}`);
};

/**
 * 收藏/取消收藏博客
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回Promise
 */
export const collectBlog = (id) => {
  return request.post(`${URL}/collect/${id}`);
};

/**
 * 获取收藏列表
 * @returns {Promise} - 返回收藏列表的Promise
 */
export const getCollections = () => {
  return request.get(`${URL}/getCollections`);
};

/**
 * 检查是否已收藏博客
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回是否已收藏的Promise
 */
export const isCollected = (id) => {
  return request.get(`${URL}/isCollected/${id}`);
};

/**
 * 分享博客
 * @param {Number} id - 博客id
 * @param {String} platform - 分享平台
 * @returns {Promise} - 返回Promise
 */
export const shareBlog = (id, platform) => {
  return request.post(`${URL}/shareBlog/${id}?platform=${platform}`);
};

/**
 * 获取博客分享统计
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回分享统计的Promise
 */
export const getShareStatistics = (id) => {
  return request.get(`${URL}/getShareStatistics/${id}`);
};

/**
 * 获取支持的分享平台
 * @returns {Promise} - 返回平台列表的Promise
 */
export const getSupportedPlatforms = () => {
  return request.get(`${URL}/getSupportedPlatforms`);
};

/**
 * 获取博客分享记录
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回分享记录的Promise
 */
export const getBlogShares = (id) => {
  return request.get(`${URL}/getBlogShares/${id}`);
};

/**
 * 查看博客详情并记录浏览量
 * @param {Number} id - 博客id
 * @returns {Promise} - 返回博客详情的Promise
 */
export const viewBlog = (id) => {
  return request.get(`${URL}/viewBlog/${id}`);
};

/**
 * 获取用户浏览历史
 * @returns {Promise} - 返回浏览历史的Promise
 */
export const getViewHistory = () => {
  return request.get(`${URL}/viewHistory`);
}; 