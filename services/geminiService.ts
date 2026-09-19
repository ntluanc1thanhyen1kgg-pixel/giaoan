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

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data,
      imageParts,
      locale,
      apiKey, // Still allow passing apiKey from client if provided
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate lesson plan');
  }

  return await response.json();
};
