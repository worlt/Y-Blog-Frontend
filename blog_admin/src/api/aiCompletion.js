import request from "@/utils/request.js";

const URL = '/user/ai'; // 管理端可能也是复用用户端的接口，或者有独立的admin接口？
// 检查是否有Admin对应的AI接口。通常blog系统AI功能可能统一在user/ai。
// 这里暂时指向 /user/ai/completion，如果管理端有权限限制需要注意。
// 假设管理员也是用户，或者接口权限放开了。

export const getCompletion = (data) => {
    return request.post(`${URL}/completion`, data);
};
