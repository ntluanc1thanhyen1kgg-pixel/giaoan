import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { RobotIcon } from './icons';

interface AuthProps {
  onSubmit: (apiKey: string) => void;
  error?: string | null;
}

export const Auth: React.FC<AuthProps> = ({ onSubmit, error }) => {
  const [key, setKey] = useState('');
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSubmit(key.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
            <RobotIcon className="w-16 h-16 mx-auto text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-600 mt-4">{t('headerTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('apiKeyInstructions')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="api-key" className="block text-lg font-medium text-blue-800">
              {t('apiKeyLabel')}
            </label>
            <input
              id="api-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg text-gray-900"
              placeholder={t('apiKeyPlaceholder')}
              required
              aria-describedby="api-key-error"
            />
          </div>
          {error && (
            <p id="api-key-error" className="text-sm text-red-600 text-center" role="alert">
              {error}
            </p>
          )}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('apiKeySubmitButton')}
            </button>
          </div>
        </form>
         <div className="mt-4 text-center text-sm text-gray-500">
            <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">
                {t('getApiKeyLink')}
            </a>
        </div>
      </div>
    </div>
  );
};
