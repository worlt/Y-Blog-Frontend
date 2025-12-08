import request from '@/utils/request'

/**
 * 获取所有标签
 * @returns {Promise}
 */
export function getAllTags() {
  return request({
    url: '/user/tag-category/getAllTags',
    method: 'get'
  })
}

/**
 * 根据ID获取标签
 * @param {number} id - 标签ID
 * @returns {Promise}
 */
export function getTagById(id) {
  return request({
    url: `/user/tag-category/getTagById/${id}`,
    method: 'get'
  })
}

/**
 * 获取热门标签
 * @param {number} limit - 限制数量，可选参数
 * @returns {Promise}
 */
export function getHotTags(limit) {
  return request({
    url: '/user/tag-category/getHotTags',
    method: 'get',
    params: { limit }
  })
}
