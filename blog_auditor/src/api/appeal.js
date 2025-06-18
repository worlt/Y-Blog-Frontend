import request from "@/utils/request.js";

const URL = '/auditor/appeal'

export const appealPageQuery = (params) => {
    return request.get(URL + '/page', {params})
}

export const getAppealById = (id) => {
    return request.get(URL + `/getById/${id}`)
}

export const handleAppeal = (data) => {
    return request.put(URL + '/handle', data)
}

export const inProcess = (id) => {
    return request.put(URL + `/inProcess/${id}`)
}
