import request from "@/utils/request.js";

const URL = '/auditor/userReport'

export const userReportPageQuery = (params) => {
    return request.get(URL + '/page', {params})
}

export const getUserReportById = (id) => {
    return request.get(URL + `/getById/${id}`)
}

// 获取用户详情
export const getUserById = (id) => {
    return request.get(URL + `/getUserById/${id}`)
}

export const handleUserReport = (data) => {
    return request.put(URL + '/handle', data)
}

