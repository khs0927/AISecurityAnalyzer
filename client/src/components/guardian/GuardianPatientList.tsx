import { useApp } from '@/contexts/AppContext';
import { Link } from 'wouter';

const GuardianPatientList = () => {
  const { guardianPatients } = useApp();

  // Fallback data if no patients are loaded yet
  const patients = guardianPatients.length > 0 ? guardianPatients : [
    {
      id: 1,
      name: '이서연',
      age: 48,
      gender: 'female',
      medicalConditions: ['심장질환'],
      healthData: {
        heartRate: 112,
        riskLevel: 72,
        oxygenLevel: 94,
        temperature: 37.2,
        bloodPressureSystolic: 145,
        bloodPressureDiastolic: 95,
        recordedAt: new Date()
      }
    },
    {
      id: 2,
      name: '김민준',
      age: 65,
      gender: 'male',
      medicalConditions: ['고혈압'],
      healthData: {
        heartRate: 95,
        riskLevel: 48,
        oxygenLevel: 96,
        temperature: 36.8,
        bloodPressureSystolic: 155,
        bloodPressureDiastolic: 95,
        recordedAt: new Date()
      }
    },
    {
      id: 3,
      name: '박지현',
      age: 42,
      gender: 'female',
      medicalConditions: ['당뇨'],
      healthData: {
        heartRate: 68,
        riskLevel: 12,
        oxygenLevel: 98,
        temperature: 36.5,
        bloodPressureSystolic: 125,
        bloodPressureDiastolic: 75,
        recordedAt: new Date()
      }
    }
  ];

  const getRiskBackgroundClass = (riskLevel: number) => {
    if (riskLevel < 25) return 'bg-green-50';
    if (riskLevel < 50) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getRiskBadgeClass = (riskLevel: number) => {
    if (riskLevel < 25) return 'bg-green-100 text-green-800';
    if (riskLevel < 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskStatusLabel = (riskLevel: number) => {
    if (riskLevel < 25) return '안전';
    if (riskLevel < 50) return '주의';
    return '위험';
  };

  const getRiskIconClass = (riskLevel: number) => {
    if (riskLevel < 25) return 'bg-green-100 text-secondary';
    if (riskLevel < 50) return 'bg-yellow-100 text-warning';
    return 'bg-red-100 text-danger pulse-animation';
  };

  return (
    <div className="card-with-shadow p-5 mb-4 bg-white rounded-xl shadow-sm">
      <h2 className="text-base font-bold text-[#0e151b] mb-4">모니터링 대상자</h2>
      
      <div className="space-y-3">
        {patients.map((patient) => (
          <Link key={patient.id} href={`/patient/${patient.id}`}>
            <div className={`flex items-center p-3 rounded-xl ${getRiskBackgroundClass(patient.healthData?.riskLevel || 0)}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${getRiskIconClass(patient.healthData?.riskLevel || 0)}`}>
                <span className="font-bold">
                  {getRiskStatusLabel(patient.healthData?.riskLevel || 0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#0e151b]">{patient.name}</h3>
                  <span className="text-lg font-bold text-danger">{patient.healthData?.riskLevel || 0}%</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-[#507695] mr-2">{patient.age}세 {patient.gender === 'male' ? '남성' : '여성'}</span>
                  {patient.medicalConditions && patient.medicalConditions.map((condition, index) => (
                    <span key={index} className={`px-2 py-0.5 rounded-md text-xs font-medium ${getRiskBadgeClass(patient.healthData?.riskLevel || 0)}`}>
                      {condition}
                    </span>
                  ))}
                </div>
                <div className="flex items-center mt-1">
                  {(patient.healthData?.riskLevel || 0) >= 50 && (
                    <div className="flex items-center text-xs text-danger mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>ST 분절 상승</span>
                    </div>
                  )}
                  <div className={`flex items-center text-xs ${(patient.healthData?.riskLevel || 0) >= 50 ? 'text-danger' : (patient.healthData?.riskLevel || 0) >= 25 ? 'text-warning' : 'text-[#507695]'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>심박수 {patient.healthData?.heartRate}</span>
                  </div>
                </div>
              </div>
              <div className="ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#507695]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <button className="w-full mt-4 py-3 border border-primary text-primary rounded-xl font-medium text-sm">
        대상자 추가하기
      </button>
    </div>
  );
};

export default GuardianPatientList;
