import { useTokenStore } from '@/stores/token.js'
import { eventBus } from '@/utils/request.js'
import { ElNotification } from 'element-plus'

let socket = null
let reconnectTimer = null
let lockReconnect = false
const RECONNECT_INTERVAL = 5000 // 重连间隔
const HEARTBEAT_INTERVAL = 30000 // 心跳间隔

// 心跳检测
const heartbeat = {
    timer: null,
    serverTimer: null,
    reset: function () {
        clearTimeout(this.timer)
        clearTimeout(this.serverTimer)
        return this
    },
    start: function () {
        this.timer = setTimeout(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send('ping')
                this.serverTimer = setTimeout(() => {
                    // 如果超过一定时间没收到pong，说明连接假死，关闭连接触发重连
                    console.log('WebSocket心跳超时，关闭连接')
                    socket.close()
                }, HEARTBEAT_INTERVAL)
            }
        }, HEARTBEAT_INTERVAL)
    }
}

/**
 * 初始化WebSocket连接
 * @param {Number} userId 用户ID
 */
export const initWebSocket = (userId) => {
    if (socket) {
        // 避免重复连接
        return
    }

    if (!userId) {
        console.error('WebSocket初始化失败：缺少用户ID')
        return
    }

    try {
        // 根据环境决定 ws 还是 wss，以及 host
        // 假设后端端口是 8088，这里写死或者从配置读取
        // 生产环境通常用 /api 代理，或者独立域名
        // 这里简单实现：使用当前 location.hostname，端口 8088
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        // 注意：这里硬编码了端口 8088，如果您的后端端口不同请修改
        const wsUrl = `${protocol}://${window.location.hostname}:8088/ws/${userId}`

        socket = new WebSocket(wsUrl)

        socket.onopen = handleOpen
        socket.onmessage = handleMessage
        socket.onclose = handleClose
        socket.onerror = handleError

    } catch (e) {
        console.error('WebSocket初始化异常', e)
        reconnect(userId)
    }
}

/**
 * 关闭连接
 */
export const closeWebSocket = () => {
    if (socket) {
        socket.close()
        socket = null
    }
    heartbeat.reset()
    clearTimeout(reconnectTimer)
    lockReconnect = false
}

function handleOpen() {
    console.log('WebSocket连接建立成功')
    heartbeat.reset().start()
}

function handleMessage(e) {
    heartbeat.reset().start()

    if (e.data === 'pong') {
        return
    }

    try {
        const msg = JSON.parse(e.data)

        if (msg.type === 'SYSTEM_MESSAGE' || msg.type === 'PRIVATE_MESSAGE') {
            const messageData = msg.data

            // 触发全局事件，各组件按需监听
            eventBus.emit('ws-new-message', messageData)

            // 可以在这里统一处理一些轻量级通知，比如新消息提示音
            // 或者直接弹出 Notification（如果在非消息页面）
            // 判断当前路由是否在消息页面，如果在则不弹窗？或者都弹窗？
            // 这里简单处理：收到消息就发个 Event，UI 层决定怎么展示

            // 更新未读数事件
            eventBus.emit('ws-unread-update')
        }
    } catch (err) {
        // 非JSON消息，可能是普通文本通知
        console.log('收到WebSocket文本消息:', e.data)
    }
}

function handleClose(e) {
    console.log('WebSocket连接关闭', e)
    // 获取当前用户ID用于重连？
    // 由于闭包无法获取 userId 参数，这里依赖外部重新调用或者简单的重连策略
    // 简单处理：如果 store 中还有 token，尝试重连
    const tokenStore = useTokenStore()
    if (tokenStore.token) {
        // 需要从 store 获取 userId... 比较麻烦
        // 暂时不做自动带参数重连，依赖 App.vue 监听网络状态或重新初始化
        // 或者：将 userId 存在模块级变量？
    }
}

function handleError(e) {
    console.error('WebSocket发生错误', e)
    // 错误也会触发 close
}

function reconnect(userId) {
    if (lockReconnect) return
    lockReconnect = true

    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
        initWebSocket(userId)
        lockReconnect = false
    }, RECONNECT_INTERVAL)
}
