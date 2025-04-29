import React from 'react';
import { Router, Route, Switch, Link } from "wouter";

// 페이지 컴포넌트 임포트
import HomePage from './pages/HomePage';
import DiagnosisPage from './pages/DiagnosisPage';
import EmergencyGuidePage from './pages/EmergencyGuidePage';
import EmergencyContactsPage from './pages/EmergencyContactsPage';
import AiConsultationPage from './pages/AiConsultationPage';

function App() {
  return (
    <Router>
      {/* 전체 앱 컨테이너 - Tailwind를 사용하여 최대 너비 및 중앙 정렬 */}
      <div className="max-w-2xl mx-auto p-5 font-sans">
        <header className="mb-5 pb-3 border-b">
          {/* 앱 타이틀 - 기존 스타일과 유사하게 Tailwind 적용 */}
          <h1 className="text-3xl font-bold text-center text-pink-500 mb-2">낫 투데이 HeartCare</h1>
          {/* 네비게이션은 HomePage 내부 링크로 대체되었으므로 여기서는 제거하거나 최소화 */}
          {/* <nav>
            <Link href="/" className="mr-3 hover:text-pink-600">Home</Link>
          </nav> */}
        </header>

        <main>
          <Switch>
            {/* 홈페이지 라우트 */}
            <Route path="/" component={HomePage} />

            {/* 개별 기능 페이지 라우트 */}
            <Route path="/diagnosis" component={DiagnosisPage} />
            <Route path="/emergency-guide" component={EmergencyGuidePage} />
            <Route path="/emergency-contacts" component={EmergencyContactsPage} />
            <Route path="/ai-consultation" component={AiConsultationPage} />

            {/* 404 Not Found 페이지 */}
            <Route>
              <div className="text-center mt-10">
                <h2 className="text-2xl font-semibold mb-4">404: Page Not Found</h2>
                <Link href="/" className="text-pink-500 hover:underline">
                  홈으로 돌아가기
                </Link>
              </div>
            </Route>
          </Switch>
        </main>

        <footer className="mt-10 pt-5 border-t text-center text-gray-500 text-sm">
          HeartCare 앱 | &copy; {new Date().getFullYear()} 낫 투데이
        </footer>
      </div>
    </Router>
  );
}

export default App; 