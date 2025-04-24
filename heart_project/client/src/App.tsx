import { Route, Switch } from 'wouter';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import HeartDiagnosis from './pages/HeartDiagnosis';
import VitalSignsMonitoring from './pages/VitalSignsMonitoring';

function App() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/heart-diagnosis" component={HeartDiagnosis} />
        <Route path="/vital-signs" component={VitalSignsMonitoring} />
        <Route>
          <div className="flex items-center justify-center h-60">
            <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
          </div>
        </Route>
      </Switch>
    </AppLayout>
  );
}

export default App;