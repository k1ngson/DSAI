import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface AnalyzeRequest {
  user_query: string;
  context_text?: string;
  file?: File; // 如果有上傳檔案
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
export const streamAnalyzeData = async (payload: AnalyzeRequest & { conversation_id: string }) => {
  try {
    const formData = new FormData();
    // 拼接所有Form参数，匹配后端Form字段名
    formData.append('user_query', payload.user_query);
    formData.append('conversation_id', payload.conversation_id);
    formData.append('need_reasoning', payload.need_reasoning?.toString() || 'false');
    
    // 可选参数
    if (payload.context_text) {
      formData.append('context_text', payload.context_text);
    }
    // 上传文件
    if (payload.file) {
      formData.append('file', payload.file);
    }

    const response = await axios.post(
      `${API_BASE_URL}/stream-analyze`,
      formData,
      {
        headers: {},
        // 流式响应配置
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          // 可在此处理前端流式渲染逻辑
        }
      }
    );

    return response.data;
  } catch (error: any) {
    // 异常日志与原逻辑一致
    if (error.response) {
      console.error('流式API错误响应:', error.response.data);
      console.error('状态码:', error.response.status);
    } else {
      console.error('网络连接失败:', error.message);
    }
    throw new Error(error.response?.data?.detail || '无法连接到后端服务器');
  }
};