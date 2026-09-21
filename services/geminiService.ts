import type { LessonPlanInput, FileWithPreview, LessonPlan } from '../types';

/**
 * Compress and resize images on client-side before sending to server/Vercel.
 * This keeps the request payload well within Vercel's 4.5 MB serverless limit.
 */
const compressImage = async (file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.75): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      // Fill background with white to handle transparency cleanly
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Data = dataUrl.split(',')[1];

      resolve({
        mimeType: 'image/jpeg',
        data: base64Data,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

const fileToGenerativePart = async (file: File) => {
  try {
    const compressed = await compressImage(file);
    return {
      inlineData: compressed
    };
  } catch (err) {
    // Fallback to standard reader if canvas compression fails
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
  }
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

  const textResponse = await response.text();

  // 1. Check for 413 payload too large
  if (response.status === 413 || textResponse.includes('413') || textResponse.includes('FUNCTION_PAYLOAD_TOO_LARGE') || textResponse.includes('Payload Too Large')) {
    throw new Error(
      'Dung lượng ảnh đính kèm vượt quá giới hạn 4.5MB của Vercel. ' +
      'Vui lòng đính kèm ít trang ảnh hơn (ví dụ 1-3 trang) để Vercel tiếp nhận.'
    );
  }

  // 2. Try parsing JSON first regardless of Content-Type header
  let resultData: any = null;
  let parseSuccess = false;
  try {
    resultData = JSON.parse(textResponse);
    parseSuccess = true;
  } catch (e) {
    parseSuccess = false;
  }

  if (parseSuccess && resultData) {
    if (!response.ok) {
      throw new Error(resultData?.error || `Lỗi máy chủ (${response.status}): Không thể tạo giáo án.`);
    }
    return resultData;
  }

  // 3. Fallback for non-JSON responses (HTML, plain text, Vercel timeouts/errors)
  console.error('Raw non-JSON response from server:', response.status, textResponse.slice(0, 300));

  if (response.status === 504 || textResponse.includes('504') || textResponse.includes('TIMEOUT')) {
    throw new Error(
      'Hệ thống quá thời gian chờ (504 Timeout) trên Vercel. ' +
      'AI đang xử lý lượng dữ liệu lớn. Vui lòng thử lại hoặc giảm bớt thông tin/số tiết cần tạo.'
    );
  }

  if (response.status === 500 || textResponse.includes('500')) {
    throw new Error(
      'Lỗi máy chủ (500). Vui lòng kiểm tra lại biến GEMINI_API_KEY trên Vercel (trong phần Project Settings -> Environment Variables) hoặc kiểm tra tính hợp lệ của Gemini API Key.'
    );
  }

  if (textResponse.includes('The page') || textResponse.includes('<!DOCTYPE html>') || response.status === 404) {
    throw new Error(
      'Đường dẫn API (/api/generate) chưa phản hồi đúng định dạng. ' +
      'Nếu bạn đang đưa ứng dụng lên Vercel, vui lòng đảm bảo đã có file vercel.json và cài đặt biến GEMINI_API_KEY.'
    );
  }

  throw new Error(`Máy chủ phản hồi không đúng định dạng (${response.status} ${response.statusText || ''}).`);
};
