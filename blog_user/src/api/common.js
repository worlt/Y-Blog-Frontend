import request from "@/utils/request.js";

/**
 * 上传图片到OSS
 * @param {File} file - 要上传的图片文件
 * @returns {Promise} - 返回包含图片URL的Promise
 */
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return request.post('/common/oss/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};