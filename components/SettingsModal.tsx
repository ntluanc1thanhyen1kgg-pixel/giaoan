import React, { useState, useEffect } from 'react';
import { X, Key, Globe, ExternalLink, Check, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../contexts/I18nContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasServerApiKey: boolean | null;
  onKeysUpdated?: (keys: string[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  hasServerApiKey,
  onKeysUpdated,
}) => {
  const { t } = useI18n();
  const [apiKeysInput, setApiKeysInput] = useState('');
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [copiedKeySuccess, setCopiedKeySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKeys = localStorage.getItem('gemini-api-keys');
      if (storedKeys) {
        try {
          const parsed = JSON.parse(storedKeys);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setApiKeysInput(parsed.join('\n'));
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      const singleKey = localStorage.getItem('gemini-api-key');
      if (singleKey) {
        setApiKeysInput(singleKey);
      } else {
        setApiKeysInput('');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const keys = apiKeysInput
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keys.length === 0) {
      localStorage.removeItem('gemini-api-key');
      localStorage.removeItem('gemini-api-keys');
      if (onKeysUpdated) onKeysUpdated([]);
      setSavedCount(0);
      setTimeout(() => {
        setSavedCount(null);
        onClose();
      }, 700);
      return;
    }

    localStorage.setItem('gemini-api-key', keys[0]);
    localStorage.setItem('gemini-api-keys', JSON.stringify(keys));
    if (onKeysUpdated) onKeysUpdated(keys);

    setSavedCount(keys.length);
    setTimeout(() => {
      setSavedCount(null);
      onClose();
    }, 700);
  };

  const handleClear = () => {
    localStorage.removeItem('gemini-api-key');
    localStorage.removeItem('gemini-api-keys');
    setApiKeysInput('');
    if (onKeysUpdated) onKeysUpdated([]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg relative border border-gray-100"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-xs">
            <Key size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">CÀI ĐẶT HỆ THỐNG</h2>
            <p className="text-xs text-gray-500 font-medium">Cấu hình API Key và tùy chọn ứng dụng</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Server API Key status */}
          {hasServerApiKey && (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start gap-3">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-emerald-800">Hệ thống đã có sẵn Gemini API Key của máy chủ</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Bạn có thể soạn bài ngay mà không bắt buộc phải nhập thêm API Key cá nhân. Nếu bạn nhập key bên dưới, hệ thống sẽ ưu tiên sử dụng key của bạn.
                </p>
              </div>
            </div>
          )}

          {/* Gemini API Key Section */}
          <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" />
                Gemini API Key (Tự do/Cá nhân)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline"
              >
                Lấy Key miễn phí
                <ExternalLink size={12} />
              </a>
            </div>

            <p className="text-[11px] text-gray-600">
              Nhập API Key của bạn (mỗi dòng một key nếu có nhiều key để tự động luân chuyển khi hết lượt). Dữ liệu được lưu an toàn trực tiếp trên trình duyệt của bạn.
            </p>

            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white font-mono placeholder:text-gray-400"
              placeholder="AIzaSy... (Dán API Key vào đây)"
              value={apiKeysInput}
              onChange={(e) => setApiKeysInput(e.target.value)}
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
              >
                <Trash2 size={13} />
                Xóa Key đã lưu
              </button>

              {savedCount !== null && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                  <Check size={14} /> {savedCount > 0 ? `Đã lưu ${savedCount} Key!` : 'Đã xóa Key!'}
                </span>
              )}
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-700">Ngôn ngữ hiển thị</span>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            ĐÓNG
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check size={14} />
            LƯU CẤU HÌNH
          </button>
        </div>
      </motion.div>
    </div>
  );
};
