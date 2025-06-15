import request from "@/utils/request.js";

/**
 * 博客文章分页查询
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回查询结果的Promise
 */
export const blogPage = (params) => {
  return request.get('/admin/blog/page', { params });
};

/**
 * 新增博客文章
 * @param {Object} data - 博客信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const addBlog = (data) => {
  return request.post('/admin/blog/add', data);
};

/**
 * 更新博客文章
 * @param {Object} data - 博客更新信息
 * @returns {Promise} - 返回操作结果的Promise
 */
export const updateBlog = (data) => {
  return request.put('/admin/blog/update', data);
};

/**
 * 根据ID获取博客详情
 * @param {Number} id - 博客ID
 * @returns {Promise} - 返回博客详情的Promise
 */
export const getBlogById = (id) => {
  return request.get(`/admin/blog/getById/${id}`);
};

/**
 * 根据ID删除博客
 * @param {Number} id - 博客ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const deleteBlog = (id) => {
  return request.delete(`/admin/blog/deleteById/${id}`);
};

/**
 * 设置博客置顶状态
 * @param {Number} id - 博客ID
 * @param {Number} isTop - 置顶状态(0-不置顶、1-置顶)
 * @returns {Promise} - 返回操作结果的Promise
 */
export const setIsTop = (id, isTop) => {
  return request.put(`/admin/blog/setIsTop/${isTop}?id=${id}`);
};
