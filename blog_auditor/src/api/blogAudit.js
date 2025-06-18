import request from "@/utils/request.js";

const URL = '/auditor/blogAudit'

export const blogAuditPageQuery = (params) => {
    return request.get(URL + '/page', {params})
}

export const getBlogById = (id) => {
    return request.get(URL + `/getById/${id}`)
}

export const handleBlogAudit = (data) => {
    return request.put(URL + '/handle', data)
}

