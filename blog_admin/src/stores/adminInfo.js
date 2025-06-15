import {defineStore} from "pinia";
import {ref} from "vue";

export const useAdminInfoStore = defineStore('adminInfo', () => {

        const info = ref({})

        function setInfo(newInfo) {
            info.value = newInfo
        }

        function removeInfo() {
            info.value = {}
        }

        return {
            info, setInfo, removeInfo
        }

    },
    {
        persist: true
    }
)
