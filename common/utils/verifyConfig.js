/**
 * 滑动拼图验证配置
 */

export const VERIFY_CONFIG = {
  // 全局验证模式: 'dev' (开发模式，自动通过) | 'prod' (生产模式，需要手动验证)
  GLOBAL_VERIFY_MODE: 'prod',

  // 拼图难度：easy | normal | hard
  DIFFICULTY: 'hard',

  // 验证超时时间（毫秒）
  TIMEOUT: 300000,

  // 允许的误差范围（像素），根据难度分级
  TOLERANCE: {
    easy: 10,
    normal: 5,
    hard: 2
  },

  // 拼图块大小
  PUZZLE_SIZE: {
    width: 50,
    height: 50
  },

  // 背景图片尺寸
  BACKGROUND_SIZE: {
    width: 300,
    height: 150
  }
}
