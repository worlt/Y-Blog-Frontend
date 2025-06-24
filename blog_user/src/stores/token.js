import {defineStore} from "pinia";
import {ref} from "vue";

export const useTokenStore = defineStore('token', () => {
    // 初始化时尝试从localStorage获取token
    const storedToken = localStorage.getItem('token')
    const token = ref(storedToken || null)

    function setToken(newToken) {
        token.value = newToken
        // 同步到localStorage
        localStorage.setItem('token', newToken)
    }

    function getToken() {
        // 如果内存中没有token，尝试从localStorage获取
        if (!token.value) {
            const storedToken = localStorage.getItem('token')
            if (storedToken) {
                token.value = storedToken
            }
        }
        return token.value
    }

    function removeToken() {
        token.value = null
        // 从localStorage中移除
        localStorage.removeItem('token')
    }

    return {
        token, removeToken, setToken, getToken
    }
},
{
    persist: true
})