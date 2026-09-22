import React, { useState, useCallback, useEffect } from 'react';
import { LessonPlanForm } from './components/LessonPlanForm';
import { LessonPlanDisplay } from './components/LessonPlanDisplay';
import { SettingsModal } from './components/SettingsModal';
import { useI18n } from './contexts/I18nContext';
import { LessonPlan, LessonPlanInput, FileWithPreview } from './types';
import { generateLessonPlan } from './services/geminiService';
import { exportToDocx } from './utils/docxGenerator';
import { RobotIcon } from './components/icons';
import { Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { LanguageSwitcher } from './components/LanguageSwitcher';

export default function App() {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useI18n();

  const [hasServerApiKey, setHasServerApiKey] = useState<boolean | null>(null);

  // Check if backend has GEMINI_API_KEY configured
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          setHasServerApiKey(!!data.hasApiKey);
        } else {
          setHasServerApiKey(false);
        }
      } catch (err) {
        console.error("Failed to check server config:", err);
        setHasServerApiKey(false);
      }
    };
    checkConfig();
  }, []);

  // Load client-side API Keys from localStorage
  useEffect(() => {
    const storedKeys = localStorage.getItem('gemini-api-keys');
    if (storedKeys) {
      try {
        const parsed = JSON.parse(storedKeys);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setApiKeys(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKeys([storedKey]);
    }
  }, []);

  const handleKeysUpdated = (keys: string[]) => {
    setApiKeys(keys);
    setCurrentKeyIndex(0);
  };

  const handleGeneratePlan = useCallback(async (data: LessonPlanInput, files: FileWithPreview[]) => {
    if (apiKeys.length === 0 && !hasServerApiKey) {
      setError(
        locale === 'vi'
          ? 'Chưa cấu hình Gemini API Key. Vui lòng bấm nút "CÀI ĐẶT API KEY" ở góc trên để nhập API Key của bạn.'
          : 'Gemini API Key is missing. Please click "API KEY SETTINGS" at the top to configure your API Key.'
      );
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLessonPlan(null);

    let lastError: any = null;
    let success = false;

    // Rotation logic across keys if available
    const keysToTry = apiKeys.length > 0 ? apiKeys : [''];

    for (let i = 0; i < keysToTry.length; i++) {
      const attemptIndex = (currentKeyIndex + i) % keysToTry.length;
      const currentTryKey = keysToTry[attemptIndex] || '';

      try {
        const result = await generateLessonPlan(data, files, locale, currentTryKey);
        setLessonPlan(result);
        setCurrentKeyIndex(attemptIndex);
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        console.error(`Attempt with key ${attemptIndex + 1} failed:`, err);

        const isTransientError =
          err.message?.includes('429') ||
          err.message?.includes('503') ||
          err.message?.includes('UNAVAILABLE') ||
          err.message?.includes('quota') ||
          err.message?.includes('limit') ||
          err.message?.includes('high demand');

        if (isTransientError && i < keysToTry.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        if (err.message?.includes('API_KEY_INVALID') && i < keysToTry.length - 1) {
          continue;
        }

        break;
      }
    }

    if (!success && lastError) {
      const msg = lastError.message || '';
      if (msg.includes('API_KEY_INVALID')) {
        setError(
          locale === 'vi'
            ? 'Gemini API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong phần Cài đặt.'
            : 'Gemini API Key is invalid or expired. Please check in Settings.'
        );
        setIsSettingsOpen(true);
      } else if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        setError(
          locale === 'vi'
            ? 'Hệ thống AI của Google hiện đang có lượng truy cập cao (503). Vui lòng đợi vài giây rồi bấm thử lại, hoặc cấu hình thêm API Key phụ.'
            : 'Google AI service is experiencing high demand (503). Please wait a few moments and retry.'
        );
      } else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        setError(
          locale === 'vi'
            ? 'API Key đã sử dụng hết hạn mức yêu cầu miễn phí (429). Vui lòng thêm API Key mới trong phần Cài đặt.'
            : 'Quota limit exceeded (429). Please configure a new API Key in Settings.'
        );
      } else {
        setError(lastError.message || t('unexpectedError'));
      }
    }

    setIsLoading(false);
  }, [apiKeys, currentKeyIndex, locale, t, hasServerApiKey]);

  const handleReset = useCallback(() => {
    setLessonPlan(null);
    setError(null);
  }, []);

  const handleDownload = useCallback(async (plans: LessonPlan[], label?: string) => {
    if (plans && plans.length > 0) {
      await exportToDocx(plans, t, label);
    }
  }, [t]);

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-xs z-10 flex-shrink-0 border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-3.5 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl shadow-md flex items-center justify-center text-white shrink-0">
              <RobotIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-blue-700 tracking-tight leading-none uppercase">
                  {t('headerTitle')}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">
                  <Sparkles size={10} /> AI v3.0
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5 whitespace-pre-line leading-tight">
                {t('headerSubtitle')}
              </p>
            </div>
          </div>

          {/* Controls on Header */}
          <div className="flex items-center gap-2 sm:gap-3 self-end md:self-auto shrink-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-xl transition-all shadow-xs active:scale-95"
              title="Cài đặt API Key & Hệ thống"
            >
              <SettingsIcon size={15} />
              <span>CÀI ĐẶT API KEY</span>
              {apiKeys.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <div className="border-l border-gray-200 pl-2 sm:pl-3">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto py-3 px-4 sm:px-6 lg:px-8 flex-grow flex flex-col overflow-hidden">
        {/* Quick API Key notice when deployed on Vercel without environment variable */}
        {!hasServerApiKey && apiKeys.length === 0 && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <span className="text-base shrink-0">💡</span>
              <span>
                <strong className="font-bold">Chưa có API Key:</strong> Bạn có thể dán trực tiếp Gemini API Key vào ứng dụng để soạn bài ngay mà không cần cấu hình biến môi trường trên Vercel.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shrink-0 active:scale-95 shadow-xs flex items-center gap-1.5"
            >
              <SettingsIcon size={13} />
              Dán API Key ngay
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
          {/* Left: Input Form */}
          <div className="lg:col-span-5 h-full overflow-y-auto custom-scrollbar pr-1">
            <LessonPlanForm
              onSubmit={handleGeneratePlan}
              isLoading={isLoading}
              onReset={handleReset}
            />
          </div>

          {/* Right: Lesson Plan Output Display */}
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 h-full overflow-y-auto custom-scrollbar">
            <LessonPlanDisplay
              lessonPlan={lessonPlan}
              isLoading={isLoading}
              error={error}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasServerApiKey={hasServerApiKey}
        onKeysUpdated={handleKeysUpdated}
      />

      {/* Footer */}
      <footer className="text-center py-2.5 text-xs text-gray-500 bg-white border-t border-gray-100 flex-shrink-0">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}
