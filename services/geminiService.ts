import type { LessonPlanInput, FileWithPreview, LessonPlan } from '../types';

/**
 * Dynamically load PDF.js from CDN to render PDF pages into lightweight JPEGs
 */
const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjs);
      } else {
        reject(new Error('PDF.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });
};

/**
 * Compress and resize images on client-side before sending to server/Vercel.
 * This keeps the request payload well within Vercel's 4.5 MB serverless limit.
 */
const compressImage = async (
  file: File | Blob, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.6
): Promise<{ mimeType: string; data: string }> => {
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

const fileToGenerativeParts = async (file: File): Promise<{ inlineData: { mimeType: string; data: string } }[]> => {
  // Handle PDF files by converting pages to lightweight compressed JPEG images
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const parts: { inlineData: { mimeType: string; data: string } }[] = [];

      // Render up to max 10 pages for optimal lesson plan context
      const maxPages = Math.min(pdf.numPages, 10);
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;

          // Downscale canvas to max 1200px width for small size (~80KB - 120KB per page)
          let targetCanvas = canvas;
          if (canvas.width > 1200) {
            const scale = 1200 / canvas.width;
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = 1200;
            scaledCanvas.height = Math.round(canvas.height * scale);
            const sCtx = scaledCanvas.getContext('2d');
            if (sCtx) {
              sCtx.fillStyle = '#FFFFFF';
              sCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
              sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
              targetCanvas = scaledCanvas;
            }
          }

          const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.6);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: dataUrl.split(',')[1],
            },
          });
        }
      }
      if (parts.length > 0) {
        return parts;
      }
    } catch (pdfErr) {
      console.warn('PDF.js page rendering fallback to raw PDF base64:', pdfErr);
    }

    // Fallback: send raw PDF base64 if rendering failed
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return [{
      inlineData: {
        mimeType: 'application/pdf',
        data: base64EncodedData,
      },
    }];
  }

  // Handle image files
  try {
    const compressed = await compressImage(file, 1200, 1200, 0.6);
    return [{
      inlineData: compressed
    }];
  } catch (err) {
    // Fallback to standard reader if canvas compression fails
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return [{
      inlineData: {
        mimeType: file.type || 'image/jpeg',
        data: base64EncodedData,
      },
    }];
  }
};

export const generateLessonPlan = async (data: LessonPlanInput, files: FileWithPreview[], locale: 'vi' | 'en', apiKey: string): Promise<LessonPlan[]> => {
  const filePartsArrays = await Promise.all(
    files.map(fileToGenerativeParts)
  );
  let imageParts = filePartsArrays.flat();

  // Check total payload size in Base64 characters
  let totalBase64Length = imageParts.reduce((acc, part) => acc + (part.inlineData?.data?.length || 0), 0);

  // If payload exceeds ~3.2MB base64 (~2.4MB raw binary), perform secondary heavy compression
  if (totalBase64Length > 3_300_000) {
    console.log(`Payload size ${totalBase64Length} chars is large, performing extra compression...`);
    // Filter down or extra-compress images
    const recompressedParts: { inlineData: { mimeType: string; data: string } }[] = [];
    for (const part of imageParts) {
      if (part.inlineData.mimeType.startsWith('image/')) {
        try {
          // Convert base64 back to Blob and compress with lower resolution
          const byteString = atob(part.inlineData.data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: part.inlineData.mimeType });
          const extraCompressed = await compressImage(blob, 900, 900, 0.45);
          recompressedParts.push({ inlineData: extraCompressed });
        } catch (e) {
          recompressedParts.push(part);
        }
      } else {
        recompressedParts.push(part);
      }
    }
    imageParts = recompressedParts;
    totalBase64Length = imageParts.reduce((acc, part) => acc + (part.inlineData?.data?.length || 0), 0);
  }

  // Final sanity check before fetch to ensure Vercel payload limit is never violated
  if (totalBase64Length > 3_800_000) {
    throw new Error(
      'Dung lượng tài liệu đính kèm vượt quá giới hạn truyền tải (~3.5MB). ' +
      'Vui lòng chọn ít hình ảnh/trang tài liệu hơn (khoảng 1-3 trang trọng tâm) để AI xử lý nhanh và chính xác nhất.'
    );
  }

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
      'Dung lượng tài liệu đính kèm vượt quá giới hạn 4.5MB của Vercel. ' +
      'Vui lòng đính kèm ít trang tài liệu hơn (ví dụ 1-3 trang) để hệ thống truyền tải thành công.'
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
      'Lỗi máy chủ (500). Vui lòng thử lại sau giây lát hoặc kiểm tra tính hợp lệ của Gemini API Key trong phần Cài đặt.'
    );
  }

  if (textResponse.includes('The page') || textResponse.includes('<!DOCTYPE html>') || response.status === 404) {
    throw new Error(
      'Không thể kết nối đến API (/api/generate). Vui lòng kiểm tra lại kết nối hoặc tải lại trang.'
    );
  }

  throw new Error(`Máy chủ phản hồi không đúng định dạng (${response.status} ${response.statusText || ''}).`);
};
