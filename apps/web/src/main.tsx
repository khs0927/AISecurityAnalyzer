import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // 전역 CSS 파일 (아래에서 생성)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 