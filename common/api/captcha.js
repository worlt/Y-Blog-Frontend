import request from '@common/utils/request';

/**
 * 获取拼图验证码
 * @param {string} difficulty 难度 (easy, normal, hard)
 * @returns {Promise<object>}
 */
export function getCaptchaPuzzle(difficulty) {
  return request({
    url: '/captcha/puzzle',
    method: 'get',
    params: { difficulty }
  });
}

/**
 * 验证拼图
 * @param {object} data 验证数据
 * @returns {Promise<object>}
 */
export function verifyCaptchaPuzzle(data) {
  return request({
    url: '/captcha/verify',
    method: 'post',
    data
  });
}
