import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AppConfig {
  bannerTitle: string;
  bannerSubtitle?: string;
  bannerImageUrl?: string;
  headerColor?: string;
}

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
});

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as AppConfig);
      } else {
        // Default config
        setConfig({
          bannerTitle: 'AI STUDIO BUILD',
          bannerSubtitle: 'SOẠN GIÁO ÁN THÔNG MINH',
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Config listener error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};
