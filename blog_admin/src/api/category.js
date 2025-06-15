import request from "@/utils/request.js";

/**
 * 获取所有分类
 * @returns {Promise} - 返回分类列表的Promise
 */
export const listAllCategories = () => {
  return request.get('/admin/tag-category/getAllCategories');
};

/**
 * 分类分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回分页结果的Promise
 */
export const getCategoryPage = (params) => {
  return request.get('/admin/tag-category/categoryPage', { params });
};

/**
 * 根据ID获取分类详情
 * @param {Number} id - 分类ID
 * @returns {Promise} - 返回分类详情的Promise
 */
export const getCategoryById = (id) => {
  return request.get(`/admin/tag-category/getCategoryById/${id}`);
};

/**
 * 新增分类
 * @param {Object} data - 分类信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addCategory = (data) => {
  return request.post('/admin/tag-category/addCategory', data);
};

/**
 * 更新分类
 * @param {Object} data - 分类更新信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const updateCategory = (data) => {
  return request.put('/admin/tag-category/updateCategory', data);
};

/**
 * 删除分类
 * @param {Number} id - 分类ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteCategory = (id) => {
  return request.delete(`/admin/tag-category/deleteCategory/${id}`);
}; 