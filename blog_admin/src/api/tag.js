import request from "@/utils/request.js";

/**
 * 获取所有标签
 * @returns {Promise} - 返回标签列表的Promise
 */
export const listAllTags = () => {
  return request.get('/admin/tag-category/getAllTags');
};

/**
 * 标签分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getTagPage = (params) => {
  return request.get('/admin/tag-category/tagPage', { params });
};

/**
 * 根据ID获取标签详情
 * @param {Number} id - 标签ID
 * @returns {Promise} - 返回标签详情的Promise
 */
export const getTagById = (id) => {
  return request.get(`/admin/tag-category/getTagById/${id}`);
};

/**
 * 新增标签
 * @param {Object} data - 标签信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addTag = (data) => {
  return request.post('/admin/tag-category/addTag', data);
};

/**
 * 更新标签
 * @param {Object} data - 标签更新信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const updateTag = (data) => {
  return request.put('/admin/tag-category/updateTag', data);
};

/**
 * 删除标签
 * @param {Number} id - 标签ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteTag = (id) => {
  return request.delete(`/admin/tag-category/deleteTag/${id}`);
}; 