import {defineStore} from "pinia";
import {ref, computed} from "vue";

export const useUserInfoStore = defineStore('userInfo', () => {
    // 初始化时尝试从localStorage获取用户信息
    let initialInfo = {}
    try {
        const storedInfo = localStorage.getItem('userInfo')
        if (storedInfo) {
            initialInfo = JSON.parse(storedInfo)
        }
    } catch (error) {
        console.error('解析存储的用户信息失败:', error)
    }
    
    const info = ref(initialInfo)
    
    // 添加userInfo计算属性，与现有代码兼容
    const userInfo = computed(() => info.value)

    function setInfo(newInfo) {
        info.value = newInfo
        // 同步到localStorage
        try {
            localStorage.setItem('userInfo', JSON.stringify(newInfo))
        } catch (error) {
            console.error('存储用户信息失败:', error)
        }
    }

    function removeInfo() {
        info.value = {}
        // 从localStorage中移除
        localStorage.removeItem('userInfo')
    }

    return {
        info, userInfo, removeInfo, setInfo
    }
},
{
    persist: true
})