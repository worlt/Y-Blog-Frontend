import request from '@/utils/request'

// 添加建议
export function addSuggestion(data) {
    return request({
        url: '/user/suggestion',
        method: 'post',
        data
    })
}

// 获取建议列表
export function getSuggestionList(params) {
    return request({
        url: '/user/suggestion/list',
        method: 'get',
        params
    })
}

// 获取建议详情
export function getSuggestionDetail(id) {
    return request({
        url: `/user/suggestion/detail/${id}`,
        method: 'get'
    })
}

// 投票
export function voteSuggestion(data) {
    return request({
        url: '/user/suggestion/vote',
        method: 'post',
        data
    })
}
