import { defineStore } from "pinia";
import { ref } from "vue";

export const useTokenStore = defineStore('token', () => {

    const token = ref('')

    function setToken(newToken) {
        token.value = newToken
        // 同步写入localStorage，确保路由守卫能立即读取到
        // pinia-persistedstate-plugin的持久化可能有微小延迟
        try {
            localStorage.setItem('token', JSON.stringify({ token: newToken }))
        } catch (e) {
            console.warn('写入token到localStorage失败:', e)
        }
    }

    function getToken() {
        return token.value || null
    }

    function removeToken() {
        token.value = ''
        // 同步清除localStorage
        try {
            localStorage.removeItem('token')
        } catch (e) {
            console.warn('清除localStorage中的token失败:', e)
        }
    }

    return {
        token, setToken, getToken, removeToken
    }

},
    {
        persist: true
    }
)
