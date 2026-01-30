import request from "@/utils/request.js";

const URL = '/auditor/blogReport'

export const blogReportPageQuery = (params) => {
    return request.get(URL + '/page', {params})
}

export const getBlogById = (id) => {
    return request.get(URL + `/getById/${id}`)
}

export const handleBlogReport = (data) => {
    return request.put(URL + '/handle', data)
}

// 标记为处理中
export const markBlogReportAsInProcess = (id) => {
    return request.put(URL + `/inProcess/${id}`)
}
