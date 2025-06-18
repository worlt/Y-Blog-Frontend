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