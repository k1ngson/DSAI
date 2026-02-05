import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface AnalyzeRequest {
  user_query: string;
  context_text?: string;
  file?: File;
  need_reasoning?: boolean;
}

interface AnalyzeResponse {
  status: string;
  data: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// 追加到原 api.ts 文件中
export const streamAnalyzeData = async (
  payload: AnalyzeRequest & { conversation_id: string }
) => {
  // 前端前置校验：拦截空值，避免无效请求
  if (!payload.user_query?.trim()) {
    throw new Error('用户提问内容不能为空');
  }
  if (!payload.conversation_id?.trim()) {
    throw new Error('会话ID不能为空');
  }

  try {
    const formData = new FormData();
    // 拼接必填参数
    formData.append('user_query', payload.user_query);
    formData.append('conversation_id', payload.conversation_id);
    
    // 拼接可选参数
    formData.append('need_reasoning', payload.need_reasoning?.toString() || 'false');
    if (payload.context_text) {
      formData.append('context_text', payload.context_text);
    }
    // 拼接文件
    if (payload.file) {
      formData.append('file', payload.file);
    }

    const response = await axios.post(
      `${API_BASE_URL}/stream-analyze`,
      formData,
      {
        // 关键：不手动指定 Content-Type，让 axios 自动生成带 boundary 的请求头
        responseType: 'text',
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('流式接口请求失败：', error.response?.data || error.message);
    throw new Error('请求服务器失败，请稍后重试');
  }
};