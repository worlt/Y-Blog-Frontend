import request from "@/utils/request.js";

const URL = '/user/ai';

/**
 * 发送消息给AI助手
 * @param {Object} data - 请求数据
 * @param {string} data.message - 用户消息内容
 * @param {string} data.conversationId - 会话ID（可选）
 * @returns {Promise} - 返回AI回复的Promise
 */
export const sendChatMessage = (data) => {
    return request.post(`${URL}/chat`, data);
};

/**
 * 清除会话历史
 * @param {string} conversationId - 会话ID
 * @returns {Promise} - 返回操作结果的Promise
 */
export const clearConversation = (conversationId) => {
    return request.delete(`${URL}/chat/${conversationId}`);
};

/**
 * 发送流式消息给AI助手
 * @param {Object} data - 请求数据
 * @param {Function} onMessage - 收到消息回调 (event) => {}
 * @param {Function} onError - 错误回调 (error) => {}
 * @param {Function} onComplete - 完成回调 () => {}
 * @returns {AbortController} - 控制器，可用于取消请求
 */
export const sendStreamChatMessage = async (data, onMessage, onError, onComplete) => {
    const controller = new AbortController();
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/ai/stream/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'userToken': token || ''
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.trim().startsWith('data:')) {
                    const jsonStr = line.replace('data:', '').trim();
                    if (jsonStr) {
                        if (jsonStr === '[DONE]') {
                            // End of stream if backend sends [DONE] (though our backend sends complete event via closing)
                            continue;
                        }
                        try {
                            const event = JSON.parse(jsonStr);
                            onMessage(event);
                        } catch (e) {
                            console.error('JSON parse error', e);
                        }
                    }
                }
            }
        }

        onComplete && onComplete();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Stream aborted');
        } else {
            onError && onError(error);
        }
    }
    return controller;
};
