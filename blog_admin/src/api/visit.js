import instance from "@/utils/request.js";

// 获取访问统计
export function getVisitStats(days) {
    return instance.get('/admin/visit/stats', {
        params: { days }
    })
}

// 获取最近访问记录
export function getVisitList(limit) {
    return instance.get('/admin/visit/list', {
        params: { limit }
    })
}

// 获取今日用户分布
export function getTodayStats() {
    return instance.get('/admin/visit/today')
}
