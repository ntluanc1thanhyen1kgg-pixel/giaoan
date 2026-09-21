
import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { LessonPlanForm } from './components/LessonPlanForm';
import { LessonPlanDisplay } from './components/LessonPlanDisplay';
import { useI18n } from './contexts/I18nContext';
import { LessonPlan, LessonPlanInput, FileWithPreview } from './types';
import { generateLessonPlan } from './services/geminiService';
import { exportToDocx } from './utils/docxGenerator';
import { RobotIcon, KeyIcon } from './components/icons';
import { signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { LogOut, FileText, Settings as SettingsIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './contexts/AuthContext';
import { useConfig } from './contexts/ConfigContext';

const Login = lazy(() => import('./components/AuthSystem').then(m => ({ default: m.Login })));
const AdminDashboard = lazy(() => import('./components/AuthSystem').then(m => ({ default: m.AdminDashboard })));
const GeneralSettings = lazy(() => import('./components/AuthSystem').then(m => ({ default: m.GeneralSettings })));

export default function App() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [view, setView] = useState<'generator' | 'admin'>('generator');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useI18n();

  const [hasServerApiKey, setHasServerApiKey] = useState<boolean | null>(null);

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

  useEffect(() => {
    // Priority: Profile API Keys > Local Storage
    if (profile?.geminiApiKeys && profile.geminiApiKeys.length > 0) {
      setApiKeys(profile.geminiApiKeys);
    } else if (profile?.geminiApiKey) {
      setApiKeys([profile.geminiApiKey]);
    } else {
      const storedKeys = localStorage.getItem('gemini-api-keys');
      if (storedKeys) {
        try {
          setApiKeys(JSON.parse(storedKeys));
        } catch (e) {
          const storedKey = localStorage.getItem('gemini-api-key');
          if (storedKey) setApiKeys([storedKey]);
        }
      } else {
        const storedKey = localStorage.getItem('gemini-api-key');
        if (storedKey) setApiKeys([storedKey]);
      }
    }
  }, [profile]);

  const apiKey = apiKeys[currentKeyIndex] || null;

  const handleKeySubmit = (key: string) => {
    localStorage.setItem('gemini-api-key', key);
    localStorage.setItem('gemini-api-keys', JSON.stringify([key]));
    setApiKeys([key]);
    setAuthError(null); // Clear previous auth errors on new submission
  };

  const handleKeyChange = () => {
    localStorage.removeItem('gemini-api-key');
    localStorage.removeItem('gemini-api-keys');
    setApiKeys([]);
  };

  const handleGeneratePlan = useCallback(async (data: LessonPlanInput, files: FileWithPreview[]) => {
    if (apiKeys.length === 0 && !hasServerApiKey) {
      setError(t('apiKeyMissingError'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setLessonPlan(null);
    setAuthError(null);

    let lastError: any = null;
    let success = false;

    // Try rotation logic if there are multiple keys
    for (let i = 0; i < Math.max(1, apiKeys.length); i++) {
      const attemptIndex = (currentKeyIndex + i) % Math.max(1, apiKeys.length);
      const currentTryKey = apiKeys[attemptIndex] || null;

      try {
        const result = await generateLessonPlan(data, files, locale, currentTryKey);
        setLessonPlan(result);
        setCurrentKeyIndex(attemptIndex); // Save working index
        success = true;
        break;
      } catch (err: any) {
        lastError = err;
        console.error(`Attempt with key ${attemptIndex + 1} failed:`, err);
        
        // If it's a quota issue (429) or service unavailable (503) and we have more keys, try next
        const isTransientError = 
          err.message?.includes('429') || 
          err.message?.includes('503') || 
          err.message?.includes('UNAVAILABLE') ||
          err.message?.includes('quota') || 
          err.message?.includes('limit') ||
          err.message?.includes('high demand');

        if (isTransientError && i < apiKeys.length - 1) {
          // Wait 2 seconds before trying next key
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue; // Try next key
        }
        
        // If it's invalid key, and we have more keys, try next
        if (err.message?.includes('API_KEY_INVALID') && i < apiKeys.length - 1) {
          continue;
        }

        // Otherwise, stop and show error
        break;
      }
    }

    if (!success && lastError) {
      if (lastError.message?.includes('API_KEY_INVALID')) {
        setAuthError(t('invalidApiKeyError'));
        handleKeyChange();
      } else {
        const msg = lastError.message || '';
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
          setError(
            locale === 'vi'
              ? 'Hệ thống AI của Google hiện đang có lượng truy cập rất cao (503 High Demand). Vui lòng đợi 15-30 giây rồi bấm thử lại, hoặc thêm khóa API Key khác trong phần Cài đặt.'
              : 'Google AI service is experiencing high demand (503). Please wait 15-30 seconds and retry, or configure a backup API Key.'
          );
        } else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          setError(
            locale === 'vi'
              ? 'Tài khoản đã sử dụng hết hạn mức yêu cầu miễn phí (429 Quota Exceeded). Vui lòng thêm API Key mới trong phần Cài đặt hoặc chờ vài phút.'
              : 'Quota limit exceeded (429). Please add another Gemini API Key in Settings or wait a few moments.'
          );
        } else {
          setError(lastError.message);
        }
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

  if (authLoading || configLoading || hasServerApiKey === null) {
    return <div className="h-screen flex items-center justify-center bg-gray-50">{t('loadingMessage')}...</div>;
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50">{t('loadingMessage')}...</div>}>
        <Login />
      </Suspense>
    );
  }

  // Force API Key setup for teachers if missing
  if (!isAdmin && apiKeys.length === 0 && hasServerApiKey === false) {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50">{t('loadingMessage')}...</div>}>
        <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-blue-100"
          >
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg mx-auto">
              <KeyIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 text-center mb-2 tracking-tight uppercase">CẤU HÌNH API KEY</h2>
            <p className="text-gray-500 text-center text-sm font-medium mb-8">
              Chào mừng <span className="text-blue-600 font-bold">{profile?.username}</span>! Để bắt đầu soạn giáo án, bạn cần cấu hình Gemini API Key của riêng mình.
            </p>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-8">
              <p className="text-[10px] text-blue-700 font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                <SettingsIcon size={14} /> Hướng dẫn
              </p>
              <p className="text-[10px] text-blue-600 leading-relaxed font-bold">
                API Key được lưu an toàn vào tài khoản của bạn. Bạn có thể lấy Key miễn phí tại Google AI Studio.
              </p>
            </div>

            <GeneralSettings />
            
            <p className="text-center text-[10px] text-gray-400 font-medium mt-8 italic">
              * Sau khi lưu Key, hãy tải lại trang nếu hệ thống chưa nhận diện.
            </p>
            
            <button 
              onClick={() => window.location.reload()}
              className="w-full mt-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs tracking-widest hover:bg-gray-200 transition-all uppercase"
            >
              ĐÃ LƯU & TIẾP TỤC
            </button>
          </motion.div>
        </div>
      </Suspense>
    );
  }

  const headerStyle = config?.headerColor ? { backgroundColor: config.headerColor } : {};
  const bannerTitle = config?.bannerTitle || t('headerTitle');
  const bannerSubtitle = config?.bannerSubtitle || t('headerSubtitle');

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm z-10 flex-shrink-0 relative overflow-hidden" style={headerStyle}>
        {config?.bannerImageUrl && (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <img src={config.bannerImageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center relative">
           <div className="flex-1 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <RobotIcon className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-none mb-1">
                  {isAdmin ? 'Quản trị viên' : 'Giáo viên'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="block text-base text-gray-900 font-black tracking-tight leading-none">
                    {profile?.username || user?.email?.split('@')[0] || 'Người dùng'}
                  </span>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
              </div>
           </div>
           
           <div className="flex-1 text-center">
            <h1 className="text-2xl font-black text-blue-700 tracking-tight leading-none">
              {bannerTitle}
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-bold tracking-widest uppercase">{bannerSubtitle}</p>
          </div>

          <div className="flex-1 flex items-center space-x-2 justify-end">
             {isAdmin ? (
               <button
                  onClick={() => setView(view === 'generator' ? 'admin' : 'generator')}
                  className={`flex items-center px-4 py-2 border text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-sm ${
                    view === 'admin' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'
                  }`}
                >
                  {view === 'generator' ? <SettingsIcon className="w-3 h-3 mr-2" /> : <FileText className="w-3 h-3 mr-2" />}
                  {view === 'generator' ? 'CÀI ĐẶT' : 'SOẠN BÀI'}
               </button>
             ) : (
               <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center px-4 py-2 border border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-gray-600 bg-white hover:bg-gray-50 transition-all shadow-sm"
                >
                  <SettingsIcon className="w-3 h-3 mr-2" />
                  CÀI ĐẶT
               </button>
             )}

            <button
                onClick={() => signOut(auth)}
                className="flex items-center px-4 py-2 border border-red-100 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-red-600 bg-white hover:bg-red-50 transition-all shadow-sm"
                title="Đăng xuất"
              >
                <LogOut className="w-3 h-3 mr-2" />
                THOÁT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8 flex-grow flex flex-col overflow-hidden">
        <div className="flex-grow overflow-hidden">
          {view === 'admin' && isAdmin ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <Suspense fallback={<div className="h-full flex items-center justify-center">{t('loadingMessage')}...</div>}>
                <AdminDashboard />
              </Suspense>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              <div className="lg:col-span-5 h-full overflow-y-auto custom-scrollbar pr-4">
                <LessonPlanForm onSubmit={handleGeneratePlan} isLoading={isLoading} onReset={handleReset} />
              </div>
              <div className="lg:col-span-7 bg-white p-6 rounded-lg shadow-md h-full overflow-y-auto custom-scrollbar">
                <LessonPlanDisplay
                  lessonPlan={lessonPlan}
                  isLoading={isLoading}
                  error={error}
                  onDownload={handleDownload}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xl relative border border-gray-100"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                  <SettingsIcon className="text-blue-600" />
                  CÀI ĐẶT HỆ THỐNG
                </h2>
                <p className="text-gray-500 text-sm font-medium">Tùy chỉnh cấu hình và ngôn ngữ của bạn</p>
              </div>

              <Suspense fallback={<div className="p-8 text-center">{t('loadingMessage')}...</div>}>
                <GeneralSettings />
              </Suspense>
              
              <div className="mt-8 pt-6 border-t flex justify-end">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl font-black text-xs tracking-widest hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                  HOÀN TẤT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
       <footer className="text-center py-4 text-sm text-gray-500 flex-shrink-0">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
}
