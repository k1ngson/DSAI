// api.ts

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface AnalyzeRequest {
  user_query: string;
  context_text?: string;
  file?: File;
  need_reasoning?: boolean;
}

export const streamAnalyzeData = async (
  payload: AnalyzeRequest & { conversation_id: string }
) => {
  // 1. 基础校验
  if (!payload.user_query?.trim()) {
    throw new Error('用户提问内容不能为空');
  }
  if (!payload.conversation_id?.trim()) {
    throw new Error('会话ID不能为空');
  }

  try {
    const formData = new FormData();
    // 2. 拼接参数
    formData.append('user_query', payload.user_query);
    formData.append('conversation_id', payload.conversation_id);
    // 注意：FormData 中布尔值通常转为字符串 "true"/"false"
    formData.append('need_reasoning', payload.need_reasoning ? 'true' : 'false');
    
    if (payload.context_text) {
      formData.append('context_text', payload.context_text);
    }
    if (payload.file) {
      formData.append('file', payload.file);
    }

    const response = await axios.post(
      `${API_BASE_URL}/stream-analyze`,
      formData,
      {
        // 3. 关键：不要手动设置 Content-Type，axios 会自动设置为 multipart/form-data 并带上 boundary
        responseType: 'text', // 流式数据按文本处理
      }
    );
    return response.data;
  } catch (error: any) {
    // 4. 增强错误处理：流式接口报错时，response.data 可能是文本而非 JSON 对象
    let errorMsg = '请求服务器失败，请稍后重试';
    if (error.response) {
       console.error('API Error Status:', error.response.status);
       // 尝试读取错误信息
       errorMsg = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
    }
    console.error('流式接口请求失败详情：', errorMsg);
    throw new Error(errorMsg);
  }
};