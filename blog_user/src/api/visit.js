import instance from "@/utils/request.js";

// 记录网站访问
export function recordVisit() {
    return instance.post('/visit')
}
