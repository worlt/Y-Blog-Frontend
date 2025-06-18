import request from "@/utils/request.js";

const URL = '/auditor/commentReport'

export const commentReportPageQuery = (params) => {
    return request.get(URL + '/page', {params})
}

export const getCommentReportById = (id) => {
    return request.get(URL + `/getById/${id}`)
}

// 获取评论详情
export const getCommentById = (id) => {
    return request.get(URL + `/getCommentById/${id}`)
}

export const handleCommentReport = (data) => {
    return request.put(URL + '/handle', data)
}

