import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider } from './contexts/AppContext';

// 화면 컴포넌트 임포트
import HomeScreen from './pages/HomeScreen'; 
import HeartDiagnosisScreen from './pages/HeartDiagnosisScreen';
import EmergencyGuideScreen from './pages/EmergencyGuideScreen';
import EmergencyContactsScreen from './pages/EmergencyContactsScreen';
import EmergencyGuideDetailScreen from './pages/EmergencyGuideDetailScreen';
import AiConsultationScreen from './pages/AiConsultationScreen';

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
    <AppProvider>
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
              } else if (route.name === '심박감지알람') {
                iconName = focused ? 'call' : 'call-outline';
              }
              
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#FF0000', // 통일된 빨간색 색상 테마
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
          
          <Tab.Screen name="심박감지알람">
            {(props) => <EmergencyContactsScreen {...props} webAppData={webAppData} refreshData={fetchWebAppData} loading={loading} />}
          </Tab.Screen>
        </Tab.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </AppProvider>
  );
}