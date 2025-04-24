import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 에러 핸들러 설정
window.onerror = (message, source, lineno, colno, error) => {
  console.error('전역 JavaScript 오류:', message, source, lineno, colno, error);
  // 페이지에 오류 표시
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; color: #333;">
        <h1 style="color: #ff6d94;">HeartCare 앱 로딩 오류</h1>
        <p>앱을 초기화하는 동안 오류가 발생했습니다.</p>
        <p style="color: #888;">문제가 지속되면 앱을 새로고침하거나 관리자에게 문의하세요.</p>
        <button onclick="location.reload()" style="background: #ff6d94; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; margin-top: 15px;">
          앱 새로고침 시도
        </button>
      </div>
    `;
  }
  return true;
};

// React 오류 바운더리를 대체하는 전역 오류 처리
window.addEventListener('unhandledrejection', function(event) {
  console.error('처리되지 않은 Promise 거부:', event.reason);
});

// Initialize demo user on app start if none exists
async function initializeDemo() {
  try {
    console.log('데모 데이터 초기화 시작...');
    // Check if demo user already exists
    const response = await fetch('/api/users/1');
    if (response.status === 404) {
      console.log('데모 사용자 생성 중...');
      // Create demo user
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'demo_user',
          password: 'password123',
          name: '홍길동',
          age: 45,
          gender: 'male',
          role: 'user',
          medicalConditions: ['고혈압', '당뇨']
        })
      });

      // Create demo guardian
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'demo_guardian',
          password: 'password123',
          name: '김보호',
          age: 40,
          gender: 'female',
          role: 'guardian'
        })
      });

      // Create guardian relationship
      await fetch('/api/guardian-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianId: 2,
          userId: 1,
          relationship: '배우자'
        })
      });

      // Create initial health data
      await fetch('/api/health-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1,
          heartRate: 72,
          oxygenLevel: 98,
          temperature: 36.5,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          riskLevel: 20
        })
      });
    }
    console.log('데모 데이터 초기화 완료!');
  } catch (error) {
    console.error('Failed to initialize demo data:', error);
  }
}

// 앱 렌더링 시도
function renderApp() {
  try {
    console.log('앱 렌더링 시작...');
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('루트 요소를 찾을 수 없습니다!');
      return;
    }
    
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('앱 렌더링 완료!');
  } catch (error) {
    console.error('앱 렌더링 오류:', error);
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; color: #333;">
          <h1 style="color: #ff6d94;">HeartCare 앱 렌더링 오류</h1>
          <p>앱을 로드하는 동안 문제가 발생했습니다: ${error?.message || '알 수 없는 오류'}</p>
          <button onclick="location.reload()" style="background: #ff6d94; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; margin-top: 15px;">
            새로고침
          </button>
        </div>
      `;
    }
  }
}

// 순차적으로 실행
console.log('앱 초기화 시작...');
initializeDemo()
  .then(() => {
    renderApp();
  })
  .catch((error) => {
    console.error('앱 초기화 오류:', error);
  });
