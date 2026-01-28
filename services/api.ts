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

export const analyzeData = async (payload: AnalyzeRequest): Promise<AnalyzeResponse> => {
  try {
    // 關鍵修正：建立 FormData 物件
    const formData = new FormData();
    
    // 根據後端 main.py 的參數名稱進行 append
    formData.append('user_query', payload.user_query);
    
    // 如果有檔案，放入 'file' 欄位 (對應後端的 file: UploadFile)
    if (payload.file) {
      formData.append('file', payload.file);
    }

    // 注意：如果你的後端還需要 context_text，也必須用 append
    if (payload.context_text) {
        // 如果後端沒定義這個 Form 欄位，請確認後端是否需要接收它
        formData.append('context_text', payload.context_text);
    }

    const response = await axios.post<AnalyzeResponse>(
      `${API_BASE_URL}/analyze`, 
      formData, // 發送 formData
      {
        headers: {
          // Axios 會自動根據 formData 設定正確的 Content-Type (包含 boundary)
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    // 更加詳細的 Log，幫助你看到真正的錯誤原因
    if (error.response) {
      console.error('API 錯誤回應:', error.response.data);
      console.error('狀態碼:', error.response.status);
    } else {
      console.error('網路連線失敗:', error.message);
    }
    
    throw new Error(error.response?.data?.detail || '無法連接到後端伺服器');
  }
};