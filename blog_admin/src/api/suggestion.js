import request from '@/utils/request'

// 获取建议列表
export function getSuggestionList(params) {
    return request({
        url: '/admin/suggestion/list',
        method: 'get',
        params
    })
}

// 修改建议状态
export function updateSuggestionStatus(id, status) {
    return request({
        url: `/admin/suggestion/status/${id}/${status}`,
        method: 'put'
    })
}

// 删除建议
export function deleteSuggestion(id) {
    return request({
        url: `/admin/suggestion/${id}`,
        method: 'delete'
    })
}
