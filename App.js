import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// 화면 컴포넌트 임포트
import HomeScreen from './app/screens/HomeScreen'; 
import HeartDiagnosisScreen from './app/screens/HeartDiagnosisScreen';
import EmergencyGuideScreen from './app/screens/EmergencyGuideScreen';
import EmergencyContactsScreen from './app/screens/EmergencyContactsScreen';
import EmergencyGuideDetailScreen from './app/screens/EmergencyGuideDetailScreen';
import AiConsultationScreen from './app/screens/AiConsultationScreen';

const Tab = createBottomTabNavigator();
// 실제 배포 시에는 @react-navigation/stack 패키지 설치 필요
// 현재는 의존성 충돌로 인해 임시 처리
// createStackNavigator() 대신 임시 객체 생성
const Stack = { 
  Navigator: ({ children, screenOptions }) => <>{children}</>,
  Screen: ({ children }) => <>{children}</>
};

// 심장진단 스택 네비게이션
const HeartDiagnosisStack = ({ webAppData, refreshData, loading }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HeartDiagnosisMain">
        {(props) => <HeartDiagnosisScreen {...props} webAppData={webAppData} refreshData={refreshData} loading={loading} />}
      </Stack.Screen>
      <Stack.Screen name="AiConsultation">
        {(props) => <AiConsultationScreen {...props} webAppData={webAppData} refreshData={refreshData} loading={loading} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// 응급처치 스택 네비게이션
const EmergencyGuideStack = ({ webAppData, refreshData, loading }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmergencyGuideMain">
        {(props) => <EmergencyGuideScreen {...props} webAppData={webAppData} refreshData={refreshData} loading={loading} />}
      </Stack.Screen>
      <Stack.Screen name="EmergencyGuideDetail">
        {(props) => <EmergencyGuideDetailScreen {...props} webAppData={webAppData} refreshData={refreshData} loading={loading} />}
      </Stack.Screen>
      <Stack.Screen name="AiConsultation">
        {(props) => <AiConsultationScreen {...props} webAppData={webAppData} refreshData={refreshData} loading={loading} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// API 통합 설정
const API_CONFIG = {
  // 공통 인증키
  API_KEY: 't6l9sApoYD1s94RX8r8mk68mMtGPVT4gsKp7eG3e86b2tzDANPjoHscFR7C/6i0arJe3lMxEUhELK5o6avD3g==',
  ENCODED_KEY: 't6l9sApoYD1s94RX8r8mk68mMtGPVT4gsKp7eG3e86b2tzDANPjoHscFR7C%2F6i0arJe3lMxEUhELK5o6avD3g%3D%3D',
  
  // API 엔드포인트
  ENDPOINTS: {
    DRUG_INFO: 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService',
    HOSPITAL_SEARCH: 'https://apis.data.go.kr/B552657/HsptlAsembySearchService',
    HOSPITAL_INFO: 'https://apis.data.go.kr/B551182/hospInfoServicev2'
  },
  
  // 데이터 포맷
  FORMATS: {
    DRUG_INFO: 'JSON+XML',
    HOSPITAL_SEARCH: 'XML',
    HOSPITAL_INFO: 'XML'
  },
  
  // 활용 기간
  VALID_PERIOD: '2025-04-12 ~ 2027-04-13'
};

// API 호출 함수
async function fetchDrugInfo(drugName) {
  const url = `${API_CONFIG.ENDPOINTS.DRUG_INFO}/getDrbEasyDrugList?serviceKey=${API_CONFIG.ENCODED_KEY}&itemName=${encodeURIComponent(drugName)}&type=json`;
  return await fetchAPI(url);
}

async function searchHospitals(location) {
  const url = `${API_CONFIG.ENDPOINTS.HOSPITAL_SEARCH}/getHsptlMdcncListInfoInqire?serviceKey=${API_CONFIG.ENCODED_KEY}&Q0=${encodeURIComponent(location)}&pageNo=1&numOfRows=10`;
  return await fetchAPI(url);
}

async function getHospitalInfo(hospitalId) {
  const url = `${API_CONFIG.ENDPOINTS.HOSPITAL_INFO}/getHospBasisList?serviceKey=${API_CONFIG.ENCODED_KEY}&HPID=${hospitalId}&pageNo=1&numOfRows=10`;
  return await fetchAPI(url);
}

// 공통 API 호출 유틸리티
async function fetchAPI(url) {
  try {
    const response = await fetch(url);
    const data = await response.text();
    return parseAPIResponse(data, url);
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
}

// 응답 파싱 함수
function parseAPIResponse(data, url) {
  if (url.includes(API_CONFIG.ENDPOINTS.DRUG_INFO) && url.includes('type=json')) {
    return JSON.parse(data);
  } else {
    // XML 파싱 로직
    const parser = new DOMParser();
    return parser.parseFromString(data, 'text/xml');
  }
}

// App 컴포넌트 - 메인 탭 네비게이션 구성
export default function App() {
  const [webAppData, setWebAppData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 웹 애플리케이션 데이터를 가져오는 함수
  const fetchWebAppData = async () => {
    try {
      // 웹 앱의 API 엔드포인트에서 데이터 가져오기
      // 현재는 더미 데이터 사용
      const mockData = {
        user: {
          id: 1,
          name: '홍길동',
          avatarUrl: 'https://via.placeholder.com/150',
        },
        healthData: {
          heartRate: 72,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          oxygenSaturation: 98,
          temperature: 36.5,
          lastUpdated: new Date().toISOString(),
        },
        watchConnected: true,
      };
      
      setWebAppData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('웹 앱 데이터를 가져오는 중 오류 발생:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebAppData();
  }, []);

  // 각 화면에 웹 앱 데이터 전달을 위한 함수
  const renderScreen = (Screen, name) => {
    return (
      <Screen 
        webAppData={webAppData} 
        refreshData={fetchWebAppData}
        loading={loading}
      />
    );
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            
            if (route.name === '홈') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === '심장진단') {
              iconName = focused ? 'heart' : 'heart-outline';
            } else if (route.name === '응급처치') {
              iconName = focused ? 'medkit' : 'medkit-outline';
            } else if (route.name === '비상연락') {
              iconName = focused ? 'call' : 'call-outline';
            }
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF6D94',
          tabBarInactiveTintColor: 'gray',
          headerShown: false
        })}
      >
        <Tab.Screen name="홈">
          {(props) => <HomeScreen {...props} webAppData={webAppData} refreshData={fetchWebAppData} loading={loading} />}
        </Tab.Screen>
        
        <Tab.Screen name="심장진단">
          {(props) => <HeartDiagnosisStack {...props} webAppData={webAppData} refreshData={fetchWebAppData} loading={loading} />}
        </Tab.Screen>
        
        <Tab.Screen name="응급처치">
          {(props) => <EmergencyGuideStack {...props} webAppData={webAppData} refreshData={fetchWebAppData} loading={loading} />}
        </Tab.Screen>
        
        <Tab.Screen name="비상연락">
          {(props) => <EmergencyContactsScreen {...props} webAppData={webAppData} refreshData={fetchWebAppData} loading={loading} />}
        </Tab.Screen>
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}