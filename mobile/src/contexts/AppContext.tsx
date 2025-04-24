import React, { createContext, useContext, useState, ReactNode } from 'react';

// 앱 컨텍스트 타입 정의
interface AppContextType {
  theme: 'light' | 'dark';
  language: 'ko' | 'en';
  toggleTheme: () => void;
  changeLanguage: (lang: 'ko' | 'en') => void;
}

// 기본값
const defaultContext: AppContextType = {
  theme: 'light',
  language: 'ko',
  toggleTheme: () => {},
  changeLanguage: () => {},
};

// 컨텍스트 생성
const AppContext = createContext<AppContextType>(defaultContext);

// 컨텍스트 프로바이더 Props 타입
interface AppProviderProps {
  children: ReactNode;
}

// 컨텍스트 프로바이더
export const AppProvider = ({ children }: AppProviderProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');

  // 테마 토글 함수
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // 언어 변경 함수
  const changeLanguage = (lang: 'ko' | 'en') => {
    setLanguage(lang);
  };

  return (
    <AppContext.Provider value={{ theme, language, toggleTheme, changeLanguage }}>
      {children}
    </AppContext.Provider>
  );
};

// 컨텍스트 사용을 위한 훅
export const useApp = () => useContext(AppContext);

export default AppContext;