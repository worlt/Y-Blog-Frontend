import {defineStore} from "pinia";
import {ref} from "vue";

export const useAuditorInfoStore = defineStore('auditorInfo', () => {

        const info = ref({})

        function setInfo(newInfo) {
            info.value = newInfo
        }

        function removeInfo() {
            info.value = {}
        }

        return {
            info, removeInfo, setInfo
        }

    },
    {
        persist: true
    }
)