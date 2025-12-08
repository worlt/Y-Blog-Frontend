import request from '@/utils/request'

/**
 * 获取所有分类
 * @returns {Promise}
 */
export function getAllCategories() {
  return request({
    url: '/user/tag-category/getAllCategories',
    method: 'get'
  })
}

/**
 * 根据ID获取分类
 * @param {number} id - 分类ID
 * @returns {Promise}
 */
export function getCategoryById(id) {
  return request({
    url: `/user/tag-category/getCategoryById/${id}`,
    method: 'get'
  })
}

