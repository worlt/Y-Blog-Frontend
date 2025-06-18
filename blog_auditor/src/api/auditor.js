import request from "@/utils/request.js";

const URL = '/auditor/auditor'

export const auditorLogin = (loginData) => {
    return request.post(URL + '/login', loginData)
}

export const auditorLogout = () => {
    return request.post(URL + '/logout')
}

export const updateAuditor = (data) => {
    return request.put(URL + '/update', data)
}

export const getDetail = () => {
    return request.get(URL + '/getDetail')
}

export const updatePassword = (data) => {
    return request.put(URL + '/updatePassword', data)
}

export const sendCode = (email) => {
    return request.post(URL + `/sendCode?email=${email}`)
}

export const resetPasswordByEmail = (data) => {
    return request.post(URL + '/resetPassword', data)
}