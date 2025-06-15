import request from "@/utils/request.js";

export const adminLogin = (loginData) => {
    return request.post('/admin/admin/login', loginData)
}

export const adminLogout = () => {
    return request.post('/admin/admin/logout')
}

export const getById = (id) => {
    return request.get(`/admin/admin/getById/${id}`)
}

// 更新管理员信息
export const updateAdmin = (adminData) => {
    return request.put('/admin/admin/update', adminData)
}

// 修改管理员密码
export const updatePassword = (data) => {
    return request.put('/admin/admin/updatePassword', data)
}

// 发送邮箱验证码
export const sendCode = (email) => {
    return request.post(`/admin/admin/sendCode?email=${email}`)
}

// 通过邮箱验证码重置密码
export const resetPasswordByEmail = (data) => {
    return request.post('/admin/admin/resetPassword', data)
}

// 分页查询管理员列表
export const getAdminPage = (params) => {
    return request.get('/admin/admin/page', { params })
}

// 新增管理员
export const addAdmin = (adminData) => {
    return request.post('/admin/admin/add', adminData)
}

// 启用禁用管理员
export const setAdminStatus = (id, status) => {
    return request.put(`/admin/admin/status/${status}?id=${id}`)
}

// 删除管理员
export const deleteAdmin = (id) => {
    return request.delete(`/admin/admin/deleteById/${id}`)
}