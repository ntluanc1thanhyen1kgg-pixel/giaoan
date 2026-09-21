import type { LessonPlanInput, FileWithPreview, LessonPlan } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
};

export const generateLessonPlan = async (data: LessonPlanInput, files: FileWithPreview[], locale: 'vi' | 'en', apiKey: string): Promise<LessonPlan[]> => {
  const imageParts = await Promise.all(
    files.filter(file => file.type.startsWith('image/')).map(fileToGenerativePart)
  );

  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data,
        imageParts,
        locale,
        apiKey,
      }),
    });
  } catch (netErr: any) {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng internet của bạn.');
  }

  const contentType = response.headers.get('content-type') || '';
  const textResponse = await response.text();

  if (!contentType.includes('application/json')) {
    console.error('Raw server non-JSON response:', textResponse.slice(0, 300));
    
    if (textResponse.includes('The page') || textResponse.includes('<!DOCTYPE html>') || response.status === 404) {
      throw new Error(
        'Đường dẫn API (/api/generate) chưa phản hồi đúng định dạng JSON. ' +
        'Nếu bạn đang đưa code lên Vercel, vui lòng kiểm tra xem bạn đã thêm file vercel.json và cài đặt biến GEMINI_API_KEY trong Vercel chưa.'
      );
    }

    throw new Error(`Máy chủ phản hồi không đúng định dạng JSON (${response.status} ${response.statusText}).`);
  }

  let resultData: any;
  try {
    resultData = JSON.parse(textResponse);
  } catch (jsonErr) {
    throw new Error(`Dữ liệu từ máy chủ không phải JSON hợp lệ. Chi tiết: ${textResponse.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(resultData?.error || 'Không thể tạo giáo án từ máy chủ');
  }

  return resultData;
};
