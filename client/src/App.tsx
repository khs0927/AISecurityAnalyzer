import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import VitalSignsMonitoring from "@/pages/VitalSignsMonitoring";
import RiskAnalysis from "@/pages/RiskAnalysis";
import HealthRecord from "@/pages/HealthRecord";
import AIConsultation from "@/pages/AIConsultation";
import Settings from "@/pages/Settings";
import PatientDetail from "@/pages/PatientDetail";
import GuardianPage from "@/pages/GuardianPage";
import MedicationSearch from "@/pages/MedicationSearch";
import WelcomePage from "@/pages/WelcomePage";
import { AppProvider } from "./contexts/AppContext";
import AppLayout from "./components/layout/AppLayout";

// 새로운 페이지 컴포넌트 임포트
import HeartDiagnosis from "@/pages/HeartDiagnosis";
import EmergencyGuide from "@/pages/EmergencyGuide";
import EmergencyContacts from "@/pages/EmergencyContacts";
import EmergencyDetail from "@/pages/EmergencyDetail";
import AiVoiceConsultation from "@/pages/AiVoiceConsultation";
import AutoCallSettings from "@/pages/AutoCallSettings";
import NearbyHospitals from "@/pages/NearbyHospitals";
import BioMonitoring from "@/pages/BioMonitoring";

// 새로 추가된 페이지 컴포넌트 임포트
import HealthScoreDetails from "@/pages/HealthScoreDetails";
import HealthTips from "@/pages/HealthTips";
import UsefulInfo from "@/pages/UsefulInfo";
import AIConsultationHome from "@/pages/AIConsultationHome";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* 새로운 메인 탭 라우트 */}
      <Route path="/heart-diagnosis" component={HeartDiagnosis} />
      <Route path="/emergency-guide" component={EmergencyGuide} />
      <Route path="/emergency-contacts" component={EmergencyContacts} />
      
      {/* 심장 진단 서브 탭 라우트 */}
      <Route path="/vital-signs" component={VitalSignsMonitoring} />
      <Route path="/risk-analysis" component={RiskAnalysis} />
      <Route path="/health-records" component={HealthRecord} />
      <Route path="/ai-consultation" component={AIConsultation} />
      <Route path="/ai-voice-consultation" component={AiVoiceConsultation} />
      <Route path="/ai-consultation-home" component={AIConsultationHome} />
      <Route path="/bio-monitoring" component={BioMonitoring} />
      
      {/* 응급처치 상세 페이지 */}
      <Route path="/emergency/:id" component={EmergencyDetail} />
      
      {/* 자동 호출 설정 페이지 */}
      <Route path="/auto-call-settings" component={AutoCallSettings} />
      
      {/* 새로 추가된 정보 페이지들 */}
      <Route path="/health-score-details" component={HealthScoreDetails} />
      <Route path="/health-tips" component={HealthTips} />
      <Route path="/useful-info" component={UsefulInfo} />
      <Route path="/nearby-hospitals" component={NearbyHospitals} />
      
      {/* 기존 라우트 */}
      <Route path="/settings" component={Settings} />
      <Route path="/patient/:patientId" component={PatientDetail} />
      <Route path="/guardian" component={GuardianPage} />
      <Route path="/medication-search" component={MedicationSearch} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Switch>
          <Route path="/welcome">
            <WelcomePage />
          </Route>
          <Route>
            <AppLayout>
              <Router />
            </AppLayout>
          </Route>
        </Switch>
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
